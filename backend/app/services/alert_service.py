from sqlalchemy.orm import Session

from app import models


def _severity_for_score(score: float) -> models.AlertSeverity:
    if score >= 75:
        return models.AlertSeverity.critical
    if score >= 50:
        return models.AlertSeverity.high
    if score >= 25:
        return models.AlertSeverity.medium
    if score >= 10:
        return models.AlertSeverity.low
    return models.AlertSeverity.informational


def generate_alerts_from_risk_scores(db: Session, min_score: float = 25.0):
    """Creates alerts for the latest risk score per employee above threshold."""
    employees = db.query(models.Employee).all()
    created = []
    for emp in employees:
        latest_score = (
            db.query(models.RiskScore)
            .filter(models.RiskScore.employee_id == emp.id)
            .order_by(models.RiskScore.computed_at.desc())
            .first()
        )
        if not latest_score or latest_score.score < min_score:
            continue

        # avoid duplicate open alerts for the same risk snapshot
        existing = (
            db.query(models.Alert)
            .filter(
                models.Alert.employee_id == emp.id,
                models.Alert.status.in_([models.AlertStatus.open, models.AlertStatus.investigating]),
            )
            .first()
        )
        if existing:
            continue

        alert = models.Alert(
            employee_id=emp.id,
            title=f"Elevated insider risk: {emp.full_name}",
            description=(
                f"Risk score {latest_score.score} ({latest_score.risk_level.value}). "
                f"Behavioral={latest_score.behavioral_component}, "
                f"Privilege={latest_score.privilege_component}, "
                f"DataAccess={latest_score.data_access_component}."
            ),
            severity=_severity_for_score(latest_score.score),
        )
        db.add(alert)
        created.append(alert)
    db.commit()
    return created
