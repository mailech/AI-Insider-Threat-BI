"""Anomaly detection: scans employees for behavioral deviations and raises alerts."""

import uuid
from datetime import timedelta
from typing import Any

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models.activity import ActivityLog, ActivityType
from app.models.alert import Alert, AlertStatus
from app.models.anomaly import Anomaly, AnomalyCategory, AnomalyStatus, Severity
from app.models.behavior import BehaviorProfile
from app.models.employee import Employee
from app.models.notification import Notification
from app.services import notification_service

# ---------------------------------------------------------------------------
# Severity thresholds: deviation % -> Severity
# ---------------------------------------------------------------------------
_SEVERITY_THRESHOLDS: list[tuple[float, Severity]] = [
    (200.0, Severity.CRITICAL),
    (100.0, Severity.HIGH),
    (50.0, Severity.MEDIUM),
    (20.0, Severity.LOW),
    (0.0, Severity.INFORMATIONAL),
]


def _deviation_percent(baseline: float, observed: float) -> float:
    """Return deviation as a positive percentage above baseline."""
    if baseline > 0:
        return ((observed - baseline) / baseline) * 100.0
    return 100.0 if observed > 0 else 0.0


def _severity_for_deviation(deviation_pct: float) -> Severity:
    for threshold, severity in _SEVERITY_THRESHOLDS:
        if deviation_pct >= threshold:
            return severity
    return Severity.INFORMATIONAL


# ---------------------------------------------------------------------------
# Internal helpers: one checker per anomaly category
# ---------------------------------------------------------------------------

def _check_unusual_login_time(
    profile: BehaviorProfile,
    logs: list[ActivityLog],
    lookback_days: int,
) -> tuple[float, float, str] | None:
    """Return (baseline_value, observed_value, description) or None."""
    logins = [log for log in logs if log.activity_type == ActivityType.LOGIN]
    after_hours = [
        log
        for log in logins
        if not (profile.typical_login_hour_start <= log.timestamp.hour < profile.typical_login_hour_end)
    ]
    baseline = profile.typical_daily_logins * 0.1  # expect ~10 % of logins outside hours
    observed = len(after_hours) / max(lookback_days, 1)
    if observed <= baseline * 1.2:
        return None
    description = (
        f"Employee logged in outside typical hours "
        f"({profile.typical_login_hour_start:02d}:00–{profile.typical_login_hour_end:02d}:00) "
        f"{len(after_hours)} time(s) in the last {lookback_days} days "
        f"(observed {observed:.2f}/day vs baseline {baseline:.2f}/day)."
    )
    return baseline, observed, description


def _check_abnormal_data_download(
    profile: BehaviorProfile,
    logs: list[ActivityLog],
    lookback_days: int,
) -> tuple[float, float, str] | None:
    downloads = [log for log in logs if log.activity_type == ActivityType.FILE_DOWNLOAD]
    baseline = profile.typical_daily_downloads
    observed = len(downloads) / max(lookback_days, 1)
    if observed <= baseline * 1.2:
        return None
    description = (
        f"File-download rate of {observed:.2f}/day exceeds the employee's baseline "
        f"of {baseline:.2f}/day over the last {lookback_days} days."
    )
    return baseline, observed, description


def _check_unauthorized_access_attempts(
    profile: BehaviorProfile,
    logs: list[ActivityLog],
    lookback_days: int,
) -> tuple[float, float, str] | None:
    privilege_changes = [
        log for log in logs if log.activity_type == ActivityType.PRIVILEGE_CHANGE
    ]
    # Baseline: near zero; even 1+ per day is notable
    baseline = 0.05  # effectively never
    observed = len(privilege_changes) / max(lookback_days, 1)
    if observed <= baseline:
        return None
    description = (
        f"Detected {len(privilege_changes)} unauthorized access / privilege-change event(s) "
        f"in the last {lookback_days} days (observed {observed:.3f}/day vs baseline {baseline:.3f}/day)."
    )
    return baseline, observed, description


def _check_excessive_file_transfers(
    profile: BehaviorProfile,
    logs: list[ActivityLog],
    lookback_days: int,
) -> tuple[float, float, str] | None:
    transfers = [
        log
        for log in logs
        if log.activity_type in (ActivityType.DATA_TRANSFER, ActivityType.FILE_UPLOAD)
    ]
    baseline = profile.typical_daily_transfers
    observed = len(transfers) / max(lookback_days, 1)
    if observed <= baseline * 1.2:
        return None
    description = (
        f"File-transfer rate of {observed:.2f}/day exceeds baseline "
        f"of {baseline:.2f}/day over the last {lookback_days} days."
    )
    return baseline, observed, description


def _check_suspicious_device_usage(
    profile: BehaviorProfile,
    logs: list[ActivityLog],
    lookback_days: int,
) -> tuple[float, float, str] | None:
    device_logs = [log for log in logs if log.activity_type == ActivityType.DEVICE_USAGE]
    unique_devices = {log.device for log in logs}
    baseline = float(profile.typical_device_count)
    observed = float(len(unique_devices))
    if observed <= baseline * 1.5:
        return None
    description = (
        f"Activity from {len(unique_devices)} unique device(s) detected; "
        f"baseline is {profile.typical_device_count} device(s). "
        f"({len(device_logs)} device-usage events in the last {lookback_days} days.)"
    )
    return baseline, observed, description


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

_CHECKS: list[tuple[AnomalyCategory, Any]] = [
    (AnomalyCategory.UNUSUAL_LOGIN_TIME, _check_unusual_login_time),
    (AnomalyCategory.ABNORMAL_DATA_DOWNLOAD, _check_abnormal_data_download),
    (AnomalyCategory.UNAUTHORIZED_ACCESS_ATTEMPTS, _check_unauthorized_access_attempts),
    (AnomalyCategory.EXCESSIVE_FILE_TRANSFERS, _check_excessive_file_transfers),
    (AnomalyCategory.SUSPICIOUS_DEVICE_USAGE, _check_suspicious_device_usage),
]


def scan_employee(
    db: Session,
    employee_id: uuid.UUID,
    *,
    lookback_days: int = 30,
) -> dict[str, Any]:
    """Run all anomaly checks for a single employee.

    Returns a dict with keys:
      - employee_id
      - anomalies_created (int)
      - alerts_created (int)
    """
    employee = db.get(Employee, employee_id)
    if employee is None:
        return {"employee_id": employee_id, "anomalies_created": 0, "alerts_created": 0}

    profile = db.scalars(
        select(BehaviorProfile).where(BehaviorProfile.employee_id == employee_id)
    ).first()
    if profile is None:
        # No baseline yet – cannot evaluate deviations
        return {"employee_id": employee_id, "anomalies_created": 0, "alerts_created": 0}

    since = utcnow() - timedelta(days=lookback_days)
    logs: list[ActivityLog] = list(
        db.scalars(
            select(ActivityLog).where(
                ActivityLog.employee_id == employee_id,
                ActivityLog.timestamp >= since,
            )
        )
    )

    now = utcnow()
    anomalies_created = 0
    alerts_created = 0

    for category, check_fn in _CHECKS:
        result = check_fn(profile, logs, lookback_days)
        if result is None:
            continue

        baseline_val, observed_val, description = result
        deviation_pct = _deviation_percent(baseline_val, observed_val)
        severity = _severity_for_deviation(deviation_pct)

        anomaly = Anomaly(
            employee_id=employee_id,
            detected_at=now,
            category=category,
            severity=severity,
            status=AnomalyStatus.NEW,
            description=description,
            baseline_deviation=round(deviation_pct, 2),
            observed_value=round(observed_val, 4),
            baseline_value=round(baseline_val, 4),
        )
        db.add(anomaly)
        db.flush()  # populate anomaly.id before linking to Alert
        anomalies_created += 1

        # Raise alert for High / Critical anomalies
        if severity in (Severity.HIGH, Severity.CRITICAL):
            alert_title = f"[{severity}] {category} – {employee.full_name}"
            alert = Alert(
                employee_id=employee_id,
                anomaly_id=anomaly.id,
                raised_at=now,
                title=alert_title,
                description=description,
                severity=severity,
                status=AlertStatus.OPEN,
            )
            db.add(alert)
            db.flush()
            alerts_created += 1

            # Notify
            notification_service.create_notification(
                db,
                notification_type="alert",
                severity=severity,
                title=alert_title,
                message=description,
                employee_id=employee_id,
                anomaly_id=anomaly.id,
                alert_id=alert.id,
                commit=False,
            )

    db.commit()
    return {
        "employee_id": employee_id,
        "anomalies_created": anomalies_created,
        "alerts_created": alerts_created,
    }


def scan_all_employees(
    db: Session,
    *,
    lookback_days: int = 30,
) -> dict[str, Any]:
    """Run anomaly detection across every employee.

    Returns a summary dict with:
      - employees_scanned (int)
      - anomalies_created (int)
      - alerts_created (int)
      - results (list of per-employee dicts)
    """
    employees: list[Employee] = list(db.scalars(select(Employee).order_by(Employee.employee_code)))
    total_anomalies = 0
    total_alerts = 0
    results: list[dict[str, Any]] = []

    for employee in employees:
        result = scan_employee(db, employee.id, lookback_days=lookback_days)
        total_anomalies += result["anomalies_created"]
        total_alerts += result["alerts_created"]
        results.append(result)

    return {
        "employees_scanned": len(employees),
        "anomalies_created": total_anomalies,
        "alerts_created": total_alerts,
        "results": results,
    }


def get_anomaly(db: Session, anomaly_id: uuid.UUID) -> Anomaly | None:
    return db.get(Anomaly, anomaly_id)


def list_anomalies(
    db: Session,
    *,
    employee_id: uuid.UUID | None = None,
    severity: Severity | None = None,
    status: AnomalyStatus | None = None,
    category: AnomalyCategory | None = None,
    limit: int = 100,
    offset: int = 0,
) -> list[Anomaly]:
    query = select(Anomaly).order_by(Anomaly.detected_at.desc())
    if employee_id is not None:
        query = query.where(Anomaly.employee_id == employee_id)
    if severity is not None:
        query = query.where(Anomaly.severity == severity)
    if status is not None:
        query = query.where(Anomaly.status == status)
    if category is not None:
        query = query.where(Anomaly.category == category)
    query = query.offset(offset).limit(limit)
    return list(db.scalars(query))


def update_anomaly_status(
    db: Session,
    anomaly_id: uuid.UUID,
    new_status: AnomalyStatus,
) -> Anomaly | None:
    anomaly = db.get(Anomaly, anomaly_id)
    if anomaly is None:
        return None
    anomaly.status = new_status
    db.commit()
    db.refresh(anomaly)
    return anomaly
