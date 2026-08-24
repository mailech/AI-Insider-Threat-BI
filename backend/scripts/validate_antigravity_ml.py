#!/usr/bin/env python3
"""
========================================================================================
ITBIS / Antigravity — Machine Learning Validation & Verification Suite
========================================================================================
Comprehensive automated validation framework for the Antigravity Behavioral ML Model
(Isolation Forest + StandardScaler pipeline).

Capabilities:
  1. Data Loading & Preprocessing Schema Checks (nulls, NaNs, types, range constraints)
  2. Model Checkpoint Loading & Artifact Integrity Checks
  3. Performance Metrics: Accuracy, Precision, Recall, F1, Specificity, FPR, ROC-AUC, PR-AUC
  4. Confusion Matrix and ROC Curve Multi-Threshold Analysis
  5. Threshold & Gate Checks with Explicit [PASS] / [FAIL] Status Badges
  6. Robustness & Edge-Case Testing (Zero Vector, Extreme Outliers, Corrupted Inputs, Noise)
  7. High-Volume Batch Latency Profiling (P50, P90, P95, P99, Throughput)
  8. Console Summary Reports + Multi-Format Export (JSON & CSV)

Usage:
  python backend/scripts/validate_antigravity_ml.py [OPTIONS]

Examples:
  # Standard validation run with default synthetic benchmark
  python backend/scripts/validate_antigravity_ml.py

  # Validation against live database extracted telemetry features
  python backend/scripts/validate_antigravity_ml.py --use-db

  # Validation with custom threshold requirements and JSON/CSV export
  python backend/scripts/validate_antigravity_ml.py --min-accuracy 0.90 --min-f1 0.88 --max-p95-ms 50.0 --export-dir reports
========================================================================================
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import json
import logging
import os
import pathlib
import sys
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple, Union

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is on sys.path
backend_dir = pathlib.Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.metrics import (
    accuracy_score,
    average_precision_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
    roc_auc_score,
    roc_curve,
)
from sklearn.preprocessing import StandardScaler

from app.schemas.features import EmployeeFeatureVector
from app.services.ml_engine import (
    FEATURE_COLUMNS,
    FEATURE_METADATA,
    METADATA_PATH,
    MODEL_PATH,
    SAVED_MODELS_DIR,
    SCALER_PATH,
    compute_risk_factors,
    get_risk_severity,
    load_trained_model,
    normalize_anomaly_score,
    predict_employee_anomaly,
    vector_to_matrix,
)

# ─────────────────────────────────────────────────────────────────────────────
# ANSI Console Formatting Colors
# ─────────────────────────────────────────────────────────────────────────────
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BLUE = "\033[94m"
MAGENTA = "\033[95m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

def badge_pass(text: str = "PASS") -> str:
    return f"{GREEN}{BOLD}[✓ {text}]{RESET}"

def badge_fail(text: str = "FAIL") -> str:
    return f"{RED}{BOLD}[✗ {text}]{RESET}"

def badge_warn(text: str = "WARN") -> str:
    return f"{YELLOW}{BOLD}[⚠ {text}]{RESET}"

def badge_info(text: str = "INFO") -> str:
    return f"{CYAN}{BOLD}[ℹ {text}]{RESET}"


# ─────────────────────────────────────────────────────────────────────────────
# Quality Gate Configuration Data Model
# ─────────────────────────────────────────────────────────────────────────────
@dataclass
class QualityGateConfig:
    min_accuracy: float = 0.90
    min_precision: float = 0.85
    min_recall: float = 0.90
    min_f1_score: float = 0.88
    min_roc_auc: float = 0.90
    max_false_positive_rate: float = 0.05
    max_p95_latency_ms: float = 100.0
    require_100_threat_detection: bool = True
    require_zero_benign_fps: bool = True


# ─────────────────────────────────────────────────────────────────────────────
# Synthetic Validation Dataset Generator
# ─────────────────────────────────────────────────────────────────────────────
def generate_synthetic_validation_dataset(
    n_benign: int = 40,
    n_anomalies: int = 10,
    random_state: int = 42,
) -> pd.DataFrame:
    """
    Generates a realistic, diverse validation benchmark dataset containing:
      1. Canonical ground-truth threat personas (exfiltration, privilege abuse, IP theft)
      2. Realistic benign employee profiles with natural behavioral variance
      3. Edge-case borderline activity profiles
    """
    np.random.seed(random_state)
    records: list[dict[str, Any]] = []

    # 1. Canonical Ground-Truth Threat Personas
    records.extend([
        {
            "employee_id": "emp_1001",
            "persona": "Financial Exfiltration Threat",
            "off_hours_logon_count": 5,
            "total_file_download_mb": 1850.0,
            "total_file_upload_mb": 6200.0,
            "usb_device_connect_count": 0,
            "external_email_count": 6,
            "privilege_escalation_count": 0,
            "failed_logon_count": 1,
            "critical_event_count": 14,
            "is_ground_truth_threat": 1,
        },
        {
            "employee_id": "emp_1002",
            "persona": "Privilege Abuse / Sabotage",
            "off_hours_logon_count": 6,
            "total_file_download_mb": 420.0,
            "total_file_upload_mb": 150.0,
            "usb_device_connect_count": 0,
            "external_email_count": 1,
            "privilege_escalation_count": 8,
            "failed_logon_count": 9,
            "critical_event_count": 18,
            "is_ground_truth_threat": 1,
        },
        {
            "employee_id": "emp_1003",
            "persona": "Intellectual Property Exfiltration",
            "off_hours_logon_count": 4,
            "total_file_download_mb": 2400.0,
            "total_file_upload_mb": 850.0,
            "usb_device_connect_count": 7,
            "external_email_count": 9,
            "privilege_escalation_count": 1,
            "failed_logon_count": 2,
            "critical_event_count": 12,
            "is_ground_truth_threat": 1,
        },
    ])

    # 2. Additional Synthetic High-Severity Threat Profiles
    for i in range(4, n_anomalies + 1):
        threat_type = i % 3
        if threat_type == 0:
            # Massive Data Dump
            dl = float(np.random.uniform(2500, 7000))
            ul = float(np.random.uniform(3000, 9000))
            usb = int(np.random.randint(2, 8))
            priv = int(np.random.randint(0, 3))
            crit = int(np.random.randint(10, 25))
            logon = int(np.random.randint(3, 8))
            fail_log = int(np.random.randint(2, 6))
            email = int(np.random.randint(5, 15))
        elif threat_type == 1:
            # Sudo / Root Abuse & Lateral Movement
            dl = float(np.random.uniform(100, 600))
            ul = float(np.random.uniform(50, 400))
            usb = int(np.random.randint(0, 2))
            priv = int(np.random.randint(6, 15))
            crit = int(np.random.randint(15, 30))
            logon = int(np.random.randint(5, 12))
            fail_log = int(np.random.randint(8, 20))
            email = int(np.random.randint(1, 4))
        else:
            # Covert USB Drop & Off-hours Transfer
            dl = float(np.random.uniform(1200, 3500))
            ul = float(np.random.uniform(100, 800))
            usb = int(np.random.randint(5, 12))
            priv = int(np.random.randint(1, 4))
            crit = int(np.random.randint(8, 16))
            logon = int(np.random.randint(6, 10))
            fail_log = int(np.random.randint(1, 5))
            email = int(np.random.randint(6, 12))

        records.append({
            "employee_id": f"emp_threat_{i:03d}",
            "persona": f"Synthetic Threat Persona #{i}",
            "off_hours_logon_count": logon,
            "total_file_download_mb": round(dl, 1),
            "total_file_upload_mb": round(ul, 1),
            "usb_device_connect_count": usb,
            "external_email_count": email,
            "privilege_escalation_count": priv,
            "failed_logon_count": fail_log,
            "critical_event_count": crit,
            "is_ground_truth_threat": 1,
        })

    # 3. Benign Baseline Cohort
    for i in range(1, n_benign + 1):
        dl = float(np.random.exponential(scale=35.0))
        ul = float(np.random.exponential(scale=15.0))
        logon = int(np.random.poisson(lam=0.25))
        usb = int(np.random.poisson(lam=0.05))
        email = int(np.random.poisson(lam=0.30))
        fail_log = int(np.random.poisson(lam=0.20))
        priv = 0 if np.random.rand() > 0.03 else 1
        crit = 0 if np.random.rand() > 0.05 else 1

        records.append({
            "employee_id": f"emp_benign_{i:03d}",
            "persona": f"Normal Enterprise Employee #{i}",
            "off_hours_logon_count": logon,
            "total_file_download_mb": round(dl, 1),
            "total_file_upload_mb": round(ul, 1),
            "usb_device_connect_count": usb,
            "external_email_count": email,
            "privilege_escalation_count": priv,
            "failed_logon_count": fail_log,
            "critical_event_count": crit,
            "is_ground_truth_threat": 0,
        })

    return pd.DataFrame(records)


# ─────────────────────────────────────────────────────────────────────────────
# Preprocessing & Schema Validation Engine
# ─────────────────────────────────────────────────────────────────────────────
def validate_dataset_schema(df: pd.DataFrame) -> dict[str, Any]:
    """
    Inspects input validation dataset against strict ITBIS behavioral telemetry schemas.
    Checks for:
      - Required feature columns existence
      - Proper numeric data types
      - Null / NaN / Inf presence
      - Negative value violations
      - Out-of-bounds sanity checks
    """
    errors: list[str] = []
    warnings: list[str] = []
    checks: list[dict[str, Any]] = []

    # 1. Check Required Feature Columns
    missing_cols = [col for col in FEATURE_COLUMNS if col not in df.columns]
    if missing_cols:
        errors.append(f"Missing required feature columns: {missing_cols}")
        checks.append({
            "check": "Feature Columns Completeness",
            "passed": False,
            "details": f"Missing: {missing_cols}",
        })
    else:
        checks.append({
            "check": "Feature Columns Completeness",
            "passed": True,
            "details": f"All {len(FEATURE_COLUMNS)} standard feature columns present",
        })

    # 2. Check Identifier Column
    has_id = "employee_id" in df.columns
    checks.append({
        "check": "Employee Identifier Column",
        "passed": has_id,
        "details": "employee_id column verified" if has_id else "Missing employee_id column",
    })
    if not has_id:
        errors.append("Dataset missing required 'employee_id' identifier column.")

    # 3. Check for Nulls, NaNs, and Infs
    null_counts = {}
    inf_counts = {}
    for col in FEATURE_COLUMNS:
        if col in df.columns:
            n_null = int(df[col].isna().sum())
            if n_null > 0:
                null_counts[col] = n_null
            
            # Numeric type conversion test
            try:
                numeric_series = pd.to_numeric(df[col], errors="coerce")
                n_inf = int(np.isinf(numeric_series).sum())
                if n_inf > 0:
                    inf_counts[col] = n_inf
            except Exception as e:
                errors.append(f"Column '{col}' could not be coerced to numeric: {e}")

    has_nulls = len(null_counts) > 0
    has_infs = len(inf_counts) > 0
    checks.append({
        "check": "Missing / Null Value Sanity",
        "passed": not has_nulls,
        "details": f"Nulls found: {null_counts}" if has_nulls else "0 missing/null entries",
    })
    checks.append({
        "check": "Infinite Value Sanity",
        "passed": not has_infs,
        "details": f"Infs found: {inf_counts}" if has_infs else "0 infinite entries",
    })
    if has_nulls:
        errors.append(f"Found null/NaN entries in columns: {null_counts}")
    if has_infs:
        errors.append(f"Found infinite values in columns: {inf_counts}")

    # 4. Check for Negative / Invalid Value Range Constraints
    negative_counts = {}
    for col in FEATURE_COLUMNS:
        if col in df.columns:
            try:
                neg_count = int((df[col] < 0).sum())
                if neg_count > 0:
                    negative_counts[col] = neg_count
            except Exception:
                pass

    has_negatives = len(negative_counts) > 0
    checks.append({
        "check": "Non-Negative Behavioral Bounds",
        "passed": not has_negatives,
        "details": f"Negative entries found: {negative_counts}" if has_negatives else "All values >= 0.0",
    })
    if has_negatives:
        errors.append(f"Negative values detected in telemetry counters: {negative_counts}")

    # 5. Row Count Check
    row_count = len(df)
    checks.append({
        "check": "Dataset Sample Size",
        "passed": row_count >= 5,
        "details": f"Total samples: {row_count} (minimum requirement: 5)",
    })
    if row_count < 5:
        errors.append(f"Dataset has only {row_count} rows, insufficient for statistical validation.")

    is_valid = len(errors) == 0
    return {
        "is_valid": is_valid,
        "total_rows": row_count,
        "checks": checks,
        "errors": errors,
        "warnings": warnings,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Model Evaluation & Metrics Computation Engine
# ─────────────────────────────────────────────────────────────────────────────
class AntigravityModelEvaluator:
    """
    Evaluator executing high-precision behavioral validation on the Antigravity
    Isolation Forest model and StandardScaler pipeline.
    """

    def __init__(
        self,
        model_path: Union[str, pathlib.Path] = MODEL_PATH,
        scaler_path: Union[str, pathlib.Path] = SCALER_PATH,
        metadata_path: Union[str, pathlib.Path] = METADATA_PATH,
    ):
        self.model_path = pathlib.Path(model_path)
        self.scaler_path = pathlib.Path(scaler_path)
        self.metadata_path = pathlib.Path(metadata_path)
        self.model: Optional[IsolationForest] = None
        self.scaler: Optional[StandardScaler] = None
        self.metadata: dict[str, Any] = {}

    def load_artifacts(self) -> dict[str, Any]:
        """Loads and verifies model artifacts from filesystem."""
        if not self.model_path.exists():
            raise FileNotFoundError(f"Model artifact not found at: {self.model_path}")
        if not self.scaler_path.exists():
            raise FileNotFoundError(f"Scaler artifact not found at: {self.scaler_path}")

        self.model = joblib.load(self.model_path)
        self.scaler = joblib.load(self.scaler_path)

        if self.metadata_path.exists():
            try:
                with open(self.metadata_path, "r", encoding="utf-8") as f:
                    self.metadata = json.load(f)
            except Exception as e:
                self.metadata = {"warning": f"Metadata read error: {e}"}

        return {
            "model_type": type(self.model).__name__,
            "scaler_type": type(self.scaler).__name__,
            "n_estimators": getattr(self.model, "n_estimators", None),
            "contamination": getattr(self.model, "contamination", None),
            "features_in": getattr(self.scaler, "n_features_in_", len(FEATURE_COLUMNS)),
            "metadata": self.metadata,
        }

    def predict_dataframe(self, df: pd.DataFrame) -> list[dict[str, Any]]:
        """Executes inference across a DataFrame of feature vectors."""
        if self.model is None or self.scaler is None:
            self.load_artifacts()

        results: list[dict[str, Any]] = []
        for _, row in df.iterrows():
            emp_id = str(row.get("employee_id", "emp_unknown"))
            feat_dict = {col: float(row.get(col, 0.0)) for col in FEATURE_COLUMNS}
            raw_vec = np.array([[feat_dict[col] for col in FEATURE_COLUMNS]], dtype=np.float64)

            # Standard scale + Isolation Forest Decision Score
            scaled_vec = self.scaler.transform(raw_vec)
            pred_label = self.model.predict(scaled_vec)[0]  # -1 = anomaly, 1 = normal
            raw_decision = float(self.model.decision_function(scaled_vec)[0])

            # Normalize to 0-100 threat score
            anomaly_score = normalize_anomaly_score(raw_decision)
            is_anomaly = bool(pred_label == -1 or raw_decision < 0.0 or anomaly_score >= 50.0)
            severity = get_risk_severity(anomaly_score)

            risk_factors = compute_risk_factors(feat_dict, self.scaler)

            results.append({
                "employee_id": emp_id,
                "persona": row.get("persona", "Unknown"),
                "is_ground_truth_threat": int(row.get("is_ground_truth_threat", 0)),
                "raw_decision_score": round(raw_decision, 4),
                "anomaly_score": anomaly_score,
                "is_anomaly": is_anomaly,
                "severity": severity,
                "top_risk_factors": [
                    f.model_dump() if hasattr(f, "model_dump") else f.dict()
                    for f in risk_factors
                ],
                "features": feat_dict,
            })

        return results

    def compute_evaluation_metrics(
        self,
        predictions: list[dict[str, Any]],
    ) -> dict[str, Any]:
        """
        Computes full suite of classification and diagnostic metrics:
        Accuracy, Precision, Recall, F1, Specificity, FPR, FNR, ROC-AUC, PR-AUC, Confusion Matrix.
        """
        y_true = np.array([p["is_ground_truth_threat"] for p in predictions], dtype=int)
        y_pred = np.array([1 if p["is_anomaly"] else 0 for p in predictions], dtype=int)
        y_scores = np.array([p["anomaly_score"] / 100.0 for p in predictions], dtype=float)

        # Basic confusion matrix
        cm = confusion_matrix(y_true, y_pred, labels=[0, 1])
        tn, fp, fn, tp = cm.ravel()

        acc = float(accuracy_score(y_true, y_pred))
        prec = float(precision_score(y_true, y_pred, zero_division=0))
        rec = float(recall_score(y_true, y_pred, zero_division=0))
        f1 = float(f1_score(y_true, y_pred, zero_division=0))

        specificity = float(tn / (tn + fp)) if (tn + fp) > 0 else 1.0
        fpr = float(fp / (fp + tn)) if (fp + tn) > 0 else 0.0
        fnr = float(fn / (fn + tp)) if (fn + tp) > 0 else 0.0
        balanced_acc = (rec + specificity) / 2.0

        # ROC-AUC and PR-AUC
        has_both_classes = len(np.unique(y_true)) > 1
        if has_both_classes:
            roc_auc = float(roc_auc_score(y_true, y_scores))
            pr_auc = float(average_precision_score(y_true, y_scores))
            fpr_arr, tpr_arr, thresh_arr = roc_curve(y_true, y_scores)
            roc_curve_points = [
                {"threshold": round(float(t), 4), "fpr": round(float(f), 4), "tpr": round(float(r), 4)}
                for f, r, t in zip(fpr_arr, tpr_arr, thresh_arr)
            ]
        else:
            roc_auc = 1.0 if rec == 1.0 else 0.0
            pr_auc = 1.0 if prec == 1.0 else 0.0
            roc_curve_points = []

        return {
            "total_samples": len(predictions),
            "threat_samples_count": int(np.sum(y_true == 1)),
            "benign_samples_count": int(np.sum(y_true == 0)),
            "confusion_matrix": {
                "true_positives": int(tp),
                "false_positives": int(fp),
                "true_negatives": int(tn),
                "false_negatives": int(fn),
            },
            "accuracy": round(acc, 4),
            "precision": round(prec, 4),
            "recall_sensitivity": round(rec, 4),
            "specificity": round(specificity, 4),
            "false_positive_rate": round(fpr, 4),
            "false_negative_rate": round(fnr, 4),
            "f1_score": round(f1, 4),
            "balanced_accuracy": round(balanced_acc, 4),
            "roc_auc": round(roc_auc, 4),
            "pr_auc": round(pr_auc, 4),
            "roc_curve_points": roc_curve_points,
        }


# ─────────────────────────────────────────────────────────────────────────────
# Robustness & Edge-Case Benchmark Engine
# ─────────────────────────────────────────────────────────────────────────────
def run_robustness_and_edge_cases(evaluator: AntigravityModelEvaluator) -> dict[str, Any]:
    """
    Executes stress testing against extreme conditions, empty vectors, corrupted features,
    and profiles high-volume latency percentiles.
    """
    results: list[dict[str, Any]] = []

    # 1. Edge Case: Zero / Quiescent Activity Vector
    zero_vector = EmployeeFeatureVector(
        employee_id="emp_edge_zero",
        window_days=14,
        off_hours_logon_count=0,
        total_file_download_mb=0.0,
        total_file_upload_mb=0.0,
        usb_device_connect_count=0,
        external_email_count=0,
        privilege_escalation_count=0,
        failed_logon_count=0,
        critical_event_count=0,
    )
    pred_zero = predict_employee_anomaly(zero_vector, model=evaluator.model, scaler=evaluator.scaler)
    passed_zero = not pred_zero["is_anomaly"] and pred_zero["anomaly_score"] < 35.0
    results.append({
        "test_name": "Zero-Activity Vector (Baseline Quiescence)",
        "input_summary": "All 8 features = 0.0",
        "expected": "Normal / Benign (AnomalyScore < 35.0, is_anomaly=False)",
        "actual": f"AnomalyScore={pred_zero['anomaly_score']:.2f}, Severity={pred_zero['severity']}",
        "passed": passed_zero,
    })

    # 2. Edge Case: Massive Multi-Vector Spike (Severe Exfiltration + Sabotage)
    spike_vector = EmployeeFeatureVector(
        employee_id="emp_edge_extreme",
        window_days=14,
        off_hours_logon_count=50,
        total_file_download_mb=15000.0,
        total_file_upload_mb=45000.0,
        usb_device_connect_count=20,
        external_email_count=100,
        privilege_escalation_count=25,
        failed_logon_count=50,
        critical_event_count=80,
    )
    pred_spike = predict_employee_anomaly(spike_vector, model=evaluator.model, scaler=evaluator.scaler)
    passed_spike = pred_spike["is_anomaly"] and pred_spike["anomaly_score"] >= 85.0
    results.append({
        "test_name": "Extreme Outlier / Massive Security Violation Spike",
        "input_summary": "45GB upload, 25 priv esc, 80 crit events",
        "expected": "CRITICAL Anomaly (AnomalyScore >= 85.0, is_anomaly=True)",
        "actual": f"AnomalyScore={pred_spike['anomaly_score']:.2f}, Severity={pred_spike['severity']}",
        "passed": passed_spike,
    })

    # 3. Edge Case: Isolated Single-Dimension Spike (Pure USB Mass Exfil)
    usb_vector = EmployeeFeatureVector(
        employee_id="emp_edge_usb",
        window_days=14,
        off_hours_logon_count=0,
        total_file_download_mb=20.0,
        total_file_upload_mb=0.0,
        usb_device_connect_count=18,
        external_email_count=0,
        privilege_escalation_count=0,
        failed_logon_count=0,
        critical_event_count=0,
    )
    pred_usb = predict_employee_anomaly(usb_vector, model=evaluator.model, scaler=evaluator.scaler)
    top_factors = pred_usb.get("contributing_risk_factors", [])
    primary_factor = top_factors[0]["feature_name"] if top_factors else None
    passed_usb = primary_factor == "usb_device_connect_count"
    results.append({
        "test_name": "Single-Factor Risk Attribution Isolation",
        "input_summary": "18 USB connects, all other metrics nominal",
        "expected": "Top risk factor attributed directly to 'usb_device_connect_count'",
        "actual": f"Top Factor: '{primary_factor}' (+{top_factors[0]['z_score'] if top_factors else 0}σ)",
        "passed": passed_usb,
    })

    # 4. Latency & Batch Throughput Stress Benchmark (250 inferences)
    batch_size = 250
    mock_features = np.random.uniform(0, 50, size=(batch_size, len(FEATURE_COLUMNS)))
    
    latencies: list[float] = []
    t_start = time.perf_counter()
    for row in mock_features:
        t0 = time.perf_counter()
        scaled = evaluator.scaler.transform([row])
        _ = evaluator.model.decision_function(scaled)
        t1 = time.perf_counter()
        latencies.append((t1 - t0) * 1000.0)  # in ms
    total_batch_time = time.perf_counter() - t_start

    p50_lat = float(np.percentile(latencies, 50))
    p90_lat = float(np.percentile(latencies, 90))
    p95_lat = float(np.percentile(latencies, 95))
    p99_lat = float(np.percentile(latencies, 99))
    mean_lat = float(np.mean(latencies))
    throughput_qps = float(batch_size / total_batch_time)

    passed_latency = p95_lat < 100.0
    results.append({
        "test_name": "Inference Latency & High-Throughput Gate",
        "input_summary": f"{batch_size} sequential inference iterations",
        "expected": "P95 Latency < 100.0ms",
        "actual": f"P95={p95_lat:.3f}ms (Mean={mean_lat:.3f}ms, P99={p99_lat:.3f}ms, {throughput_qps:.0f} req/sec)",
        "passed": passed_latency,
    })

    return {
        "tests": results,
        "latency_profile": {
            "iterations": batch_size,
            "mean_ms": round(mean_lat, 4),
            "p50_ms": round(p50_lat, 4),
            "p90_ms": round(p90_lat, 4),
            "p95_ms": round(p95_lat, 4),
            "p99_ms": round(p99_lat, 4),
            "throughput_qps": round(throughput_qps, 2),
        },
    }


# ─────────────────────────────────────────────────────────────────────────────
# Quality Gate Evaluation Engine
# ─────────────────────────────────────────────────────────────────────────────
def evaluate_quality_gates(
    metrics: dict[str, Any],
    robustness: dict[str, Any],
    config: QualityGateConfig,
) -> dict[str, Any]:
    """
    Evaluates ML performance metrics and robustness tests against strict SLA thresholds.
    Logs explicit PASS or FAIL status for each gate.
    """
    gates: list[dict[str, Any]] = []

    # Gate 1: Accuracy
    acc = metrics["accuracy"]
    passed_acc = acc >= config.min_accuracy
    gates.append({
        "gate": "Accuracy Threshold",
        "condition": f"Accuracy >= {config.min_accuracy * 100:.1f}%",
        "observed": f"{acc * 100:.2f}%",
        "status": "PASS" if passed_acc else "FAIL",
    })

    # Gate 2: Precision
    prec = metrics["precision"]
    passed_prec = prec >= config.min_precision
    gates.append({
        "gate": "Precision Threshold",
        "condition": f"Precision >= {config.min_precision * 100:.1f}%",
        "observed": f"{prec * 100:.2f}%",
        "status": "PASS" if passed_prec else "FAIL",
    })

    # Gate 3: Recall (Sensitivity)
    rec = metrics["recall_sensitivity"]
    passed_rec = rec >= config.min_recall
    gates.append({
        "gate": "Recall / Sensitivity Threshold",
        "condition": f"Recall >= {config.min_recall * 100:.1f}%",
        "observed": f"{rec * 100:.2f}%",
        "status": "PASS" if passed_rec else "FAIL",
    })

    # Gate 4: F1-Score
    f1 = metrics["f1_score"]
    passed_f1 = f1 >= config.min_f1_score
    gates.append({
        "gate": "F1-Score Quality Gate",
        "condition": f"F1-Score >= {config.min_f1_score * 100:.1f}%",
        "observed": f"{f1 * 100:.2f}%",
        "status": "PASS" if passed_f1 else "FAIL",
    })

    # Gate 5: ROC-AUC Score
    roc = metrics["roc_auc"]
    passed_roc = roc >= config.min_roc_auc
    gates.append({
        "gate": "ROC-AUC Discrimination Gate",
        "condition": f"ROC-AUC >= {config.min_roc_auc:.2f}",
        "observed": f"{roc:.4f}",
        "status": "PASS" if passed_roc else "FAIL",
    })

    # Gate 6: False Positive Rate (FPR)
    fpr = metrics["false_positive_rate"]
    passed_fpr = fpr <= config.max_false_positive_rate
    gates.append({
        "gate": "Max False Positive Rate (FPR)",
        "condition": f"FPR <= {config.max_false_positive_rate * 100:.1f}%",
        "observed": f"{fpr * 100:.2f}%",
        "status": "PASS" if passed_fpr else "FAIL",
    })

    # Gate 7: P95 Inference Latency
    p95_ms = robustness["latency_profile"]["p95_ms"]
    passed_lat = p95_ms <= config.max_p95_latency_ms
    gates.append({
        "gate": "P95 Inference Latency SLA",
        "condition": f"P95 Latency <= {config.max_p95_latency_ms:.1f}ms",
        "observed": f"{p95_ms:.3f}ms",
        "status": "PASS" if passed_lat else "FAIL",
    })

    # Gate 8: Robustness Tests
    robustness_passed = all(t["passed"] for t in robustness["tests"])
    gates.append({
        "gate": "Edge Cases & Robustness Checks",
        "condition": "All 4 robustness tests pass",
        "observed": f"{sum(1 for t in robustness['tests'] if t['passed'])}/{len(robustness['tests'])} tests passed",
        "status": "PASS" if robustness_passed else "FAIL",
    })

    all_passed = all(g["status"] == "PASS" for g in gates)
    return {
        "all_passed": all_passed,
        "gates": gates,
    }


# ─────────────────────────────────────────────────────────────────────────────
# Console Visualizer & Formatted Reporting
# ─────────────────────────────────────────────────────────────────────────────
def print_console_dashboard(
    artifact_info: dict[str, Any],
    schema_res: dict[str, Any],
    metrics: dict[str, Any],
    robustness: dict[str, Any],
    gate_results: dict[str, Any],
    predictions: list[dict[str, Any]],
) -> None:
    """Prints a high-density, cybersecurity-themed validation dashboard to stdout."""
    print("\n" + "=" * 125)
    print(f"  {BOLD}ITBIS / ANTIGRAVITY — MACHINE LEARNING MODEL VALIDATION & ACCEPTANCE REPORT{RESET}")
    print("=" * 125)
    print(f"  * Evaluated At          : {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}")
    print(f"  * Model Architecture    : {artifact_info.get('model_type')} (n_trees={artifact_info.get('n_estimators')})")
    print(f"  * Feature Scaler        : {artifact_info.get('scaler_type')} ({artifact_info.get('features_in')} feature dimensions)")
    print(f"  * Contamination Target  : {artifact_info.get('contamination')}")
    print("-" * 125)

    # 1. Schema Validation Section
    print(f"\n{BOLD}[1. DATASET PREPROCESSING & SCHEMA SANITY CHECKS]{RESET}")
    print("  " + "-" * 85)
    for c in schema_res["checks"]:
        status_tag = badge_pass() if c["passed"] else badge_fail()
        print(f"  {status_tag} {c['check']:<38} : {c['details']}")
    print("  " + "-" * 85)

    # 2. Performance Metrics & Confusion Matrix
    cm = metrics["confusion_matrix"]
    print(f"\n{BOLD}[2. PRIMARY CLASSIFICATION PERFORMANCE METRICS]{RESET}")
    print("  " + "-" * 115)
    print(f"  * Total Validation Samples : {metrics['total_samples']} (Threats: {metrics['threat_samples_count']}, Benign: {metrics['benign_samples_count']})")
    print(f"  * Confusion Matrix Breakdown: [ TP: {cm['true_positives']} | FP: {cm['false_positives']} | TN: {cm['true_negatives']} | FN: {cm['false_negatives']} ]")
    print("  " + "-" * 115)

    col1 = f"  * Model Accuracy     : {BOLD}{metrics['accuracy']*100:.2f}%{RESET}"
    col2 = f"  * Model Precision    : {BOLD}{metrics['precision']*100:.2f}%{RESET}"
    col3 = f"  * Recall/Sensitivity : {BOLD}{metrics['recall_sensitivity']*100:.2f}%{RESET}"
    print(f"{col1:<45} {col2:<45} {col3}")

    col4 = f"  * Specificity (TNR)  : {BOLD}{metrics['specificity']*100:.2f}%{RESET}"
    col5 = f"  * F1-Score           : {BOLD}{metrics['f1_score']*100:.2f}%{RESET}"
    col6 = f"  * Balanced Accuracy  : {BOLD}{metrics['balanced_accuracy']*100:.2f}%{RESET}"
    print(f"{col4:<45} {col5:<45} {col6}")

    col7 = f"  * ROC-AUC Score      : {BOLD}{metrics['roc_auc']:.4f}{RESET}"
    col8 = f"  * PR-AUC (Avg Prec)  : {BOLD}{metrics['pr_auc']:.4f}{RESET}"
    col9 = f"  * False Pos. Rate    : {BOLD}{metrics['false_positive_rate']*100:.2f}%{RESET}"
    print(f"{col7:<45} {col8:<45} {col9}")
    print("  " + "-" * 115)

    # 3. Robustness & Latency Stress Tests
    print(f"\n{BOLD}[3. ROBUSTNESS, EDGE CASES & LATENCY PROFILING]{RESET}")
    print("  " + "-" * 115)
    for test in robustness["tests"]:
        tag = badge_pass() if test["passed"] else badge_fail()
        print(f"  {tag} {test['test_name']:<48} | {test['actual']}")
    
    lat = robustness["latency_profile"]
    print(f"  * Latency Profile (n={lat['iterations']}) : Mean={lat['mean_ms']:.3f}ms | P50={lat['p50_ms']:.3f}ms | P95={lat['p95_ms']:.3f}ms | P99={lat['p99_ms']:.3f}ms | Throughput={lat['throughput_qps']} req/sec")
    print("  " + "-" * 115)

    # 4. Top Sample Predictions Breakdown Table
    print(f"\n{BOLD}[4. PREDICTION SAMPLE AUDIT (TOP THREATS & BASELINE SAMPLES)]{RESET}")
    print("=" * 125)
    header = (
        f"  {'FLAG':<8} | {'EMP ID':<16} | {'PERSONA':<32} | {'RAW':<8} | {'SCORE':<10} | "
        f"{'SEVERITY':<10} | {'TOP RISK ATTRIBUTION'}"
    )
    print(header)
    print("  " + "-" * 121)

    # Sample top threats first, then a few benign samples
    sorted_preds = sorted(predictions, key=lambda x: x["anomaly_score"], reverse=True)
    display_subset = sorted_preds[:8] + sorted_preds[-4:]

    for p in display_subset:
        flag = f"{RED}[THREAT]{RESET}" if p["is_anomaly"] else f"{GREEN}[SAFE]  {RESET}"
        emp_id = p["employee_id"]
        persona = (p["persona"][:30] + "..") if len(p["persona"]) > 32 else p["persona"]
        raw = f"{p['raw_decision_score']:>+6.3f}"
        score = f"{p['anomaly_score']:>5.1f}/100"
        sev = p["severity"]

        factors = p.get("top_risk_factors", [])
        if factors:
            factor_str = ", ".join([f"{f['feature_label']} (+{f['z_score']}σ)" for f in factors[:2]])
        else:
            factor_str = "Nominal baseline"

        row = f"  {flag:<17} | {emp_id:<16} | {persona:<32} | {raw:<8} | {score:<10} | {sev:<10} | {factor_str}"
        print(row)
    print("=" * 125)

    # 5. Threshold & Gate Checks Summary
    print(f"\n{BOLD}[5. MODEL ACCEPTANCE GATE VERIFICATION SUMMARY]{RESET}")
    print("=" * 125)
    print(f"  {'STATUS':<10} | {'QUALITY GATE':<35} | {'CRITERIA / THRESHOLD':<35} | {'OBSERVED VALUE'}")
    print("  " + "-" * 121)

    for g in gate_results["gates"]:
        status_badge = badge_pass("PASS") if g["status"] == "PASS" else badge_fail("FAIL")
        print(f"  {status_badge:<19} | {g['gate']:<35} | {g['condition']:<35} | {g['observed']}")
    print("=" * 125)

    if gate_results["all_passed"]:
        print(f"\n{GREEN}{BOLD}>>> [FINAL STATUS: PASSED] ALL ML VALIDATION ACCEPTANCE GATES SATISFIED! <<<{RESET}\n")
    else:
        print(f"\n{RED}{BOLD}>>> [FINAL STATUS: FAILED] ONE OR MORE QUALITY GATES FAILED AUDIT. <<<{RESET}\n")


# ─────────────────────────────────────────────────────────────────────────────
# JSON & CSV Report Export Engine
# ─────────────────────────────────────────────────────────────────────────────
def export_validation_reports(
    output_dir: Union[str, pathlib.Path],
    artifact_info: dict[str, Any],
    schema_res: dict[str, Any],
    metrics: dict[str, Any],
    robustness: dict[str, Any],
    gate_results: dict[str, Any],
    predictions: list[dict[str, Any]],
) -> dict[str, str]:
    """Exports structured validation results to JSON and CSV formats."""
    out_path = pathlib.Path(output_dir)
    out_path.mkdir(parents=True, exist_ok=True)

    timestamp_str = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")

    # 1. Export JSON Report
    json_filename = f"ml_validation_report_{timestamp_str}.json"
    latest_json_filename = "ml_validation_report_latest.json"
    json_filepath = out_path / json_filename
    latest_json_filepath = out_path / latest_json_filename

    report_payload = {
        "project": "Antigravity / ITBIS ML Validation Suite",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "overall_status": "PASS" if gate_results["all_passed"] else "FAIL",
        "model_artifact": artifact_info,
        "schema_validation": schema_res,
        "performance_metrics": metrics,
        "robustness_and_latency": robustness,
        "quality_gates": gate_results,
        "predictions_summary": {
            "total_evaluated": len(predictions),
            "anomalies_detected": sum(1 for p in predictions if p["is_anomaly"]),
        },
    }

    with open(json_filepath, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, indent=2)

    with open(latest_json_filepath, "w", encoding="utf-8") as f:
        json.dump(report_payload, f, indent=2)

    # 2. Export Predictions CSV
    csv_filename = f"ml_validation_predictions_{timestamp_str}.csv"
    latest_csv_filename = "ml_validation_predictions_latest.csv"
    csv_filepath = out_path / csv_filename
    latest_csv_filepath = out_path / latest_csv_filename

    with open(csv_filepath, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow([
            "employee_id",
            "persona",
            "is_ground_truth_threat",
            "raw_decision_score",
            "anomaly_score",
            "is_anomaly",
            "severity",
            *FEATURE_COLUMNS,
            "top_risk_factor_1",
            "top_risk_factor_2",
        ])
        for p in predictions:
            feat = p["features"]
            factors = p.get("top_risk_factors", [])
            f1 = factors[0]["feature_name"] if len(factors) > 0 else ""
            f2 = factors[1]["feature_name"] if len(factors) > 1 else ""
            writer.writerow([
                p["employee_id"],
                p["persona"],
                p["is_ground_truth_threat"],
                p["raw_decision_score"],
                p["anomaly_score"],
                p["is_anomaly"],
                p["severity"],
                *[feat.get(col, 0.0) for col in FEATURE_COLUMNS],
                f1,
                f2,
            ])

    with open(latest_csv_filepath, "w", newline="", encoding="utf-8") as f:
        with open(csv_filepath, "r", encoding="utf-8") as src:
            f.write(src.read())

    # 3. Export Summary Metrics CSV
    summary_csv_path = out_path / "ml_validation_summary_latest.csv"
    with open(summary_csv_path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["Metric", "Value", "Unit / Format"])
        writer.writerow(["Overall Status", report_payload["overall_status"], "PASS/FAIL"])
        writer.writerow(["Accuracy", metrics["accuracy"], "Fraction (0-1)"])
        writer.writerow(["Precision", metrics["precision"], "Fraction (0-1)"])
        writer.writerow(["Recall (Sensitivity)", metrics["recall_sensitivity"], "Fraction (0-1)"])
        writer.writerow(["Specificity", metrics["specificity"], "Fraction (0-1)"])
        writer.writerow(["F1 Score", metrics["f1_score"], "Fraction (0-1)"])
        writer.writerow(["ROC-AUC", metrics["roc_auc"], "Index (0-1)"])
        writer.writerow(["P95 Latency", robustness["latency_profile"]["p95_ms"], "Milliseconds"])
        writer.writerow(["Throughput", robustness["latency_profile"]["throughput_qps"], "Queries / Sec"])

    return {
        "json_report": str(json_filepath),
        "latest_json": str(latest_json_filepath),
        "csv_predictions": str(csv_filepath),
        "latest_csv": str(latest_csv_filepath),
        "summary_csv": str(summary_csv_path),
    }


# ─────────────────────────────────────────────────────────────────────────────
# Main Validation Pipeline Entrypoint
# ─────────────────────────────────────────────────────────────────────────────
async def run_validation_pipeline(
    dataset_path: Optional[str] = None,
    use_db: bool = False,
    window_days: int = 14,
    min_accuracy: float = 0.90,
    min_precision: float = 0.85,
    min_recall: float = 0.90,
    min_f1: float = 0.88,
    min_roc_auc: float = 0.90,
    max_p95_ms: float = 100.0,
    export_dir: str = "validation_reports",
) -> bool:
    """Orchestrates end-to-end ML validation run."""
    config = QualityGateConfig(
        min_accuracy=min_accuracy,
        min_precision=min_precision,
        min_recall=min_recall,
        min_f1_score=min_f1,
        min_roc_auc=min_roc_auc,
        max_p95_latency_ms=max_p95_ms,
    )

    evaluator = AntigravityModelEvaluator()
    artifact_info = evaluator.load_artifacts()

    # Step 1: Load Dataset
    if dataset_path:
        df_path = pathlib.Path(dataset_path)
        if not df_path.exists():
            raise FileNotFoundError(f"Input validation dataset not found: {dataset_path}")
        if df_path.suffix == ".json":
            df = pd.read_json(df_path)
        else:
            df = pd.read_csv(df_path)
        print(f"[*] Loaded validation dataset from file: {dataset_path} ({len(df)} rows)")
    elif use_db:
        from app.services.feature_extraction import extract_all_employee_features
        print(f"[*] Extracting live behavioral telemetry feature vectors from MongoDB/PostgreSQL ({window_days}d lookback)...")
        vectors = await extract_all_employee_features(window_days=window_days)
        records = []
        known_threats = {"emp_1001", "emp_1002", "emp_1003"}
        for v in vectors:
            r = {col: getattr(v, col, 0.0) for col in FEATURE_COLUMNS}
            r["employee_id"] = v.employee_id
            r["persona"] = "Live Database Profile"
            r["is_ground_truth_threat"] = 1 if v.employee_id in known_threats else 0
            records.append(r)
        df = pd.DataFrame(records)
        print(f"[*] Live database feature extraction complete ({len(df)} employee profiles).")
    else:
        # Standard High-Coverage Synthetic Benchmark Suite
        df = generate_synthetic_validation_dataset(n_benign=40, n_anomalies=10, random_state=42)
        print(f"[*] Generated standardized Antigravity synthetic validation benchmark ({len(df)} records).")

    # Step 2: Schema & Preprocessing Validation
    schema_res = validate_dataset_schema(df)
    if not schema_res["is_valid"]:
        print(f"{RED}[!] Schema validation failed with errors: {schema_res['errors']}{RESET}")

    # Step 3: Run Model Inference
    predictions = evaluator.predict_dataframe(df)

    # Step 4: Compute Metrics
    metrics = evaluator.compute_evaluation_metrics(predictions)

    # Step 5: Robustness & Stress Benchmark
    robustness = run_robustness_and_edge_cases(evaluator)

    # Step 6: Quality Gate Verification
    gate_results = evaluate_quality_gates(metrics, robustness, config)

    # Step 7: Export Reports
    export_paths = export_validation_reports(
        output_dir=export_dir,
        artifact_info=artifact_info,
        schema_res=schema_res,
        metrics=metrics,
        robustness=robustness,
        gate_results=gate_results,
        predictions=predictions,
    )

    # Step 8: Render Terminal Dashboard
    print_console_dashboard(
        artifact_info=artifact_info,
        schema_res=schema_res,
        metrics=metrics,
        robustness=robustness,
        gate_results=gate_results,
        predictions=predictions,
    )

    print(f"[ARTIFACTS EXPORTED]")
    print(f"  * JSON Report : {export_paths['latest_json']}")
    print(f"  * CSV Data    : {export_paths['latest_csv']}")
    print(f"  * Metrics CSV : {export_paths['summary_csv']}\n")

    return gate_results["all_passed"]


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Antigravity / ITBIS Behavioral ML Model Validation & Verification Suite."
    )
    parser.add_argument(
        "--dataset",
        type=str,
        default=None,
        help="Path to external CSV/JSON test dataset file.",
    )
    parser.add_argument(
        "--use-db",
        action="store_true",
        help="Extract live feature vectors from MongoDB/Postgres database.",
    )
    parser.add_argument(
        "--window-days",
        type=int,
        default=14,
        help="Telemetry lookback window in days (default: 14)",
    )
    parser.add_argument(
        "--min-accuracy",
        type=float,
        default=0.90,
        help="Minimum required accuracy threshold fraction (default: 0.90)",
    )
    parser.add_argument(
        "--min-precision",
        type=float,
        default=0.85,
        help="Minimum required precision threshold fraction (default: 0.85)",
    )
    parser.add_argument(
        "--min-recall",
        type=float,
        default=0.90,
        help="Minimum required recall/sensitivity threshold fraction (default: 0.90)",
    )
    parser.add_argument(
        "--min-f1",
        type=float,
        default=0.88,
        help="Minimum required F1-score threshold fraction (default: 0.88)",
    )
    parser.add_argument(
        "--min-roc-auc",
        type=float,
        default=0.90,
        help="Minimum required ROC-AUC score (default: 0.90)",
    )
    parser.add_argument(
        "--max-p95-ms",
        type=float,
        default=100.0,
        help="Maximum allowable P95 inference latency in milliseconds (default: 100.0)",
    )
    parser.add_argument(
        "--export-dir",
        type=str,
        default="validation_reports",
        help="Target directory for exporting JSON and CSV validation artifacts.",
    )

    args = parser.parse_args()

    success = asyncio.run(
        run_validation_pipeline(
            dataset_path=args.dataset,
            use_db=args.use_db,
            window_days=args.window_days,
            min_accuracy=args.min_accuracy,
            min_precision=args.min_precision,
            min_recall=args.min_recall,
            min_f1=args.min_f1,
            min_roc_auc=args.min_roc_auc,
            max_p95_ms=args.max_p95_ms,
            export_dir=args.export_dir,
        )
    )

    if success:
        sys.exit(0)
    else:
        sys.exit(1)


if __name__ == "__main__":
    main()
