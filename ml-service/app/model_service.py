"""Core model loading and scoring logic for the Insider Threat ML service.

Loads the IsolationForest model bundle once at module level (singleton).
Implements batch scoring with percentile-based risk banding to mitigate
the scale mismatch between the model's training data (cumulative counts
in the hundreds/thousands) and this project's mock activity window.
"""

import os
import warnings
import logging

import joblib
import numpy as np

logger = logging.getLogger("ml-service")

# ── Model bundle (loaded once at import time) ──────────────────────────

_MODEL_PATH = os.path.join(
    os.path.dirname(os.path.dirname(__file__)),
    "model",
    "insider_threat_model.joblib",
)

# Suppress the expected InconsistentVersionWarning from sklearn version mismatch
with warnings.catch_warnings():
    warnings.filterwarnings("ignore", category=UserWarning)
    _bundle = joblib.load(_MODEL_PATH)

model = _bundle["model"]
scaler = _bundle["scaler"]
feature_cols: list[str] = _bundle["feature_cols"]

# ── Startup self-check (printed to stdout, not just /health) ───────────

def log_model_info() -> None:
    """Print introspected model attributes at startup for verification."""
    logger.info("=" * 60)
    logger.info("INSIDER/IQ ML SERVICE — MODEL SELF-CHECK")
    logger.info("=" * 60)
    logger.info(f"  n_features_in_   : {model.n_features_in_}")
    logger.info(f"  feature_cols     : {feature_cols}")
    logger.info(f"  model.get_params : {model.get_params()}")
    logger.info(f"  scaler.mean_     : {scaler.mean_}")
    logger.info(f"  scaler.scale_    : {scaler.scale_}")
    logger.info("=" * 60)

    # Also print to stdout so it's visible in the console regardless of
    # logging configuration
    print("=" * 60)
    print("INSIDER/IQ ML SERVICE — MODEL SELF-CHECK")
    print("=" * 60)
    print(f"  n_features_in_   : {model.n_features_in_}")
    print(f"  feature_cols     : {feature_cols}")
    print(f"  model.get_params : {model.get_params()}")
    print(f"  scaler.mean_     : {scaler.mean_}")
    print(f"  scaler.scale_    : {scaler.scale_}")
    print("=" * 60)


# ── Percentile thresholds for risk banding ─────────────────────────────
# Bottom 5% of decision_function scores (most anomalous) → CRITICAL
# Next 15% → HIGH
# Next 30% → MEDIUM
# Remaining 50% → LOW

BAND_PERCENTILES = {
    "CRITICAL": 5,
    "HIGH": 20,      # cumulative: 5 + 15
    "MEDIUM": 50,     # cumulative: 20 + 30
}


def _assign_risk_band(score: float, percentile_thresholds: dict[str, float]) -> str:
    """Assign a risk band based on where a score falls relative to batch percentiles.

    Lower decision_function scores = more anomalous in IsolationForest.
    """
    if score <= percentile_thresholds.get("CRITICAL", float("-inf")):
        return "CRITICAL"
    elif score <= percentile_thresholds.get("HIGH", float("-inf")):
        return "HIGH"
    elif score <= percentile_thresholds.get("MEDIUM", float("-inf")):
        return "MEDIUM"
    else:
        return "LOW"


def _score_to_risk_percentage(score: float, all_scores: np.ndarray) -> float:
    """Convert a decision_function score to a 0-100 risk percentage.

    Lower decision_function = higher risk, so we invert the percentile.
    """
    if len(all_scores) <= 1:
        return 50.0
    percentile = float(np.sum(all_scores <= score) / len(all_scores) * 100)
    # Invert: low percentile in scores = high risk
    return round(100.0 - percentile, 1)


def score_single(features: dict[str, float]) -> dict:
    """Score a single employee's feature vector."""
    feature_array = np.array([[features[col] for col in feature_cols]])
    scaled = scaler.transform(feature_array)

    decision_score = float(model.decision_function(scaled)[0])
    predict_label = int(model.predict(scaled)[0])

    # For a single score, we can't do percentile ranking, so use a
    # simple heuristic based on the decision function value
    if decision_score < -0.3:
        risk_band = "CRITICAL"
    elif decision_score < -0.1:
        risk_band = "HIGH"
    elif decision_score < 0.0:
        risk_band = "MEDIUM"
    else:
        risk_band = "LOW"

    return {
        "decision_function_score": round(decision_score, 6),
        "predict_label": predict_label,
        "risk_band": risk_band,
        "risk_score": round(max(0, min(100, 50 - decision_score * 100)), 1),
    }


def score_batch(employees: list[dict]) -> dict:
    """Score a batch of employees using percentile-based risk banding.

    This is the primary scoring method. It computes decision_function
    scores for all employees, then assigns risk bands using percentile
    ranking *within the batch* — not the model's absolute trained cutoff.
    This mitigates the scale mismatch between the model's training data
    (cumulative counts in hundreds/thousands) and mock activity data.
    """
    if not employees:
        return {"results": [], "band_distribution": {}}

    # Build the feature matrix in the correct column order
    feature_matrix = np.array([
        [emp[col] for col in feature_cols]
        for emp in employees
    ])

    # Scale using the fitted scaler
    scaled = scaler.transform(feature_matrix)

    # Get continuous scores and binary predictions
    decision_scores = model.decision_function(scaled)
    predict_labels = model.predict(scaled)

    # Compute percentile thresholds from this batch's score distribution
    percentile_thresholds = {
        band: float(np.percentile(decision_scores, pct))
        for band, pct in BAND_PERCENTILES.items()
    }

    # Build results
    results = []
    band_counts: dict[str, int] = {"CRITICAL": 0, "HIGH": 0, "MEDIUM": 0, "LOW": 0}

    for i, emp in enumerate(employees):
        score = float(decision_scores[i])
        band = _assign_risk_band(score, percentile_thresholds)
        risk_pct = _score_to_risk_percentage(score, decision_scores)
        band_counts[band] += 1

        results.append({
            "employee_id": emp["employee_id"],
            "decision_function_score": round(score, 6),
            "predict_label": int(predict_labels[i]),
            "risk_band": band,
            "risk_score": risk_pct,
        })

    # Sort by risk_score descending (highest risk first)
    results.sort(key=lambda r: r["risk_score"], reverse=True)

    return {
        "results": results,
        "band_distribution": band_counts,
    }
