"""Dashboard and analytics aggregation (module 10).

One builder per role: Security Analyst, SOC Engineer, Security Manager, Admin.
"""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import Integer, func, select
from sqlalchemy.orm import Session

from app.ml import features as F
from app.ml import risk as risk_engine
from app.models.activity import ActivityEvent
from app.models.alert import Alert
from app.models.anomaly import Anomaly
from app.models.audit import AuditLog
from app.models.behavior import BehaviorBaseline
from app.models.employee import Department, Employee
from app.models.enums import AlertStatus, IncidentStatus, Severity
from app.models.incident import Incident
from app.models.risk import RiskScore
from app.models.user import User


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _count(db: Session, model, *conditions) -> int:
    stmt = select(func.count(model.id))
    if conditions:
        stmt = stmt.where(*conditions)
    return int(db.execute(stmt).scalar_one())


def kpi(label: str, value: float, unit: Optional[str] = None, delta: Optional[float] = None, trend: Optional[str] = None) -> Dict[str, Any]:
    return {"label": label, "value": round(float(value), 2), "unit": unit, "delta": delta, "trend": trend}


def alert_row(db: Session, alert: Alert) -> Dict[str, Any]:
    employee = alert.employee
    return {
        "id": alert.id,
        "title": alert.title,
        "severity": alert.severity,
        "status": alert.status,
        "priority": alert.priority,
        "category": alert.category,
        "occurrence_count": alert.occurrence_count or 1,
        "risk_score": round(float(alert.risk_score), 2),
        "employee_id": alert.employee_id,
        "employee_name": employee.full_name if employee else None,
        "employee_code": employee.employee_code if employee else None,
        "department": employee.department.name if employee and employee.department else None,
        "triggered_at": F.as_utc(alert.triggered_at).isoformat(),
        "assigned_to_id": alert.assigned_to_id,
    }


def incident_row(incident: Incident) -> Dict[str, Any]:
    employee = incident.employee
    return {
        "id": incident.id,
        "reference": incident.reference,
        "title": incident.title,
        "severity": incident.severity,
        "status": incident.status,
        "risk_score": round(float(incident.risk_score), 2),
        "employee_id": incident.employee_id,
        "employee_name": employee.full_name if employee else None,
        "department": employee.department.name if employee and employee.department else None,
        "assigned_to_id": incident.assigned_to_id,
        "assignee_name": incident.assignee.full_name if incident.assignee else None,
        "opened_at": F.as_utc(incident.opened_at).isoformat(),
        "escalated": incident.escalated,
        "age_hours": round((_now() - F.as_utc(incident.opened_at)).total_seconds() / 3600.0, 1),
    }


def employee_risk_row(employee: Employee) -> Dict[str, Any]:
    return {
        "employee_id": employee.id,
        "employee_code": employee.employee_code,
        "full_name": employee.full_name,
        "department": employee.department.name if employee.department else None,
        "designation": employee.designation,
        "risk_score": round(float(employee.current_risk_score), 2),
        "risk_category": employee.current_risk_category,
        "is_privileged": employee.is_privileged,
        "on_watchlist": employee.on_watchlist,
        "employment_status": employee.employment_status,
    }


def top_risky(db: Session, limit: int = 10) -> List[Dict[str, Any]]:
    rows = db.execute(
        select(Employee).order_by(Employee.current_risk_score.desc()).limit(limit)
    ).scalars().all()
    return [employee_risk_row(e) for e in rows]


def anomalies_by_category(db: Session, days: int = 30) -> Dict[str, int]:
    since = _now() - timedelta(days=days)
    rows = db.execute(
        select(Anomaly.category, func.count(Anomaly.id))
        .where(Anomaly.detected_at >= since)
        .group_by(Anomaly.category)
        .order_by(func.count(Anomaly.id).desc())
    ).all()
    return {r[0]: int(r[1]) for r in rows}


def severity_breakdown(db: Session, days: int = 30) -> Dict[str, int]:
    since = _now() - timedelta(days=days)
    rows = db.execute(
        select(Alert.severity, func.count(Alert.id))
        .where(Alert.triggered_at >= since)
        .group_by(Alert.severity)
    ).all()
    out = {s.value: 0 for s in Severity}
    for severity, count in rows:
        out[severity] = int(count)
    return out


def incident_summary(db: Session) -> Dict[str, int]:
    rows = db.execute(
        select(Incident.status, func.count(Incident.id)).group_by(Incident.status)
    ).all()
    summary = {s.value: 0 for s in IncidentStatus}
    for status, count in rows:
        summary[status] = int(count)
    summary["total"] = sum(int(c) for _, c in rows)
    return summary


def events_timeline(db: Session, days: int = 14) -> List[Dict[str, Any]]:
    """Daily event / anomaly / alert counts for the SOC activity chart."""
    since = _now() - timedelta(days=days)
    buckets: Dict[str, Dict[str, Any]] = {}
    for offset in range(days, -1, -1):
        key = (_now() - timedelta(days=offset)).date().isoformat()
        buckets[key] = {"date": key, "events": 0, "anomalies": 0, "alerts": 0}

    for time_col, model, field in (
        (ActivityEvent.event_time, ActivityEvent, "events"),
        (Anomaly.detected_at, Anomaly, "anomalies"),
        (Alert.triggered_at, Alert, "alerts"),
    ):
        # Timestamps are bucketed in Python so the query stays portable
        # across PostgreSQL and SQLite.
        for (ts,) in db.execute(select(time_col).where(time_col >= since)).all():
            key = F.as_utc(ts).date().isoformat()
            if key in buckets:
                buckets[key][field] += 1
    return list(buckets.values())


def security_metrics(db: Session, days: int = 30) -> Dict[str, Any]:
    """MTTD / MTTI / MTTR plus detection quality (performance metrics section)."""
    since = _now() - timedelta(days=days)

    detect_deltas: List[float] = []
    for occurred, detected in db.execute(
        select(Anomaly.occurred_at, Anomaly.detected_at).where(Anomaly.detected_at >= since)
    ).all():
        if occurred and detected:
            delta = (F.as_utc(detected) - F.as_utc(occurred)).total_seconds()
            if delta >= 0:
                detect_deltas.append(delta)

    investigate_deltas: List[float] = []
    respond_deltas: List[float] = []
    for opened, first_response, resolved in db.execute(
        select(Incident.opened_at, Incident.first_response_at, Incident.resolved_at).where(
            Incident.opened_at >= since
        )
    ).all():
        if opened and first_response:
            investigate_deltas.append((F.as_utc(first_response) - F.as_utc(opened)).total_seconds())
        if opened and resolved:
            respond_deltas.append((F.as_utc(resolved) - F.as_utc(opened)).total_seconds())

    def mean_hours(values: List[float]) -> float:
        return round(sum(values) / len(values) / 3600.0, 2) if values else 0.0

    total_anomalies = _count(db, Anomaly, Anomaly.detected_at >= since)
    false_positives = _count(
        db, Anomaly, Anomaly.detected_at >= since, Anomaly.is_false_positive.is_(True)
    )
    reviewed = _count(db, Anomaly, Anomaly.detected_at >= since, Anomaly.reviewed.is_(True))
    confirmed = _count(
        db, Incident, Incident.opened_at >= since, Incident.outcome == "confirmed_threat"
    )
    closed_incidents = _count(
        db,
        Incident,
        Incident.opened_at >= since,
        Incident.status.in_([IncidentStatus.RESOLVED.value, IncidentStatus.CLOSED.value, IncidentStatus.FALSE_POSITIVE.value]),
    )
    fp_rate = round(false_positives / total_anomalies * 100.0, 2) if total_anomalies else 0.0
    precision = round((1 - false_positives / reviewed) * 100.0, 2) if reviewed else 0.0

    return {
        "mttd_hours": mean_hours(detect_deltas),
        "mtti_hours": mean_hours(investigate_deltas),
        "mttr_hours": mean_hours(respond_deltas),
        "false_positive_rate": fp_rate,
        "detection_precision": precision,
        "anomalies_detected": total_anomalies,
        "anomalies_reviewed": reviewed,
        "confirmed_threats": confirmed,
        "incidents_closed": closed_incidents,
        "window_days": days,
    }


def analyst_dashboard(db: Session, user: User) -> Dict[str, Any]:
    since_24h = _now() - timedelta(hours=24)
    open_alerts = list(
        db.execute(
            select(Alert)
            .where(Alert.status.in_([AlertStatus.NEW.value, AlertStatus.ACKNOWLEDGED.value, AlertStatus.IN_REVIEW.value]))
            .order_by(Alert.priority, Alert.triggered_at.desc())
            .limit(20)
        ).scalars().all()
    )
    queue = list(
        db.execute(
            select(Incident)
            .where(
                Incident.status.notin_([IncidentStatus.CLOSED.value, IncidentStatus.RESOLVED.value]),
            )
            .order_by(Incident.severity.desc(), Incident.opened_at.desc())
            .limit(15)
        ).scalars().all()
    )
    mine = _count(db, Incident, Incident.assigned_to_id == user.id, Incident.status.notin_([IncidentStatus.CLOSED.value]))
    metrics = security_metrics(db)

    return {
        "kpis": [
            kpi("Open alerts", _count(db, Alert, Alert.status == AlertStatus.NEW.value)),
            kpi("Critical alerts (24h)", _count(db, Alert, Alert.severity == Severity.CRITICAL.value, Alert.triggered_at >= since_24h)),
            kpi("My open investigations", mine),
            kpi("High risk employees", _count(db, Employee, Employee.current_risk_category.in_(["high", "critical"]))),
            kpi("MTTD", metrics["mttd_hours"], unit="hours"),
        ],
        "open_alerts": [alert_row(db, a) for a in open_alerts],
        "top_risky_employees": top_risky(db, 10),
        "investigation_queue": [incident_row(i) for i in queue],
        "incident_summary": incident_summary(db),
        "anomalies_by_category": anomalies_by_category(db),
    }


def soc_dashboard(db: Session, user: User) -> Dict[str, Any]:
    since_24h = _now() - timedelta(hours=24)
    recent_anomalies = list(
        db.execute(select(Anomaly).order_by(Anomaly.detected_at.desc()).limit(25)).scalars().all()
    )
    active = list(
        db.execute(
            select(Incident)
            .where(Incident.status.in_([IncidentStatus.INVESTIGATING.value, IncidentStatus.ESCALATED.value, IncidentStatus.OPEN.value]))
            .order_by(Incident.opened_at.desc())
            .limit(15)
        ).scalars().all()
    )
    metrics = security_metrics(db)
    watchlist = _count(db, Employee, Employee.on_watchlist.is_(True))

    return {
        "kpis": [
            kpi("Events (24h)", _count(db, ActivityEvent, ActivityEvent.event_time >= since_24h)),
            kpi("Anomalies (24h)", _count(db, Anomaly, Anomaly.detected_at >= since_24h)),
            kpi("Active investigations", len(active)),
            kpi("Watchlist employees", watchlist),
            kpi("False positive rate", metrics["false_positive_rate"], unit="%"),
        ],
        "security_events_timeline": events_timeline(db, days=14),
        "behavioral_anomalies": [
            {
                "id": a.id,
                "employee_id": a.employee_id,
                "employee_name": a.employee.full_name if a.employee else None,
                "category": a.category,
                "detection_method": a.detection_method,
                "severity": a.severity,
                "title": a.title,
                "score": round(float(a.score), 2),
                "deviation_sigma": round(float(a.deviation_sigma), 2),
                "detected_at": F.as_utc(a.detected_at).isoformat(),
            }
            for a in recent_anomalies
        ],
        "active_investigations": [incident_row(i) for i in active],
        "threat_intelligence": {
            "top_categories": anomalies_by_category(db, days=7),
            "top_devices": [
                {"device_id": r[0], "events": int(r[1])}
                for r in db.execute(
                    select(ActivityEvent.device_id, func.count(ActivityEvent.id))
                    .where(ActivityEvent.event_time >= since_24h, ActivityEvent.device_id.is_not(None))
                    .group_by(ActivityEvent.device_id)
                    .order_by(func.count(ActivityEvent.id).desc())
                    .limit(8)
                ).all()
            ],
            "metrics": metrics,
        },
        "severity_breakdown": severity_breakdown(db),
    }


def department_risk(db: Session) -> List[Dict[str, Any]]:
    rows = db.execute(
        select(
            Department.id,
            Department.name,
            func.count(Employee.id),
            func.coalesce(func.avg(Employee.current_risk_score), 0.0),
            func.coalesce(func.max(Employee.current_risk_score), 0.0),
        )
        .join(Employee, Employee.department_id == Department.id, isouter=True)
        .group_by(Department.id, Department.name)
        .order_by(func.coalesce(func.avg(Employee.current_risk_score), 0.0).desc())
    ).all()
    out = []
    for dept_id, name, headcount, avg_score, max_score in rows:
        high = _count(
            db,
            Employee,
            Employee.department_id == dept_id,
            Employee.current_risk_category.in_(["high", "critical"]),
        )
        out.append(
            {
                "department_id": dept_id,
                "department": name,
                "headcount": int(headcount),
                "average_risk": round(float(avg_score), 2),
                "max_risk": round(float(max_score), 2),
                "high_risk_employees": high,
            }
        )
    return out


def risk_trends(db: Session, days: int = 30) -> List[Dict[str, Any]]:
    """Organisation-wide average risk per day."""
    since = _now() - timedelta(days=days)
    per_day: Dict[str, List[float]] = {}
    for score, computed_at in db.execute(
        select(RiskScore.score, RiskScore.computed_at).where(RiskScore.computed_at >= since)
    ).all():
        key = F.as_utc(computed_at).date().isoformat()
        per_day.setdefault(key, []).append(float(score))
    return [
        {
            "date": key,
            "average_score": round(sum(values) / len(values), 2),
            "max_score": round(max(values), 2),
            "assessments": len(values),
        }
        for key, values in sorted(per_day.items())
    ]


def compliance_metrics(db: Session) -> Dict[str, Any]:
    total_employees = _count(db, Employee) or 1
    monitored = _count(db, BehaviorBaseline)
    reviewed = _count(db, Anomaly, Anomaly.reviewed.is_(True))
    total_anomalies = _count(db, Anomaly) or 1
    closed = _count(db, Incident, Incident.status == IncidentStatus.CLOSED.value)
    total_incidents = _count(db, Incident) or 1
    avg_quality = float(
        db.execute(select(func.coalesce(func.avg(BehaviorBaseline.quality_score), 0.0))).scalar_one()
    )
    return {
        "monitoring_coverage": round(monitored / total_employees * 100.0, 2),
        "baseline_quality": round(avg_quality, 2),
        "anomaly_review_rate": round(reviewed / total_anomalies * 100.0, 2),
        "incident_closure_rate": round(closed / total_incidents * 100.0, 2),
        "audit_events_30d": _count(db, AuditLog, AuditLog.created_at >= _now() - timedelta(days=30)),
        "employees_monitored": monitored,
        "total_employees": total_employees,
    }


def manager_dashboard(db: Session, user: User) -> Dict[str, Any]:
    posture = risk_engine.organisational_risk(db)
    metrics = security_metrics(db)
    since_30 = _now() - timedelta(days=30)
    return {
        "kpis": [
            kpi("Organisational risk", posture["average_risk_score"], trend=posture["posture"]),
            kpi("High & critical employees", posture["high_and_critical"]),
            kpi("Incidents (30d)", _count(db, Incident, Incident.opened_at >= since_30)),
            kpi("Confirmed threats (30d)", metrics["confirmed_threats"]),
            kpi("MTTR", metrics["mttr_hours"], unit="hours"),
        ],
        "organizational_risk_posture": posture,
        "risk_trends": risk_trends(db),
        "department_risk": department_risk(db),
        "insider_threat_summary": {
            "top_risky_employees": top_risky(db, 10),
            "incident_summary": incident_summary(db),
            "anomalies_by_category": anomalies_by_category(db),
            "severity_breakdown": severity_breakdown(db),
            "security_metrics": metrics,
        },
        "compliance_metrics": compliance_metrics(db),
    }


def admin_dashboard(db: Session, user: User) -> Dict[str, Any]:
    from app.services.notifications import manager as ws_manager

    role_rows = db.execute(select(User.role, func.count(User.id)).group_by(User.role)).all()
    since_7 = _now() - timedelta(days=7)
    audit_rows = list(
        db.execute(select(AuditLog).order_by(AuditLog.created_at.desc()).limit(25)).scalars().all()
    )
    total_events = _count(db, ActivityEvent)
    return {
        "kpis": [
            kpi("Platform users", _count(db, User)),
            kpi("Active users", _count(db, User, User.is_active.is_(True))),
            kpi("Employees monitored", _count(db, Employee)),
            kpi("Activity events", total_events),
            kpi("Live socket clients", ws_manager.active),
        ],
        "user_stats": {
            "by_role": {role: int(count) for role, count in role_rows},
            "active": _count(db, User, User.is_active.is_(True)),
            "inactive": _count(db, User, User.is_active.is_(False)),
            "logins_7d": _count(db, User, User.last_login_at >= since_7),
        },
        "platform_analytics": {
            "total_events": total_events,
            "events_7d": _count(db, ActivityEvent, ActivityEvent.event_time >= since_7),
            "anomalies": _count(db, Anomaly),
            "alerts": _count(db, Alert),
            "incidents": _count(db, Incident),
            "baselines": _count(db, BehaviorBaseline),
            "departments": _count(db, Department),
        },
        "system_health": {
            "status": "operational",
            "database": "connected",
            "detection_engine": "ready",
            "websocket_clients": ws_manager.active,
            "checked_at": _now().isoformat(),
        },
        "recent_audit_logs": [
            {
                "id": log.id,
                "action": log.action,
                "actor": log.actor_email,
                "entity_type": log.entity_type,
                "entity_id": log.entity_id,
                "detail": log.detail,
                "ip_address": log.ip_address,
                "created_at": F.as_utc(log.created_at).isoformat(),
            }
            for log in audit_rows
        ],
    }
