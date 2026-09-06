from datetime import datetime, timedelta

from sqlalchemy.orm import Session

from app import models
from app.config import settings


def _level_from_score(score: float) -> models.RiskLevel:
    if score >= 75:
        return models.RiskLevel.critical
    if score >= 50:
        return models.RiskLevel.high
    if score >= 25:
        return models.RiskLevel.medium
    return models.RiskLevel.low


def compute_risk_score(db: Session, employee_id: str, window_days: int = 30) -> models.RiskScore:
    """
    Implements the weighted scoring model from the spec:
      Insider Risk Score =
        Behavioral Anomalies (35%) + Privilege Misuse Indicators (25%) +
        Data Access Violations (20%) + Access Pattern Deviations (10%) +
        Historical Security Events (10%)
    Each component is normalized to a 0-100 scale before weighting.
    """
    since = datetime.utcnow() - timedelta(days=window_days)

    anomalies = (
        db.query(models.Anomaly)
        .filter(models.Anomaly.employee_id == employee_id, models.Anomaly.detected_at >= since)
        .all()
    )

    behavioral_anoms = [a for a in anomalies if a.category in (
        "behavioral_anomaly", "unusual_login_time", "insider_risk_indicators")]
    privilege_anoms = [a for a in anomalies if a.category == "unauthorized_access_attempts"]
    data_access_anoms = [a for a in anomalies if a.category in (
        "abnormal_data_download", "excessive_file_transfer")]
    access_pattern_anoms = [a for a in anomalies if a.category == "suspicious_device_usage"]

    all_time_anomalies = (
        db.query(models.Anomaly).filter(models.Anomaly.employee_id == employee_id).count()
    )

    def component_score(items, cap=5):
        if not items:
            return 0.0
        avg_severity = sum(a.anomaly_score for a in items) / len(items)
        volume_factor = min(1.0, len(items) / cap)
        return round(avg_severity * 100 * (0.5 + 0.5 * volume_factor), 2)

    behavioral_component = component_score(behavioral_anoms)
    privilege_component = component_score(privilege_anoms, cap=3)
    data_access_component = component_score(data_access_anoms, cap=3)
    access_pattern_component = component_score(access_pattern_anoms, cap=3)
    historical_component = round(min(100.0, all_time_anomalies * 4), 2)

    score = (
        behavioral_component * settings.WEIGHT_BEHAVIORAL_ANOMALIES
        + privilege_component * settings.WEIGHT_PRIVILEGE_MISUSE
        + data_access_component * settings.WEIGHT_DATA_ACCESS_VIOLATIONS
        + access_pattern_component * settings.WEIGHT_ACCESS_PATTERN_DEVIATIONS
        + historical_component * settings.WEIGHT_HISTORICAL_SECURITY_EVENTS
    )
    score = round(min(100.0, score), 2)

    risk = models.RiskScore(
        employee_id=employee_id,
        score=score,
        risk_level=_level_from_score(score),
        behavioral_component=behavioral_component,
        privilege_component=privilege_component,
        data_access_component=data_access_component,
        access_pattern_component=access_pattern_component,
        historical_component=historical_component,
    )
    db.add(risk)
    db.commit()
    db.refresh(risk)
    return risk


def compute_risk_scores_all(db: Session):
    employee_ids = [e.id for e in db.query(models.Employee.id).all()]
    results = []
    for emp_id in employee_ids:
        results.append(compute_risk_score(db, emp_id))
    return results
