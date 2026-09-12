"""Supervised insider-risk classifier (XGBoost).

Two consumers:

  * the ``ML_CLASSIFIER`` detector in module 5, which flags an employee-day the
    model considers risky even when no single rule or z-score crossed its
    threshold;
  * the threat prediction in module 8, which replaces a hand-tuned logistic
    formula with a fitted model when one has been trained.

**Where the labels come from, stated plainly.** There is no ground truth for
insider threat in this dataset -- no organisation publishes confirmed-betrayal
labels, and the seeded corpus is synthetic. So the model is trained by
*distillation*: an employee-day is labelled positive when the independent
detectors (rules, z-score, peer comparison) already judged it high or critical,
or when an incident was opened on that employee within the following week.

That makes this a model that learns to generalise the combined judgement of the
other four detectors -- it can flag a day whose individual signals each sit just
under their thresholds but which collectively resemble days that were escalated.
That is genuinely useful and it is exactly what the stored metrics measure. It
is *not* evidence of real-world predictive accuracy against actual insiders, and
nothing in the UI or the API claims otherwise.

The model is optional everywhere. Until ``train()`` has run, the detector emits
nothing and prediction falls back to the heuristic.
"""
from __future__ import annotations

import logging
import os
from datetime import date, datetime, timedelta, timezone
from typing import Any, Dict, List, Optional, Sequence, Tuple

import numpy as np
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml import baseline as B
from app.ml import features as F
from app.models.anomaly import Anomaly
from app.models.employee import Employee
from app.models.incident import Incident

logger = logging.getLogger("itbis.classifier")

try:  # joblib ships with scikit-learn; guarded so an incomplete env degrades
    import joblib
except ImportError:  # pragma: no cover
    joblib = None  # type: ignore

MODEL_FILENAME = "threat_classifier.joblib"

# Severities that count as a positive label when produced by a non-ML detector.
ESCALATED_SEVERITIES = {"high", "critical"}

# Detectors whose verdicts form the training signal. The ML detector is excluded
# so the model can never be trained on its own output.
TEACHER_METHODS = {"rule", "statistical_zscore", "peer_group", "isolation_forest"}

# An incident opened within this many days of a day makes that day positive.
INCIDENT_LOOKAHEAD_DAYS = 7

MIN_TRAINING_ROWS = 60
MIN_POSITIVES = 8


def model_path() -> str:
    os.makedirs(settings.MODEL_DIR, exist_ok=True)
    return os.path.join(settings.MODEL_DIR, MODEL_FILENAME)


# ------------------------------------------------------------------ labelling
def _positive_days(db: Session, employee_id: int) -> set:
    """Employee-days the other detectors or an incident already condemned."""
    days: set = set()

    rows = db.execute(
        select(Anomaly.occurred_at, Anomaly.severity, Anomaly.detection_method).where(
            Anomaly.employee_id == employee_id,
            Anomaly.is_false_positive.is_(False),
        )
    ).all()
    for occurred_at, severity, method in rows:
        if method in TEACHER_METHODS and (severity or "").lower() in ESCALATED_SEVERITIES:
            days.add(F.as_utc(occurred_at).date())

    incidents = db.execute(
        select(Incident.opened_at).where(Incident.employee_id == employee_id)
    ).scalars().all()
    for opened_at in incidents:
        opened = F.as_utc(opened_at).date()
        for back in range(INCIDENT_LOOKAHEAD_DAYS + 1):
            days.add(opened - timedelta(days=back))
    return days


def build_training_set(
    db: Session, lookback_days: int = 90
) -> Tuple[np.ndarray, np.ndarray, Dict[str, Any]]:
    """Assemble the employee-day feature matrix and its distilled labels."""
    employees = list(db.execute(select(Employee)).scalars().all())
    rows: List[List[float]] = []
    labels: List[int] = []
    contributing = 0

    for employee in employees:
        events = B.fetch_events(db, employee.id, lookback_days)
        if not events:
            continue
        contributing += 1
        positives = _positive_days(db, employee.id)
        days, matrix, _ = F.build_daily_matrix(events)
        for day, vector in zip(days, matrix):
            rows.append(vector)
            labels.append(1 if day in positives else 0)

    X = np.asarray(rows, dtype=float) if rows else np.empty((0, len(F.FEATURE_NAMES)))
    y = np.asarray(labels, dtype=int) if labels else np.empty((0,), dtype=int)
    meta = {
        "employees_contributing": contributing,
        "rows": int(X.shape[0]),
        "positives": int(y.sum()) if y.size else 0,
        "lookback_days": lookback_days,
    }
    return X, y, meta


# ------------------------------------------------------------------- training
def train(db: Session, lookback_days: int = 90) -> Dict[str, Any]:
    """Fit the classifier and persist it. Returns a metrics report."""
    if joblib is None:
        return {"trained": False, "reason": "joblib is not installed"}
    try:
        from xgboost import XGBClassifier
    except ImportError:
        return {"trained": False, "reason": "xgboost is not installed"}

    X, y, meta = build_training_set(db, lookback_days)
    positives = int(y.sum()) if y.size else 0

    if X.shape[0] < MIN_TRAINING_ROWS:
        return {
            "trained": False,
            "reason": f"only {X.shape[0]} employee-days available, {MIN_TRAINING_ROWS} needed",
            **meta,
        }
    if positives < MIN_POSITIVES:
        return {
            "trained": False,
            "reason": (
                f"only {positives} positive days available, {MIN_POSITIVES} needed -- "
                "run detection first so there is something to learn from"
            ),
            **meta,
        }

    from sklearn.metrics import average_precision_score, roc_auc_score
    from sklearn.model_selection import train_test_split

    # Stratify so a rare positive class is represented on both sides of the split.
    try:
        X_train, X_test, y_train, y_test = train_test_split(
            X, y, test_size=0.25, random_state=42, stratify=y
        )
    except ValueError:
        X_train, X_test, y_train, y_test = X, X, y, y

    negatives = max(1, int((y_train == 0).sum()))
    pos_train = max(1, int((y_train == 1).sum()))

    model = XGBClassifier(
        n_estimators=220,
        max_depth=4,
        learning_rate=0.08,
        subsample=0.9,
        colsample_bytree=0.9,
        reg_lambda=1.2,
        # The positive class is rare by construction; without this the model
        # trivially predicts "safe" for everyone and scores well doing it.
        scale_pos_weight=negatives / pos_train,
        eval_metric="logloss",
        random_state=42,
        n_jobs=2,
    )
    model.fit(X_train, y_train)

    probabilities = model.predict_proba(X_test)[:, 1]
    metrics: Dict[str, Any] = {}
    if len(set(y_test.tolist())) > 1:
        metrics["roc_auc"] = round(float(roc_auc_score(y_test, probabilities)), 4)
        metrics["average_precision"] = round(
            float(average_precision_score(y_test, probabilities)), 4
        )

    threshold = float(settings.CLASSIFIER_THRESHOLD)
    predicted = (probabilities >= threshold).astype(int)
    true_positive = int(((predicted == 1) & (y_test == 1)).sum())
    false_positive = int(((predicted == 1) & (y_test == 0)).sum())
    false_negative = int(((predicted == 0) & (y_test == 1)).sum())
    metrics["precision"] = round(true_positive / max(1, true_positive + false_positive), 4)
    metrics["recall"] = round(true_positive / max(1, true_positive + false_negative), 4)
    metrics["false_positive_rate"] = round(
        false_positive / max(1, int((y_test == 0).sum())), 4
    )

    importances = {
        name: round(float(score), 5)
        for name, score in zip(F.FEATURE_NAMES, model.feature_importances_)
    }
    top_features = dict(
        sorted(importances.items(), key=lambda kv: kv[1], reverse=True)[:10]
    )

    bundle = {
        "model": model,
        "features": list(F.FEATURE_NAMES),
        "threshold": threshold,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "metrics": metrics,
        "meta": meta,
        "top_features": top_features,
        "label_definition": (
            "distilled: high/critical anomaly from a non-ML detector, or an "
            f"incident opened within {INCIDENT_LOOKAHEAD_DAYS} days"
        ),
    }
    joblib.dump(bundle, model_path())
    logger.info(
        "Threat classifier trained on %d days (%d positive): %s", X.shape[0], positives, metrics
    )
    _CACHE["bundle"] = bundle
    return {"trained": True, **meta, "metrics": metrics, "top_features": top_features}


# ------------------------------------------------------------------ inference
# Loading a joblib bundle costs tens of milliseconds; detection calls this once
# per employee, so it is cached for the process lifetime and replaced on retrain.
_CACHE: Dict[str, Any] = {"bundle": None, "checked": False}


def load_model(force: bool = False) -> Optional[Dict[str, Any]]:
    if force:
        _CACHE["checked"] = False
    if _CACHE["checked"]:
        return _CACHE["bundle"]
    _CACHE["checked"] = True
    if joblib is None:
        return None
    path = model_path()
    if not os.path.exists(path):
        _CACHE["bundle"] = None
        return None
    try:
        bundle = joblib.load(path)
    except Exception as exc:  # pragma: no cover
        logger.warning("Could not load threat classifier (%s)", exc)
        _CACHE["bundle"] = None
        return None
    # A bundle trained on a different feature order would score nonsense.
    if list(bundle.get("features", [])) != list(F.FEATURE_NAMES):
        logger.warning("Threat classifier feature mismatch - ignoring stale model")
        _CACHE["bundle"] = None
        return None
    _CACHE["bundle"] = bundle
    return bundle


def predict_proba(bundle: Optional[Dict[str, Any]], feats: Dict[str, float]) -> Optional[float]:
    """Probability that one employee-day resembles an escalated day."""
    if not bundle or bundle.get("model") is None:
        return None
    try:
        x = np.asarray([F.vector(feats)], dtype=float)
        return float(bundle["model"].predict_proba(x)[0][1])
    except Exception as exc:  # pragma: no cover
        logger.warning("Classifier inference failed (%s)", exc)
        return None


def contributing_features(
    bundle: Optional[Dict[str, Any]], feats: Dict[str, float], top: int = 5
) -> Dict[str, float]:
    """The model's most important features, restricted to ones actually present.

    A probability with no explanation is not actionable for an analyst, so the
    detector always reports which of the day's measurements drove it.
    """
    if not bundle:
        return {}
    ranked = bundle.get("top_features") or {}
    present = {
        name: round(float(feats.get(name, 0.0)), 2)
        for name in ranked
        if float(feats.get(name, 0.0)) > 0
    }
    return dict(list(present.items())[:top])


def model_info() -> Dict[str, Any]:
    """Status for the admin dashboard and /health/services."""
    bundle = load_model()
    if not bundle:
        return {"trained": False, "reason": "no model artifact -- POST /api/v1/detection/train"}
    return {
        "trained": True,
        "trained_at": bundle.get("trained_at"),
        "metrics": bundle.get("metrics", {}),
        "threshold": bundle.get("threshold"),
        "features": len(bundle.get("features", [])),
        "top_features": bundle.get("top_features", {}),
        "label_definition": bundle.get("label_definition"),
    }


def employee_probability(
    db: Session, employee: Employee, lookback_days: int = 14
) -> Optional[Dict[str, Any]]:
    """Peak and mean classifier probability across an employee's recent days."""
    bundle = load_model()
    if not bundle:
        return None
    events = B.fetch_events(db, employee.id, lookback_days)
    if not events:
        return None
    _, _, per_day = F.build_daily_matrix(events)
    scores = [p for p in (predict_proba(bundle, day) for day in per_day) if p is not None]
    if not scores:
        return None
    return {
        "peak_probability": round(max(scores), 4),
        "mean_probability": round(float(np.mean(scores)), 4),
        "days_scored": len(scores),
        "threshold": bundle.get("threshold", settings.CLASSIFIER_THRESHOLD),
        "model_trained_at": bundle.get("trained_at"),
    }
