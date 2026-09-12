"""Insider Risk Scoring Engine (module 6).

Implements the weighted scoring model defined in the specification:

    Insider Risk Score =
        Behavioural Anomalies        (35%)
      + Privilege Misuse Indicators  (25%)
      + Data Access Violations       (20%)
      + Access Pattern Deviations    (10%)
      + Historical Security Events   (10%)

Each component is first normalised to 0-100, then weighted and summed, so the
final score is directly comparable across employees and over time.
"""
from __future__ import annotations

import json
import math
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.ml import features as F
from app.models.activity import ActivityEvent
from app.models.anomaly import Anomaly
from app.models.employee import Employee
from app.models.enums import ActivityType, AnomalyCategory, RiskCategory, Severity
from app.models.incident import Incident
from app.models.risk import RiskScore

WEIGHTS: Dict[str, float] = {
    "behavioral_anomalies": 0.35,
    "privilege_misuse": 0.25,
    "data_access_violations": 0.20,
    "access_pattern_deviations": 0.10,
    "historical_security_events": 0.10,
}

SEVERITY_WEIGHT = {
    Severity.INFORMATIONAL.value: 0.2,
    Severity.LOW.value: 0.45,
    Severity.MEDIUM.value: 0.7,
    Severity.HIGH.value: 0.9,
    Severity.CRITICAL.value: 1.0,
}

BEHAVIORAL_CATEGORIES = {
    AnomalyCategory.BEHAVIORAL_DEVIATION.value,
    AnomalyCategory.UNUSUAL_LOGIN_TIME.value,
    AnomalyCategory.PEER_GROUP_OUTLIER.value,
    AnomalyCategory.INSIDER_RISK_INDICATOR.value,
}
PRIVILEGE_CATEGORIES = {
    AnomalyCategory.PRIVILEGE_ABUSE.value,
    AnomalyCategory.UNAUTHORIZED_ACCESS_ATTEMPT.value,
}
DATA_CATEGORIES = {
    AnomalyCategory.DATA_EXFILTRATION.value,
    AnomalyCategory.ABNORMAL_DATA_DOWNLOAD.value,
    AnomalyCategory.EXCESSIVE_FILE_TRANSFER.value,
    AnomalyCategory.SUSPICIOUS_DEVICE_USAGE.value,
}
ACCESS_CATEGORIES = {
    AnomalyCategory.ACCESS_PATTERN_DEVIATION.value,
}


def categorise(score: float) -> RiskCategory:
    if score >= settings.RISK_CRITICAL_THRESHOLD:
        return RiskCategory.CRITICAL
    if score >= settings.RISK_HIGH_THRESHOLD:
        return RiskCategory.HIGH
    if score >= settings.RISK_MEDIUM_THRESHOLD:
        return RiskCategory.MEDIUM
    return RiskCategory.LOW


def _decay(days_old: float, half_life: float = 14.0) -> float:
    """Recent evidence counts more than old evidence."""
    return 0.5 ** (max(days_old, 0.0) / half_life)


def _saturate(total: float, k: float = 45.0) -> float:
    """Squash an unbounded evidence total into 0-100 without a hard ceiling."""
    return 100.0 * (1.0 - math.exp(-total / k))


def _anomaly_component(anomalies: List[Anomaly], categories: set, now: datetime) -> tuple[float, List[Dict[str, Any]]]:
    """Weighted, time-decayed evidence total for one anomaly family."""
    total = 0.0
    factors: List[Dict[str, Any]] = []
    for a in anomalies:
        if a.category not in categories or a.is_false_positive:
            continue
        age_days = (now - F.as_utc(a.detected_at)).total_seconds() / 86400.0
        contribution = (
            (a.score / 100.0)
            * SEVERITY_WEIGHT.get(a.severity, 0.5)
            * max(a.confidence, 0.3)
            * _decay(age_days)
            * 30.0
        )
        total += contribution
        factors.append(
            {
                "anomaly_id": a.id,
                "category": a.category,
                "severity": a.severity,
                "title": a.title,
                "score": round(a.score, 1),
                "detected_at": F.as_utc(a.detected_at).isoformat(),
                "contribution": round(contribution, 2),
            }
        )
    factors.sort(key=lambda f: f["contribution"], reverse=True)
    return _saturate(total), factors[:8]


def compute_risk(db: Session, employee: Employee, window_days: int = 30) -> RiskScore:
    """Compute, persist and return the current insider risk score for an employee."""
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=window_days)

    anomalies = list(
        db.execute(
            select(Anomaly).where(Anomaly.employee_id == employee.id, Anomaly.detected_at >= since)
        ).scalars().all()
    )

    behavioral, behavioral_factors = _anomaly_component(anomalies, BEHAVIORAL_CATEGORIES, now)
    privilege, privilege_factors = _anomaly_component(anomalies, PRIVILEGE_CATEGORIES, now)
    data_access, data_factors = _anomaly_component(anomalies, DATA_CATEGORIES, now)
    access_dev, access_factors = _anomaly_component(anomalies, ACCESS_CATEGORIES, now)

    # Privilege misuse also accounts for raw privilege events and account posture.
    priv_events = int(
        db.execute(
            select(func.count(ActivityEvent.id)).where(
                ActivityEvent.employee_id == employee.id,
                ActivityEvent.event_time >= since,
                ActivityEvent.activity_type.in_(
                    [ActivityType.PRIVILEGE_CHANGE.value, ActivityType.UNAUTHORIZED_ACCESS.value]
                ),
            )
        ).scalar_one()
    )
    posture = 0.0
    if priv_events:
        posture += min(35.0, priv_events * 6.0)
    if employee.is_privileged:
        posture += 8.0
    if employee.employment_status in {"notice_period", "terminated"}:
        posture += 12.0
    if employee.on_watchlist:
        posture += 10.0
    privilege = min(100.0, privilege + posture)
    if priv_events:
        privilege_factors.append(
            {"category": "privilege_events", "title": f"{priv_events} privilege/denied-access events", "contribution": round(min(35.0, priv_events * 6.0), 2)}
        )
    if employee.employment_status in {"notice_period", "terminated"}:
        privilege_factors.append(
            {"category": "hr_context", "title": f"Employment status: {employee.employment_status}", "contribution": 12.0}
        )

    # Data access violations also weigh raw exfiltration-shaped activity.
    ext_bytes = float(
        db.execute(
            select(func.coalesce(func.sum(ActivityEvent.bytes_transferred), 0.0)).where(
                ActivityEvent.employee_id == employee.id,
                ActivityEvent.event_time >= since,
                ActivityEvent.is_external.is_(True),
            )
        ).scalar_one()
    )
    usb_bytes = float(
        db.execute(
            select(func.coalesce(func.sum(ActivityEvent.bytes_transferred), 0.0)).where(
                ActivityEvent.employee_id == employee.id,
                ActivityEvent.event_time >= since,
                ActivityEvent.is_removable_media.is_(True),
            )
        ).scalar_one()
    )
    volume_mb = (ext_bytes + usb_bytes) / F.MB
    if volume_mb > 0:
        bump = min(30.0, volume_mb / 40.0)
        data_access = min(100.0, data_access + bump)
        data_factors.append(
            {"category": "data_movement", "title": f"{volume_mb:.0f} MB moved externally / to removable media", "contribution": round(bump, 2)}
        )

    # Historical security events: prior confirmed incidents, decayed.
    incidents = list(
        db.execute(
            select(Incident).where(
                Incident.employee_id == employee.id,
                Incident.opened_at >= now - timedelta(days=365),
            )
        ).scalars().all()
    )
    hist_total = 0.0
    hist_factors: List[Dict[str, Any]] = []
    for inc in incidents:
        if inc.outcome == "false_positive":
            continue
        age = (now - F.as_utc(inc.opened_at)).total_seconds() / 86400.0
        weight = SEVERITY_WEIGHT.get(inc.severity, 0.6) * (1.4 if inc.outcome == "confirmed_threat" else 1.0)
        contribution = weight * _decay(age, half_life=90.0) * 25.0
        hist_total += contribution
        hist_factors.append(
            {
                "incident_id": inc.id,
                "reference": inc.reference,
                "severity": inc.severity,
                "title": inc.title,
                "contribution": round(contribution, 2),
            }
        )
    historical = _saturate(hist_total, k=35.0)

    raw = {
        "behavioral_anomalies": round(behavioral, 2),
        "privilege_misuse": round(privilege, 2),
        "data_access_violations": round(data_access, 2),
        "access_pattern_deviations": round(access_dev, 2),
        "historical_security_events": round(historical, 2),
    }
    weighted = {key: round(value * WEIGHTS[key], 3) for key, value in raw.items()}
    score = round(min(100.0, sum(weighted.values())), 2)

    previous = db.execute(
        select(RiskScore)
        .where(RiskScore.employee_id == employee.id)
        .order_by(RiskScore.computed_at.desc())
        .limit(1)
    ).scalar_one_or_none()
    previous_score = float(previous.score) if previous else 0.0
    delta = score - previous_score
    trend = "rising" if delta > 3 else ("falling" if delta < -3 else "stable")

    factors = (
        [dict(f, component="behavioral_anomalies") for f in behavioral_factors]
        + [dict(f, component="privilege_misuse") for f in privilege_factors]
        + [dict(f, component="data_access_violations") for f in data_factors]
        + [dict(f, component="access_pattern_deviations") for f in access_factors]
        + [dict(f, component="historical_security_events") for f in hist_factors]
    )
    factors.sort(key=lambda f: f.get("contribution", 0), reverse=True)

    category = categorise(score)
    record = RiskScore(
        employee_id=employee.id,
        score=score,
        category=category.value,
        previous_score=previous_score,
        trend=trend,
        behavioral_anomaly_component=weighted["behavioral_anomalies"],
        privilege_misuse_component=weighted["privilege_misuse"],
        data_access_component=weighted["data_access_violations"],
        access_deviation_component=weighted["access_pattern_deviations"],
        historical_events_component=weighted["historical_security_events"],
        raw_components=json.dumps(raw),
        contributing_factors=json.dumps(factors[:15], default=str),
        window_days=window_days,
        computed_at=now,
    )
    db.add(record)

    employee.current_risk_score = score
    employee.current_risk_category = category.value
    db.flush()
    return record


def recompute_all(
    db: Session,
    employee_ids: Optional[List[int]] = None,
    window_days: int = 30,
) -> List[RiskScore]:
    stmt = select(Employee)
    if employee_ids:
        stmt = stmt.where(Employee.id.in_(employee_ids))
    employees = list(db.execute(stmt).scalars().all())
    return [compute_risk(db, emp, window_days) for emp in employees]


def risk_distribution(db: Session) -> Dict[str, int]:
    rows = db.execute(
        select(Employee.current_risk_category, func.count(Employee.id)).group_by(Employee.current_risk_category)
    ).all()
    dist = {c.value: 0 for c in RiskCategory}
    for category, count in rows:
        if category in dist:
            dist[category] = int(count)
    return dist


def organisational_risk(db: Session) -> Dict[str, Any]:
    """Aggregate posture used by the security manager dashboard (module 10)."""
    dist = risk_distribution(db)
    total = sum(dist.values()) or 1
    avg = float(
        db.execute(select(func.coalesce(func.avg(Employee.current_risk_score), 0.0))).scalar_one()
    )
    high_share = (dist["high"] + dist["critical"]) / total * 100.0
    if high_share >= 15 or dist["critical"] >= 5:
        posture = "elevated"
    elif high_share >= 6:
        posture = "guarded"
    else:
        posture = "stable"
    return {
        "posture": posture,
        "average_risk_score": round(avg, 2),
        "employees_assessed": total,
        "high_and_critical": dist["high"] + dist["critical"],
        "high_risk_percentage": round(high_share, 2),
        "distribution": dist,
    }


def explain(record: RiskScore) -> Dict[str, Any]:
    """Human-readable breakdown of a stored score, used by the API detail view."""
    try:
        raw = json.loads(record.raw_components) if record.raw_components else {}
    except json.JSONDecodeError:
        raw = {}
    try:
        factors = json.loads(record.contributing_factors) if record.contributing_factors else []
    except json.JSONDecodeError:
        factors = []
    return {"raw_components": raw, "contributing_factors": factors, "weights": WEIGHTS}
