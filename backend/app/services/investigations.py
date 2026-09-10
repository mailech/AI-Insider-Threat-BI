"""Threat investigation module (module 7).

Incident creation, automatic threat-timeline generation, activity correlation,
evidence management and the investigation workflow state machine.
"""
from __future__ import annotations

import hashlib
import json
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import Integer, func, select
from sqlalchemy.orm import Session

from app.ml import features as F
from app.models.activity import ActivityEvent
from app.models.alert import Alert
from app.models.anomaly import Anomaly
from app.models.employee import Employee
from app.models.enums import AlertStatus, IncidentStatus, Severity
from app.models.incident import Evidence, Incident, IncidentNote, TimelineEntry
from app.models.risk import RiskScore
from app.models.user import User
from app.services import notifications

SEVERITY_ORDER = ["informational", "low", "medium", "high", "critical"]

# Allowed investigation workflow transitions.
TRANSITIONS: Dict[str, set] = {
    IncidentStatus.OPEN.value: {IncidentStatus.INVESTIGATING.value, IncidentStatus.ESCALATED.value, IncidentStatus.FALSE_POSITIVE.value, IncidentStatus.CLOSED.value},
    IncidentStatus.INVESTIGATING.value: {IncidentStatus.ESCALATED.value, IncidentStatus.CONTAINED.value, IncidentStatus.RESOLVED.value, IncidentStatus.FALSE_POSITIVE.value},
    IncidentStatus.ESCALATED.value: {IncidentStatus.INVESTIGATING.value, IncidentStatus.CONTAINED.value, IncidentStatus.RESOLVED.value},
    IncidentStatus.CONTAINED.value: {IncidentStatus.RESOLVED.value, IncidentStatus.INVESTIGATING.value},
    IncidentStatus.RESOLVED.value: {IncidentStatus.CLOSED.value, IncidentStatus.INVESTIGATING.value},
    IncidentStatus.FALSE_POSITIVE.value: {IncidentStatus.CLOSED.value, IncidentStatus.INVESTIGATING.value},
    IncidentStatus.CLOSED.value: {IncidentStatus.INVESTIGATING.value},
}


def next_reference(db: Session) -> str:
    year = datetime.now(timezone.utc).year
    count = int(db.execute(select(func.count(Incident.id))).scalar_one())
    return f"INC-{year}-{count + 1:05d}"


def max_severity(values: List[str], default: str = "medium") -> str:
    known = [v for v in values if v in SEVERITY_ORDER]
    if not known:
        return default
    return max(known, key=SEVERITY_ORDER.index)


def hash_payload(payload: str) -> str:
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def add_timeline(
    db: Session,
    incident: Incident,
    title: str,
    *,
    entry_type: str = "action",
    description: Optional[str] = None,
    severity: Optional[str] = None,
    occurred_at: Optional[datetime] = None,
    actor_id: Optional[int] = None,
    reference_id: Optional[int] = None,
) -> TimelineEntry:
    entry = TimelineEntry(
        incident_id=incident.id,
        entry_type=entry_type,
        title=title,
        description=description,
        severity=severity,
        occurred_at=occurred_at or datetime.now(timezone.utc),
        actor_id=actor_id,
        reference_id=reference_id,
    )
    db.add(entry)
    return entry


def collect_evidence(
    db: Session,
    incident: Incident,
    *,
    title: str,
    evidence_type: str = "activity_event",
    reference_id: Optional[int] = None,
    description: Optional[str] = None,
    payload: Optional[str] = None,
    user_id: Optional[int] = None,
) -> Evidence:
    body = payload or ""
    item = Evidence(
        incident_id=incident.id,
        evidence_type=evidence_type,
        reference_id=reference_id,
        title=title,
        description=description,
        payload=body,
        hash_value=hash_payload(body) if body else None,
        collected_by_id=user_id,
    )
    db.add(item)
    return item


def create_incident(
    db: Session,
    *,
    employee: Employee,
    title: str,
    summary: Optional[str],
    category: Optional[str],
    severity: str,
    created_by: Optional[User] = None,
    assigned_to_id: Optional[int] = None,
    alert_ids: Optional[List[int]] = None,
    anomaly_ids: Optional[List[int]] = None,
    auto_build_timeline: bool = True,
) -> Incident:
    """Create an incident, link its alerts, and build the initial threat timeline."""
    alerts: List[Alert] = []
    if alert_ids:
        alerts = list(db.execute(select(Alert).where(Alert.id.in_(alert_ids))).scalars().all())
    anomalies: List[Anomaly] = []
    if anomaly_ids:
        anomalies = list(db.execute(select(Anomaly).where(Anomaly.id.in_(anomaly_ids))).scalars().all())

    effective_severity = max_severity(
        [severity] + [a.severity for a in alerts] + [a.severity for a in anomalies], default=severity
    )

    incident = Incident(
        reference=next_reference(db),
        employee_id=employee.id,
        title=title,
        summary=summary,
        category=category or (anomalies[0].category if anomalies else None),
        severity=effective_severity,
        status=IncidentStatus.OPEN.value,
        risk_score=float(employee.current_risk_score or 0.0),
        assigned_to_id=assigned_to_id,
        created_by_id=created_by.id if created_by else None,
        detected_at=min([a.detected_at for a in anomalies], default=datetime.now(timezone.utc)),
    )
    db.add(incident)
    db.flush()

    for alert in alerts:
        alert.incident_id = incident.id
        if alert.status == AlertStatus.NEW.value:
            alert.status = AlertStatus.IN_REVIEW.value

    add_timeline(
        db,
        incident,
        f"Incident {incident.reference} created",
        entry_type="status",
        description=summary,
        severity=effective_severity,
        actor_id=created_by.id if created_by else None,
    )

    if auto_build_timeline:
        build_timeline(db, incident, anomalies=anomalies, alerts=alerts)

    db.flush()
    if assigned_to_id:
        notifications.notify_investigation(
            db, incident, f"You have been assigned to {incident.reference}: {title}", [assigned_to_id]
        )
    return incident


def build_timeline(
    db: Session,
    incident: Incident,
    anomalies: Optional[List[Anomaly]] = None,
    alerts: Optional[List[Alert]] = None,
    window_days: int = 14,
) -> List[TimelineEntry]:
    """Assemble the threat timeline from anomalies, alerts and correlated activity."""
    since = F.as_utc(incident.detected_at) - timedelta(days=window_days)

    if anomalies is None:
        anomalies = list(
            db.execute(
                select(Anomaly).where(
                    Anomaly.employee_id == incident.employee_id, Anomaly.detected_at >= since
                )
            ).scalars().all()
        )
    if alerts is None:
        alerts = list(
            db.execute(select(Alert).where(Alert.incident_id == incident.id)).scalars().all()
        )

    existing = {
        (e.entry_type, e.reference_id)
        for e in db.execute(
            select(TimelineEntry).where(TimelineEntry.incident_id == incident.id)
        ).scalars().all()
    }
    entries: List[TimelineEntry] = []

    for anomaly in anomalies:
        if ("anomaly", anomaly.id) in existing:
            continue
        entries.append(
            add_timeline(
                db,
                incident,
                anomaly.title,
                entry_type="anomaly",
                description=anomaly.description,
                severity=anomaly.severity,
                occurred_at=anomaly.occurred_at,
                reference_id=anomaly.id,
            )
        )
        collect_evidence(
            db,
            incident,
            title=f"Anomaly #{anomaly.id}: {anomaly.title}",
            evidence_type="anomaly",
            reference_id=anomaly.id,
            description=anomaly.description,
            payload=json.dumps(
                {
                    "category": anomaly.category,
                    "method": anomaly.detection_method,
                    "score": anomaly.score,
                    "sigma": anomaly.deviation_sigma,
                    "observed": anomaly.observed_value,
                    "baseline": anomaly.baseline_value,
                    "features": anomaly.features,
                },
                default=str,
            ),
        )

    for alert in alerts:
        if ("alert", alert.id) in existing:
            continue
        entries.append(
            add_timeline(
                db,
                incident,
                f"Alert raised: {alert.title}",
                entry_type="alert",
                description=alert.description,
                severity=alert.severity,
                occurred_at=alert.triggered_at,
                reference_id=alert.id,
            )
        )

    # Correlated high-signal activity around the detection window.
    events = correlated_events(db, incident, window_days=window_days, limit=40)
    for event in events:
        if ("event", event["id"]) in existing:
            continue
        entries.append(
            add_timeline(
                db,
                incident,
                f"{event['activity_type']} - {event.get('resource') or event.get('destination') or event.get('device_id') or 'n/a'}",
                entry_type="event",
                description=(
                    f"{event['megabytes']} MB via {event.get('log_source')} from device "
                    f"{event.get('device_id') or 'unknown'} ({event.get('ip_address') or 'no ip'})"
                ),
                occurred_at=datetime.fromisoformat(event["event_time"]),
                reference_id=event["id"],
            )
        )

    db.flush()
    return entries


def correlated_events(
    db: Session,
    incident: Incident,
    window_days: int = 14,
    limit: int = 50,
) -> List[Dict[str, Any]]:
    """Event correlation: the highest-signal activity around the incident window."""
    centre = F.as_utc(incident.detected_at)
    since = centre - timedelta(days=window_days)
    until = centre + timedelta(days=2)

    rows = list(
        db.execute(
            select(ActivityEvent)
            .where(
                ActivityEvent.employee_id == incident.employee_id,
                ActivityEvent.event_time >= since,
                ActivityEvent.event_time <= until,
            )
            .order_by(ActivityEvent.event_time.desc())
            .limit(600)
        ).scalars().all()
    )

    def signal(event: ActivityEvent) -> float:
        score = event.bytes_transferred / F.MB
        if event.is_external:
            score += 60
        if event.is_removable_media:
            score += 50
        if event.is_after_hours:
            score += 25
        if not event.success:
            score += 40
        if (event.sensitivity or "") in {"confidential", "restricted"}:
            score += 35
        if event.activity_type in {"privilege_change", "unauthorized_access"}:
            score += 55
        return score

    rows.sort(key=signal, reverse=True)
    return [
        {
            "id": e.id,
            "activity_type": e.activity_type,
            "log_source": e.log_source,
            "event_time": F.as_utc(e.event_time).isoformat(),
            "device_id": e.device_id,
            "ip_address": e.ip_address,
            "resource": e.resource,
            "application": e.application,
            "destination": e.destination,
            "megabytes": round(e.bytes_transferred / F.MB, 3),
            "is_external": e.is_external,
            "is_removable_media": e.is_removable_media,
            "is_after_hours": e.is_after_hours,
            "success": e.success,
            "sensitivity": e.sensitivity,
            "signal": round(signal(e), 2),
        }
        for e in rows[:limit]
    ]


def device_analysis(db: Session, employee_id: int, window_days: int = 30) -> List[Dict[str, Any]]:
    """Per-device behaviour summary used by the investigation workspace."""
    since = datetime.now(timezone.utc) - timedelta(days=window_days)
    rows = db.execute(
        select(
            ActivityEvent.device_id,
            func.count(ActivityEvent.id),
            func.coalesce(func.sum(ActivityEvent.bytes_transferred), 0.0),
            func.sum(func.cast(ActivityEvent.is_after_hours, Integer)),
            func.min(ActivityEvent.event_time),
            func.max(ActivityEvent.event_time),
        )
        .where(
            ActivityEvent.employee_id == employee_id,
            ActivityEvent.event_time >= since,
            ActivityEvent.device_id.is_not(None),
        )
        .group_by(ActivityEvent.device_id)
        .order_by(func.count(ActivityEvent.id).desc())
    ).all()
    return [
        {
            "device_id": r[0],
            "events": int(r[1]),
            "megabytes": round(float(r[2]) / F.MB, 2),
            "after_hours_events": int(r[3] or 0),
            "first_seen": F.as_utc(r[4]).isoformat() if r[4] else None,
            "last_seen": F.as_utc(r[5]).isoformat() if r[5] else None,
        }
        for r in rows
    ]


def risk_history(db: Session, employee_id: int, days: int = 90) -> List[Dict[str, Any]]:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = list(
        db.execute(
            select(RiskScore)
            .where(RiskScore.employee_id == employee_id, RiskScore.computed_at >= since)
            .order_by(RiskScore.computed_at)
        ).scalars().all()
    )
    return [
        {
            "computed_at": F.as_utc(r.computed_at).isoformat(),
            "date": F.as_utc(r.computed_at).date().isoformat(),
            "score": round(float(r.score), 2),
            "category": r.category,
            "trend": r.trend,
        }
        for r in rows
    ]


def transition(
    db: Session,
    incident: Incident,
    new_status: str,
    user: Optional[User] = None,
    note: Optional[str] = None,
) -> Incident:
    """Apply a workflow transition, stamping the response/resolution timestamps."""
    current = incident.status
    if new_status != current and new_status not in TRANSITIONS.get(current, set()):
        raise ValueError(f"Cannot move incident from '{current}' to '{new_status}'")

    now = datetime.now(timezone.utc)
    incident.status = new_status
    if incident.first_response_at is None and new_status != IncidentStatus.OPEN.value:
        incident.first_response_at = now
    if new_status in {IncidentStatus.RESOLVED.value, IncidentStatus.FALSE_POSITIVE.value}:
        incident.resolved_at = now
    if new_status == IncidentStatus.CLOSED.value:
        incident.closed_at = now
        if incident.resolved_at is None:
            incident.resolved_at = now
    if new_status == IncidentStatus.FALSE_POSITIVE.value:
        incident.outcome = "false_positive"

    add_timeline(
        db,
        incident,
        f"Status changed: {current} -> {new_status}",
        entry_type="status",
        description=note,
        severity=incident.severity,
        actor_id=user.id if user else None,
    )
    db.flush()
    return incident


def escalate(db: Session, incident: Incident, target_user_id: int, reason: str, user: Optional[User]) -> Incident:
    incident.escalated = True
    incident.escalated_to_id = target_user_id
    incident.status = IncidentStatus.ESCALATED.value
    if incident.first_response_at is None:
        incident.first_response_at = datetime.now(timezone.utc)
    add_timeline(
        db,
        incident,
        "Incident escalated",
        entry_type="status",
        description=reason,
        severity=incident.severity,
        actor_id=user.id if user else None,
    )
    db.flush()
    notifications.notify_escalation(db, incident, reason, target_user_id)
    return incident


def add_note(db: Session, incident: Incident, body: str, author: Optional[User]) -> IncidentNote:
    note = IncidentNote(incident_id=incident.id, author_id=author.id if author else None, body=body)
    db.add(note)
    add_timeline(
        db,
        incident,
        "Investigator note added",
        entry_type="note",
        description=body[:500],
        actor_id=author.id if author else None,
    )
    db.flush()
    return note
