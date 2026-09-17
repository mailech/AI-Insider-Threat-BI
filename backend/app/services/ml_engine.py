"""
ITBIS — Machine Learning Anomaly Detection Engine (Milestone 2 - Step 3)
========================================================================
Implements enterprise-grade behavioral anomaly detection utilizing Scikit-Learn's
Isolation Forest algorithm with StandardScaler feature normalization, intuitive
0-100 anomaly score mapping, and behavioral risk factor attribution.
"""

from __future__ import annotations

import json
import logging
import os
import pathlib
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

import joblib
import numpy as np
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.schemas.features import (
    AnomalyPredictionResult,
    EmployeeFeatureVector,
    ModelTrainingSummary,
    RiskFactorItem,
)
from app.services.feature_extraction import extract_all_employee_features

logger = logging.getLogger(__name__)

# Feature column ordering used across training and inference
FEATURE_COLUMNS: list[str] = [
    "off_hours_logon_count",
    "total_file_download_mb",
    "total_file_upload_mb",
    "usb_device_connect_count",
    "external_email_count",
    "privilege_escalation_count",
    "failed_logon_count",
    "critical_event_count",
]

# Human-readable metadata and descriptions for risk factor attribution
FEATURE_METADATA: dict[str, dict[str, str]] = {
    "off_hours_logon_count": {
        "label": "Off-Hours & Weekend Logons",
        "unit": "events",
        "description": "Authentications outside standard business hours or on weekends",
    },
    "total_file_download_mb": {
        "label": "File Downloads & Retrieval",
        "unit": "MB",
        "description": "Volume of sensitive data accessed and downloaded locally",
    },
    "total_file_upload_mb": {
        "label": "File Uploads & Exfiltration",
        "unit": "MB",
        "description": "Volume of outbound data transfers to external destinations",
    },
    "usb_device_connect_count": {
        "label": "Removable USB Storage Connects",
        "unit": "events",
        "description": "Physical connection of external removable media devices",
    },
    "external_email_count": {
        "label": "External Email Activity",
        "unit": "emails",
        "description": "Communications and attachments dispatched to non-corporate domains",
    },
    "privilege_escalation_count": {
        "label": "Privilege Escalation Attempts",
        "unit": "attempts",
        "description": "Unauthorized administrative elevation or sudo/root abuse",
    },
    "failed_logon_count": {
        "label": "Failed Authentication Attempts",
        "unit": "attempts",
        "description": "Abnormal volume of credential failures or brute-force behavior",
    },
    "critical_event_count": {
        "label": "Critical Severity Security Events",
        "unit": "events",
        "description": "High-risk system violations flagged by behavioral sensors",
    },
}

# Artifact storage paths
SAVED_MODELS_DIR = pathlib.Path(__file__).resolve().parent.parent / "models" / "saved_models"
MODEL_PATH = SAVED_MODELS_DIR / "isolation_forest.joblib"
SCALER_PATH = SAVED_MODELS_DIR / "scaler.joblib"
METADATA_PATH = SAVED_MODELS_DIR / "model_metadata.json"


def _resolve_artifact(filename: str) -> pathlib.Path:
    """Resolve an artifact file from saved_models or the parent models directory."""
    p1 = SAVED_MODELS_DIR / filename
    if p1.exists():
        return p1
    p2 = SAVED_MODELS_DIR.parent / filename
    if p2.exists():
        return p2
    return p1

# In-memory cached artifacts
_CACHED_MODEL: Optional[IsolationForest] = None
_CACHED_SCALER: Optional[StandardScaler] = None
_CACHED_METADATA: Optional[dict[str, Any]] = None


def normalize_anomaly_score(raw_decision: float) -> float:
    """
    Transforms raw Isolation Forest decision score into an intuitive 0.0 - 100.0 range.
    - raw_decision < 0 (outlier/anomaly) maps to [50.0, 100.0]
    - raw_decision >= 0 (inlier/benign) maps to [0.0, 35.0]
    """
    if raw_decision < 0:
        ratio = min(1.0, abs(raw_decision) / 0.30)
        score = 50.0 + (ratio * 50.0)
    else:
        ratio = min(1.0, raw_decision / 0.12)
        score = 35.0 * (1.0 - ratio)
    return round(float(np.clip(score, 0.0, 100.0)), 2)


def get_risk_severity(anomaly_score: float) -> str:
    """Classify anomaly score into cybersecurity severity tiers."""
    if anomaly_score >= 85.0:
        return "CRITICAL"
    if anomaly_score >= 70.0:
        return "HIGH"
    if anomaly_score >= 40.0:
        return "MEDIUM"
    if anomaly_score >= 20.0:
        return "LOW"
    return "NORMAL"


def vector_to_matrix(vectors: list[EmployeeFeatureVector]) -> np.ndarray:
    """Converts a list of EmployeeFeatureVectors into a 2D numpy array."""
    rows = []
    for v in vectors:
        row = [float(getattr(v, col, 0.0)) for col in FEATURE_COLUMNS]
        rows.append(row)
    return np.array(rows, dtype=np.float64)


def load_trained_model(
    force_reload: bool = False,
) -> tuple[IsolationForest, StandardScaler, dict[str, Any]]:
    """
    Loads persisted Isolation Forest model and StandardScaler from disk.
    Caches instances in memory for rapid repeated inference.
    """
    global _CACHED_MODEL, _CACHED_SCALER, _CACHED_METADATA

    if not force_reload and _CACHED_MODEL is not None and _CACHED_SCALER is not None:
        return _CACHED_MODEL, _CACHED_SCALER, _CACHED_METADATA or {}

    resolved_model_path = _resolve_artifact("isolation_forest.joblib")
    resolved_scaler_path = _resolve_artifact("scaler.joblib")
    resolved_meta_path = _resolve_artifact("model_metadata.json")

    if not resolved_model_path.exists():
        raise FileNotFoundError(
            f"Trained model artifact not found at {resolved_model_path} or {MODEL_PATH}. Run training pipeline first."
        )
    if not resolved_scaler_path.exists():
        raise FileNotFoundError(
            f"Scaler artifact not found at {resolved_scaler_path} or {SCALER_PATH}. Run training pipeline first."
        )

    model: IsolationForest = joblib.load(resolved_model_path)
    scaler: StandardScaler = joblib.load(resolved_scaler_path)

    metadata: dict[str, Any] = {}
    if resolved_meta_path.exists():
        try:
            with open(resolved_meta_path, "r", encoding="utf-8") as f:
                metadata = json.load(f)
        except Exception as e:
            logger.warning("Could not read model metadata: %s", e)

    _CACHED_MODEL = model
    _CACHED_SCALER = scaler
    _CACHED_METADATA = metadata
    return model, scaler, metadata


def compute_risk_factors(
    feature_dict: dict[str, float],
    scaler: StandardScaler,
    max_factors: int = 4,
) -> list[RiskFactorItem]:
    """
    Identifies top behavioral risk factors contributing to an anomaly by analyzing
    feature-level deviations (Z-scores) from the baseline training cohort.
    """
    factors: list[RiskFactorItem] = []
    means = scaler.mean_ if hasattr(scaler, "mean_") and scaler.mean_ is not None else [0.0] * len(FEATURE_COLUMNS)
    scales = scaler.scale_ if hasattr(scaler, "scale_") and scaler.scale_ is not None else [1.0] * len(FEATURE_COLUMNS)

    for idx, col in enumerate(FEATURE_COLUMNS):
        val = float(feature_dict.get(col, 0.0))
        mean_val = float(means[idx]) if idx < len(means) else 0.0
        std_val = float(scales[idx]) if idx < len(scales) and scales[idx] > 1e-6 else 1.0

        z_score = (val - mean_val) / std_val if std_val > 1e-6 else 0.0

        # Only register features that are elevated above the population baseline
        if z_score >= 0.3:
            if z_score >= 2.5:
                lvl = "CRITICAL"
            elif z_score >= 1.5:
                lvl = "HIGH"
            elif z_score >= 0.8:
                lvl = "MEDIUM"
            else:
                lvl = "LOW"

            meta = FEATURE_METADATA.get(col, {"label": col, "unit": "", "description": ""})
            factors.append(
                RiskFactorItem(
                    feature_name=col,
                    feature_label=meta["label"],
                    value=round(val, 2),
                    baseline_mean=round(mean_val, 2),
                    z_score=round(z_score, 2),
                    risk_level=lvl,
                    description=meta["description"],
                )
            )

    # Rank factors primarily by z_score descending
    factors.sort(key=lambda x: x.z_score, reverse=True)
    return factors[:max_factors]


def predict_employee_anomaly(
    feature_vector: EmployeeFeatureVector,
    model: Optional[IsolationForest] = None,
    scaler: Optional[StandardScaler] = None,
) -> dict[str, Any]:
    """
    Performs real-time anomaly inference for a single employee feature vector.
    Returns anomaly score (0-100), boolean outlier flag, severity tier, and top risk factors.
    """
    if model is None or scaler is None:
        model, scaler, _ = load_trained_model()

    feature_dict = {
        col: float(getattr(feature_vector, col, 0.0)) for col in FEATURE_COLUMNS
    }
    raw_vec = np.array([[feature_dict[col] for col in FEATURE_COLUMNS]], dtype=np.float64)

    scaled_vec = scaler.transform(raw_vec)
    pred_label = model.predict(scaled_vec)[0]  # -1 = outlier, 1 = inlier
    raw_decision = float(model.decision_function(scaled_vec)[0])

    anomaly_score = normalize_anomaly_score(raw_decision)
    is_anomaly = bool(pred_label == -1 or raw_decision < 0.0 or anomaly_score >= 50.0)
    severity = get_risk_severity(anomaly_score)

    risk_factors = compute_risk_factors(feature_dict, scaler)

    result = AnomalyPredictionResult(
        employee_id=feature_vector.employee_id,
        anomaly_score=anomaly_score,
        raw_decision_score=round(raw_decision, 4),
        is_anomaly=is_anomaly,
        severity=severity,
        contributing_risk_factors=risk_factors,
        features=feature_dict,
        evaluated_at=datetime.now(timezone.utc).isoformat(),
    )
    return result.model_dump()


def evaluate_precision_metrics(
    predictions: list[dict[str, Any]],
    known_threats: tuple[str, ...] = ("emp_1001", "emp_1002", "emp_1003"),
) -> dict[str, Any]:
    """Calculates precision, recall, F1, and accuracy against known ground-truth personas."""
    tp = 0
    fp = 0
    tn = 0
    fn = 0

    for p in predictions:
        emp_id = p["employee_id"]
        predicted_anomaly = p["is_anomaly"]
        is_ground_truth_threat = emp_id in known_threats

        if predicted_anomaly and is_ground_truth_threat:
            tp += 1
        elif predicted_anomaly and not is_ground_truth_threat:
            fp += 1
        elif not predicted_anomaly and not is_ground_truth_threat:
            tn += 1
        elif not predicted_anomaly and is_ground_truth_threat:
            fn += 1

    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * (precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0
    total = tp + fp + tn + fn
    accuracy = (tp + tn) / total if total > 0 else 0.0

    return {
        "true_positives": tp,
        "false_positives": fp,
        "true_negatives": tn,
        "false_negatives": fn,
        "precision": round(precision, 4),
        "recall": round(recall, 4),
        "f1_score": round(f1, 4),
        "accuracy": round(accuracy, 4),
    }


async def train_isolation_forest_model(
    vectors: Optional[list[EmployeeFeatureVector]] = None,
    window_days: int = 14,
    contamination: float = 0.18,
    n_estimators: int = 100,
    random_state: int = 42,
    save_artifacts: bool = True,
) -> dict[str, Any]:
    """
    Trains the Isolation Forest model on behavioral feature vectors,
    normalizes feature inputs with StandardScaler, calculates metrics,
    and optionally persists model artifacts to disk.
    """
    global _CACHED_MODEL, _CACHED_SCALER, _CACHED_METADATA

    if vectors is None or len(vectors) == 0:
        logger.info("Extracting employee feature vectors from database (lookback: %dd)...", window_days)
        vectors = await extract_all_employee_features(window_days=window_days)

    if not vectors:
        raise ValueError("Cannot train Isolation Forest: No feature vectors extracted.")

    X = vector_to_matrix(vectors)

    # 1. Fit StandardScaler
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    # 2. Fit IsolationForest
    model = IsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X_scaled)

    # 3. Perform batch inference for training evaluation
    predictions: list[dict[str, Any]] = []
    for v in vectors:
        pred = predict_employee_anomaly(v, model=model, scaler=scaler)
        predictions.append(pred)

    anomaly_count = sum(1 for p in predictions if p["is_anomaly"])
    metrics = evaluate_precision_metrics(predictions)

    # 4. Persist artifacts
    saved_model_path_str = ""
    saved_scaler_path_str = ""

    if save_artifacts:
        SAVED_MODELS_DIR.mkdir(parents=True, exist_ok=True)
        joblib.dump(model, MODEL_PATH)
        joblib.dump(scaler, SCALER_PATH)

        metadata_dict = {
            "model_type": "IsolationForest",
            "n_estimators": n_estimators,
            "contamination": contamination,
            "random_state": random_state,
            "window_days": window_days,
            "feature_columns": FEATURE_COLUMNS,
            "total_samples": len(vectors),
            "anomalies_detected": anomaly_count,
            "precision_metrics": metrics,
            "trained_at": datetime.now(timezone.utc).isoformat(),
        }

        with open(METADATA_PATH, "w", encoding="utf-8") as f:
            json.dump(metadata_dict, f, indent=2)

        _CACHED_MODEL = model
        _CACHED_SCALER = scaler
        _CACHED_METADATA = metadata_dict

        saved_model_path_str = str(MODEL_PATH)
        saved_scaler_path_str = str(SCALER_PATH)

    summary = ModelTrainingSummary(
        model_type="IsolationForest",
        total_samples=len(vectors),
        anomalies_detected=anomaly_count,
        contamination=contamination,
        window_days=window_days,
        n_estimators=n_estimators,
        model_path=saved_model_path_str,
        scaler_path=saved_scaler_path_str,
        trained_at=datetime.now(timezone.utc).isoformat(),
        precision_metrics=metrics,
    )

    return {
        "summary": summary.model_dump(),
        "predictions": predictions,
    }


def train_isolation_forest_model_sync(
    vectors: Optional[list[EmployeeFeatureVector]] = None,
    window_days: int = 14,
    contamination: float = 0.18,
    n_estimators: int = 100,
    random_state: int = 42,
    save_artifacts: bool = True,
) -> dict[str, Any]:
    """Synchronous helper for CLI scripts and worker processes."""
    import asyncio

    return asyncio.run(
        train_isolation_forest_model(
            vectors=vectors,
            window_days=window_days,
            contamination=contamination,
            n_estimators=n_estimators,
            random_state=random_state,
            save_artifacts=save_artifacts,
        )
    )
