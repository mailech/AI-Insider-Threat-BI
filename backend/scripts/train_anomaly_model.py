#!/usr/bin/env python3
"""
ITBIS — Milestone 2 Step 3: Isolation Forest ML Training & Anomaly Evaluation CLI
=================================================================================
Executes the Machine Learning training pipeline:
1. Extracts multi-factor behavioral feature vectors from MongoDB/PostgreSQL.
2. Standardizes feature vectors using StandardScaler.
3. Fits Scikit-Learn's IsolationForest model with tuned contamination parameters.
4. Computes normalized anomaly scores (0-100) and top contributing risk factors.
5. Persists artifacts (model + scaler) under `backend/app/models/saved_models/`.
6. Evaluates and prints a detailed prediction breakdown and precision audit.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import pathlib
import sys
from typing import Any

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

from app.services.ml_engine import (
    MODEL_PATH,
    SCALER_PATH,
    SAVED_MODELS_DIR,
    train_isolation_forest_model,
)


def print_training_banner(params: dict[str, Any]) -> None:
    """Print standard training header banner."""
    print("\n" + "=" * 115)
    print("  ITBIS ISOLATION FOREST ML ANOMALY DETECTION ENGINE — TRAINING & AUDIT")
    print("=" * 115)
    print(f"  * Lookback Window Days   : {params.get('window_days', 14)} days")
    print(f"  * Isolation Trees (n_est): {params.get('n_estimators', 100)}")
    print(f"  * Contamination Target   : {params.get('contamination', 0.18):.2f}")
    print(f"  * Random Seed State      : {params.get('random_state', 42)}")
    print(f"  * Artifacts Output Dir   : {SAVED_MODELS_DIR}")
    print("-" * 115)


def print_prediction_table(predictions: list[dict[str, Any]]) -> None:
    """Prints a high-density tabular evaluation report of model predictions."""
    print("\n" + "=" * 135)
    print("  EMPLOYEE BEHAVIORAL ANOMALY INFERENCE & RISK ATTRIBUTION RESULTS")
    print("=" * 135)
    header = (
        f"  {'STATUS':<8} | {'EMP ID':<9} | {'RAW SCORE':<10} | {'ANOMALY SCORE':<14} | "
        f"{'SEVERITY':<10} | {'IS THREAT':<9} | {'TOP CONTRIBUTING RISK FACTORS'}"
    )
    print(header)
    print("  " + "-" * 131)

    for p in predictions:
        emp_id = p["employee_id"]
        is_anomaly = p["is_anomaly"]
        score = p["anomaly_score"]
        raw = p["raw_decision_score"]
        severity = p["severity"]
        factors = p.get("contributing_risk_factors", [])

        if factors:
            factor_summaries = [f"{f['feature_label']} (+{f['z_score']}σ)" for f in factors[:2]]
            factor_str = ", ".join(factor_summaries)
        else:
            factor_str = "Nominal baseline activity"

        status_tag = "[ALERT] " if is_anomaly else "[NORMAL]"
        is_threat_str = "YES (FLAG)" if is_anomaly else "NO (SAFE)"

        row = (
            f"  {status_tag} | {emp_id:<9} | {raw:>+9.4f} | {score:>11.2f}/100 | "
            f"{severity:<10} | {is_threat_str:<9} | {factor_str}"
        )
        print(row)

    print("=" * 135)


def verify_evaluation_constraints(predictions: list[dict[str, Any]]) -> bool:
    """
    Validates core ITBIS behavioral detection constraints:
    1. Known malicious identities (emp_1001, emp_1002, emp_1003) MUST be flagged anomalous with score > 70.0.
    2. Benign cohort (emp_1004 to emp_1019) MUST NOT be flagged anomalous and have scores < 35.0.
    """
    pred_map = {p["employee_id"]: p for p in predictions}
    all_passed = True

    print("\n[AUDIT] MODEL ACCEPTANCE CRITERIA VERIFICATION:")
    print("  " + "-" * 85)

    # 1. Check Threat Personas
    known_threats = [
        ("emp_1001", "Financial Exfiltration Threat"),
        ("emp_1002", "Privilege Abuse / Sabotage Threat"),
        ("emp_1003", "Intellectual Property Theft Threat"),
    ]

    for emp_id, description in known_threats:
        p = pred_map.get(emp_id)
        if not p:
            print(f"  [FAIL] {emp_id} ({description}): Not present in predictions!")
            all_passed = False
            continue

        score = p["anomaly_score"]
        is_anomaly = p["is_anomaly"]
        passed = is_anomaly and score >= 70.0
        status = "[PASS]" if passed else "[FAIL]"
        print(
            f"  {status} {emp_id:<9} ({description}): "
            f"AnomalyScore={score:.2f}, FlaggedAnomalous={is_anomaly}, Severity={p['severity']}"
        )
        if not passed:
            all_passed = False

    print("  " + "-" * 85)

    # 2. Check Benign Baseline Cohort
    benign_preds = [p for p in predictions if p["employee_id"] not in ("emp_1001", "emp_1002", "emp_1003")]
    benign_failures = []

    for p in benign_preds:
        emp_id = p["employee_id"]
        score = p["anomaly_score"]
        is_anomaly = p["is_anomaly"]
        if is_anomaly or score >= 35.0:
            benign_failures.append((emp_id, score, is_anomaly))

    if not benign_failures:
        max_benign_score = max(p["anomaly_score"] for p in benign_preds) if benign_preds else 0.0
        avg_benign_score = (
            sum(p["anomaly_score"] for p in benign_preds) / len(benign_preds) if benign_preds else 0.0
        )
        print(
            f"  [PASS] Benign Baseline Cohort ({len(benign_preds)} employees): "
            f"MaxScore={max_benign_score:.2f} (<35.0), AvgScore={avg_benign_score:.2f}, Zero False Positives"
        )
    else:
        print(f"  [FAIL] Benign Cohort had {len(benign_failures)} false positive / high score violations:")
        for emp_id, score, is_anomaly in benign_failures:
            print(f"         - {emp_id}: Score={score:.2f}, FlaggedAnomalous={is_anomaly}")
        all_passed = False

    print("=" * 85)
    return all_passed


async def main() -> None:
    parser = argparse.ArgumentParser(
        description="Train and evaluate ITBIS Isolation Forest Anomaly Detection Engine."
    )
    parser.add_argument("--days", type=int, default=14, help="Lookback window in days (default: 14)")
    parser.add_argument(
        "--contamination",
        type=float,
        default=0.18,
        help="Expected anomaly contamination fraction (default: 0.18)",
    )
    parser.add_argument(
        "--n-estimators",
        type=int,
        default=100,
        help="Number of Isolation Trees to ensemble (default: 100)",
    )
    parser.add_argument(
        "--random-state",
        type=int,
        default=42,
        help="Random seed generator state for reproducible training (default: 42)",
    )
    parser.add_argument(
        "--no-save",
        action="store_true",
        help="Disable persisting trained artifacts to disk",
    )
    args = parser.parse_args()

    params = {
        "window_days": args.days,
        "contamination": args.contamination,
        "n_estimators": args.n_estimators,
        "random_state": args.random_state,
        "save_artifacts": not args.no_save,
    }

    print_training_banner(params)

    print("[*] Commencing Isolation Forest model fitting and feature vector analysis...")
    train_result = await train_isolation_forest_model(
        window_days=args.days,
        contamination=args.contamination,
        n_estimators=args.n_estimators,
        random_state=args.random_state,
        save_artifacts=not args.no_save,
    )

    summary = train_result["summary"]
    predictions = train_result["predictions"]
    metrics = summary["precision_metrics"]

    print_prediction_table(predictions)

    print("\n[AUDIT] MODEL PERFORMANCE & PRECISION METRICS:")
    print(f"  * Total Evaluated Employees : {summary['total_samples']}")
    print(f"  * Detected Anomalies Count  : {summary['anomalies_detected']}")
    print(f"  * Model Precision           : {metrics.get('precision', 0.0) * 100:.2f}% (TP={metrics.get('true_positives')}, FP={metrics.get('false_positives')})")
    print(f"  * Model Recall / Sensitivity: {metrics.get('recall', 0.0) * 100:.2f}% (TP={metrics.get('true_positives')}, FN={metrics.get('false_negatives')})")
    print(f"  * Model F1-Score            : {metrics.get('f1_score', 0.0) * 100:.2f}%")
    print(f"  * Model Accuracy            : {metrics.get('accuracy', 0.0) * 100:.2f}%")

    if not args.no_save:
        print("\n[ARTIFACTS] SAVED MODEL ARTIFACTS:")
        print(f"  [OK] Model Artifact  : {MODEL_PATH}")
        print(f"  [OK] Scaler Artifact : {SCALER_PATH}")
        print(f"  [OK] Metadata Record : {SAVED_MODELS_DIR / 'model_metadata.json'}")

    constraints_passed = verify_evaluation_constraints(predictions)

    if constraints_passed:
        print("\n[SUCCESS] ISOLATION FOREST ML TRAINING & EVALUATION COMPLETED SUCCESSFULLY (100% PASS)!\n")
        sys.exit(0)
    else:
        print("\n[ERROR] CRITICAL CONSTRAINTS FAILED AUDIT CHECKS.\n")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
