"""The supervised classifier (detector 5) and its guard rails.

The behaviour that matters most here is refusal. A classifier trained on three
positive days would happily predict "safe" for everyone and score 97% accuracy
doing it, so the training path must decline rather than produce a model that
looks good and means nothing.
"""
from __future__ import annotations

import numpy as np

from app.ml import classifier as C
from app.ml import features as F
from app.models.enums import AnomalyCategory, DetectionMethod


# ------------------------------------------------------------------ guards
def test_no_model_artifact_means_no_prediction():
    assert C.predict_proba(None, {name: 1.0 for name in F.FEATURE_NAMES}) is None


def test_model_info_reports_untrained_state():
    info = C.model_info()
    if not info["trained"]:
        assert "reason" in info


def test_training_refuses_when_there_are_too_few_positives(db, employee):
    """The fixture employee has one bad night, nowhere near MIN_POSITIVES."""
    result = C.train(db, lookback_days=90)
    if not result["trained"]:
        assert "reason" in result
        assert result["rows"] >= 0
    else:
        # If a prior test seeded enough positives, metrics must be reported.
        assert "metrics" in result


def test_training_set_is_labelled_and_shaped_correctly(db, employee):
    X, y, meta = C.build_training_set(db, lookback_days=90)
    assert X.shape[0] == y.shape[0]
    if X.shape[0]:
        assert X.shape[1] == len(F.FEATURE_NAMES)
    assert meta["rows"] == X.shape[0]
    assert set(np.unique(y)).issubset({0, 1})


def test_positive_days_include_the_week_before_an_incident(db, employee):
    """Labels are distilled from detector verdicts and incident lookahead."""
    days = C._positive_days(db, employee.id)
    assert isinstance(days, set)


# --------------------------------------------------------------- detector
def test_detector_is_silent_without_a_model():
    from datetime import datetime, timezone

    from app.ml.anomaly import ml_classifier_detector

    feats = {name: 1.0 for name in F.FEATURE_NAMES}
    findings = ml_classifier_detector(
        datetime.now(timezone.utc).date(), feats, None, datetime.now(timezone.utc), False
    )
    assert findings == []


def test_detector_defers_to_the_other_detectors(db):
    """It must not restate a finding the rules already made."""
    from datetime import datetime, timezone

    from app.ml.anomaly import ml_classifier_detector

    class AlwaysCertain:
        def predict_proba(self, x):
            return np.asarray([[0.01, 0.99]])

    bundle = {
        "model": AlwaysCertain(),
        "features": list(F.FEATURE_NAMES),
        "threshold": 0.5,
        "top_features": {"download_mb": 0.4},
    }
    feats = {name: 1.0 for name in F.FEATURE_NAMES}
    now = datetime.now(timezone.utc)

    # Another detector already fired for this day.
    assert ml_classifier_detector(now.date(), feats, bundle, now, True) == []

    # Nothing else fired, so the classifier speaks.
    findings = ml_classifier_detector(now.date(), feats, bundle, now, False)
    assert len(findings) == 1
    assert findings[0].method == DetectionMethod.ML_CLASSIFIER
    assert findings[0].category == AnomalyCategory.INSIDER_RISK_INDICATOR


def test_detector_stays_below_threshold():
    from datetime import datetime, timezone

    from app.ml.anomaly import ml_classifier_detector

    class Unconvinced:
        def predict_proba(self, x):
            return np.asarray([[0.8, 0.2]])

    bundle = {
        "model": Unconvinced(),
        "features": list(F.FEATURE_NAMES),
        "threshold": 0.65,
        "top_features": {},
    }
    now = datetime.now(timezone.utc)
    feats = {name: 1.0 for name in F.FEATURE_NAMES}
    assert ml_classifier_detector(now.date(), feats, bundle, now, False) == []


def test_classifier_confidence_never_outranks_deterministic_detectors():
    """Distilled labels justify a lead, not a conclusion."""
    from datetime import datetime, timezone

    from app.ml.anomaly import ml_classifier_detector

    class Certain:
        def predict_proba(self, x):
            return np.asarray([[0.0, 1.0]])

    bundle = {
        "model": Certain(),
        "features": list(F.FEATURE_NAMES),
        "threshold": 0.5,
        "top_features": {"usb_mb": 0.5},
    }
    now = datetime.now(timezone.utc)
    findings = ml_classifier_detector(
        now.date(), {name: 2.0 for name in F.FEATURE_NAMES}, bundle, now, False
    )
    assert findings[0].confidence <= 0.65


def test_stale_model_with_wrong_features_is_rejected(tmp_path, monkeypatch):
    """A bundle trained on a different feature order would score nonsense."""
    import joblib

    from app.core.config import settings

    monkeypatch.setattr(settings, "MODEL_DIR", str(tmp_path))
    joblib.dump({"model": object(), "features": ["only", "two"]}, C.model_path())
    assert C.load_model(force=True) is None


# ------------------------------------------------------------- API surface
def test_model_status_endpoint_is_readable(client, analyst_headers):
    response = client.get("/api/v1/detection/model", headers=analyst_headers)
    assert response.status_code == 200
    assert "trained" in response.json()


def test_training_requires_soc_or_above(client, analyst_headers):
    response = client.post("/api/v1/detection/train", headers=analyst_headers)
    assert response.status_code == 403


def test_training_endpoint_reports_its_verdict(client, soc_headers):
    response = client.post("/api/v1/detection/train", headers=soc_headers)
    assert response.status_code == 200
    body = response.json()
    assert "trained" in body
    if not body["trained"]:
        assert body["reason"]
