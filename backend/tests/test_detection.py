"""Behavioural profiling, anomaly detection and risk scoring (modules 4, 5, 6)."""
import pytest

from app.ml import baseline as baseline_engine
from app.ml import risk as risk_engine
from app.models.enums import AnomalyCategory


@pytest.fixture(scope="module", autouse=True)
def _pipeline(db, employee):
    """Run the full analytics pipeline once for this module."""
    baseline_engine.build_all_baselines(db, employee_ids=[employee.id], lookback_days=90)
    from app.ml import anomaly as anomaly_engine

    result = anomaly_engine.run_detection(db, employee_ids=[employee.id], lookback_days=30)
    from app.services import alerts as alert_service

    risk_engine.recompute_all(db, employee_ids=[employee.id])
    alert_service.generate_alerts(db, result["anomalies"])
    db.commit()
    return result


def test_baseline_captures_the_routine_working_pattern(db, employee):
    from app.models.behavior import BehaviorBaseline
    from sqlalchemy import select

    baseline = db.execute(
        select(BehaviorBaseline).where(BehaviorBaseline.employee_id == employee.id)
    ).scalar_one()

    assert baseline.events_analysed > 100
    # The fixture logs in at 09:15 every working day.
    assert 8.0 <= baseline.mean_login_hour <= 10.0
    assert baseline.after_hours_ratio < 0.2
    assert baseline.quality_score > 0


def test_baseline_excludes_the_recent_detection_window(db, employee):
    """The attack must not become part of the employee's own normal."""
    from app.models.behavior import BehaviorBaseline
    from sqlalchemy import select

    baseline = db.execute(
        select(BehaviorBaseline).where(BehaviorBaseline.employee_id == employee.id)
    ).scalar_one()
    # Routine days move ~32 MB; the attack night moves >2 GB. If the attack had
    # leaked into the baseline the mean would be far higher than this.
    assert baseline.mean_daily_downloads < 100


def test_detection_flags_the_exfiltration_night(db, employee):
    from app.models.anomaly import Anomaly
    from sqlalchemy import select

    anomalies = list(
        db.execute(select(Anomaly).where(Anomaly.employee_id == employee.id)).scalars().all()
    )
    assert anomalies, "the planted exfiltration should produce anomalies"

    categories = {a.category for a in anomalies}
    assert AnomalyCategory.ABNORMAL_DATA_DOWNLOAD.value in categories
    assert AnomalyCategory.DATA_EXFILTRATION.value in categories
    assert AnomalyCategory.SUSPICIOUS_DEVICE_USAGE.value in categories

    assert any(a.severity in {"high", "critical"} for a in anomalies)


def test_detection_is_idempotent(db, employee):
    """Re-running detection must not duplicate the same finding."""
    from app.ml import anomaly as anomaly_engine
    from app.models.anomaly import Anomaly
    from sqlalchemy import func, select

    before = int(
        db.execute(select(func.count(Anomaly.id)).where(Anomaly.employee_id == employee.id)).scalar_one()
    )
    anomaly_engine.run_detection(db, employee_ids=[employee.id], lookback_days=30)
    db.commit()
    after = int(
        db.execute(select(func.count(Anomaly.id)).where(Anomaly.employee_id == employee.id)).scalar_one()
    )
    assert before == after


def test_risk_score_uses_the_specified_weights():
    assert risk_engine.WEIGHTS == {
        "behavioral_anomalies": 0.35,
        "privilege_misuse": 0.25,
        "data_access_violations": 0.20,
        "access_pattern_deviations": 0.10,
        "historical_security_events": 0.10,
    }
    assert round(sum(risk_engine.WEIGHTS.values()), 6) == 1.0


def test_risk_score_reflects_the_data_theft(db, employee):
    import json

    record = risk_engine.compute_risk(db, employee)
    db.commit()

    assert 0 <= record.score <= 100
    assert record.category in {"low", "medium", "high", "critical"}
    # Bulk download plus USB copies is a data-access violation above all else.
    raw = json.loads(record.raw_components)
    assert raw["data_access_violations"] > 40
    assert record.score > 20

    # The stored components must equal raw * weight.
    assert record.data_access_component == pytest.approx(
        raw["data_access_violations"] * 0.20, abs=0.05
    )


def test_risk_categorisation_thresholds():
    assert risk_engine.categorise(95).value == "critical"
    assert risk_engine.categorise(65).value == "high"
    assert risk_engine.categorise(40).value == "medium"
    assert risk_engine.categorise(10).value == "low"


def test_alerts_are_raised_and_aggregated(db, employee):
    from app.models.alert import Alert
    from sqlalchemy import select

    alerts = list(db.execute(select(Alert).where(Alert.employee_id == employee.id)).scalars().all())
    assert alerts, "high severity anomalies should raise alerts"
    # One alert per behaviour category, not one per detection.
    categories = [a.category for a in alerts]
    assert len(categories) == len(set(categories))
    assert all(a.priority >= 1 for a in alerts)
