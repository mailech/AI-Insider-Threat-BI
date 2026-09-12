"""Alert generation and lifecycle (module 9)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.alert import Alert
from app.models.anomaly import Anomaly
from app.models.employee import Employee
from app.models.enums import AlertStatus, Severity
from app.services import notifications

# Only anomalies at or above this severity raise an alert; the rest stay as
# behavioural telemetry visible in the analytics views.
ALERT_MIN_SEVERITY = {Severity.MEDIUM.value, Severity.HIGH.value, Severity.CRITICAL.value}

PRIORITY_BY_SEVERITY = {
    Severity.CRITICAL.value: 1,
    Severity.HIGH.value: 2,
    Severity.MEDIUM.value: 3,
    Severity.LOW.value: 4,
    Severity.INFORMATIONAL.value: 5,
}


def priority_for(severity: str, risk_score: float) -> int:
    """Alert prioritisation: severity first, nudged up by employee risk."""
    base = PRIORITY_BY_SEVERITY.get(severity, 4)
    if risk_score >= 80 and base > 1:
        base -= 1
    elif risk_score >= 60 and base > 2:
        base -= 1
    return max(1, base)


SEVERITY_RANK = {
    Severity.INFORMATIONAL.value: 0,
    Severity.LOW.value: 1,
    Severity.MEDIUM.value: 2,
    Severity.HIGH.value: 3,
    Severity.CRITICAL.value: 4,
}

# Repeat detections of the same behaviour within this window roll into the
# existing alert instead of creating a new queue entry.
AGGREGATION_WINDOW_DAYS = 7

OPEN_STATUSES = [
    AlertStatus.NEW.value,
    AlertStatus.ACKNOWLEDGED.value,
    AlertStatus.IN_REVIEW.value,
    AlertStatus.ESCALATED.value,
]


def _find_open_alert(db: Session, anomaly: Anomaly) -> Optional[Alert]:
    """An open alert covering the same employee and behaviour category."""
    since = datetime.now(timezone.utc) - timedelta(days=AGGREGATION_WINDOW_DAYS)
    return db.execute(
        select(Alert)
        .where(
            Alert.employee_id == anomaly.employee_id,
            Alert.category == anomaly.category,
            Alert.status.in_(OPEN_STATUSES),
            Alert.triggered_at >= since,
        )
        .order_by(Alert.triggered_at.desc())
        .limit(1)
    ).scalar_one_or_none()


def _roll_up(db: Session, alert: Alert, anomaly: Anomaly, employee: Employee) -> Alert:
    """Fold a repeat detection into an existing open alert."""
    alert.occurrence_count = (alert.occurrence_count or 1) + 1
    alert.last_seen_at = anomaly.detected_at
    if SEVERITY_RANK.get(anomaly.severity, 0) > SEVERITY_RANK.get(alert.severity, 0):
        alert.severity = anomaly.severity
        alert.title = anomaly.title
        alert.description = anomaly.description
        alert.anomaly_id = anomaly.id
    alert.risk_score = float(employee.current_risk_score or 0.0)
    alert.priority = priority_for(alert.severity, alert.risk_score)
    anomaly.alert_generated = True
    db.flush()
    return alert


def alert_from_anomaly(db: Session, anomaly: Anomaly, employee: Employee) -> Optional[Alert]:
    """Raise an alert for a qualifying anomaly, or roll it into an open one."""
    if anomaly.severity not in ALERT_MIN_SEVERITY or anomaly.alert_generated:
        return None

    if db.execute(select(Alert).where(Alert.anomaly_id == anomaly.id)).scalar_one_or_none():
        return None

    open_alert = _find_open_alert(db, anomaly)
    if open_alert is not None:
        _roll_up(db, open_alert, anomaly, employee)
        return None

    alert = Alert(
        employee_id=employee.id,
        anomaly_id=anomaly.id,
        title=anomaly.title,
        description=anomaly.description,
        severity=anomaly.severity,
        status=AlertStatus.NEW.value,
        category=anomaly.category,
        risk_score=float(employee.current_risk_score or 0.0),
        priority=priority_for(anomaly.severity, float(employee.current_risk_score or 0.0)),
        triggered_at=anomaly.detected_at or datetime.now(timezone.utc),
        occurrence_count=1,
        first_seen_at=anomaly.occurred_at,
        last_seen_at=anomaly.detected_at,
    )
    db.add(alert)
    anomaly.alert_generated = True
    db.flush()
    notifications.notify_threat_alert(db, alert, employee.full_name)
    return alert


def generate_alerts(db: Session, anomalies: List[Anomaly]) -> List[Alert]:
    """Bulk alert generation for a detection run."""
    if not anomalies:
        return []
    employee_ids = {a.employee_id for a in anomalies}
    employees: Dict[int, Employee] = {
        e.id: e
        for e in db.execute(select(Employee).where(Employee.id.in_(employee_ids))).scalars().all()
    }
    created: List[Alert] = []
    for anomaly in anomalies:
        employee = employees.get(anomaly.employee_id)
        if not employee:
            continue
        alert = alert_from_anomaly(db, anomaly, employee)
        if alert:
            created.append(alert)
    db.flush()
    return created


def acknowledge(db: Session, alert: Alert, user_id: int) -> Alert:
    alert.status = AlertStatus.ACKNOWLEDGED.value
    alert.acknowledged_by_id = user_id
    alert.acknowledged_at = datetime.now(timezone.utc)
    db.flush()
    return alert


def close(db: Session, alert: Alert, note: Optional[str], dismissed: bool = False) -> Alert:
    alert.status = AlertStatus.DISMISSED.value if dismissed else AlertStatus.CLOSED.value
    alert.resolution_note = note
    alert.closed_at = datetime.now(timezone.utc)
    db.flush()
    return alert


def mttd_seconds(alert: Alert, anomaly: Optional[Anomaly]) -> Optional[float]:
    """Mean-time-to-detect input: occurrence -> detection."""
    if not anomaly:
        return None
    return (
        anomaly.detected_at.replace(tzinfo=timezone.utc) - anomaly.occurred_at.replace(tzinfo=timezone.utc)
    ).total_seconds() if anomaly.detected_at and anomaly.occurred_at else None
