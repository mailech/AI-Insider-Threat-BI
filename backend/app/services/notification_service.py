"""
ITBIS — Notification System  (Module 11)

Dispatches in-app and email alert notifications for critical-risk incidents
and escalation notices when cases remain unassigned beyond a configurable threshold.

Delivery is simulated in development/test: payloads are logged and collected in
an in-process buffer rather than sent to an external SMTP or push gateway.
"""

from __future__ import annotations

import json
import logging
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Any

from sqlalchemy.orm import Session

from app.models.domain import (
    Incident,
    IncidentComment,
    IncidentSeverityEnum,
    IncidentStatusEnum,
    RoleEnum,
    User,
)

logger = logging.getLogger(__name__)

# Minutes an incident may remain unassigned before escalation notifications fire.
DEFAULT_ESCALATION_THRESHOLD_MINUTES: int = 30

# Roles that receive in-app critical alerts.
_IN_APP_ROLES: set[RoleEnum] = {
    RoleEnum.SECURITY_ANALYST,
    RoleEnum.SOC_ENGINEER,
    RoleEnum.SECURITY_MANAGER,
    RoleEnum.ADMINISTRATOR,
}

# Roles that receive email for CRITICAL severity incidents.
_EMAIL_CRITICAL_ROLES: set[RoleEnum] = {
    RoleEnum.SOC_ENGINEER,
    RoleEnum.SECURITY_MANAGER,
    RoleEnum.ADMINISTRATOR,
}

# Roles that receive escalation email notifications.
_ESCALATION_EMAIL_ROLES: set[RoleEnum] = {
    RoleEnum.SECURITY_MANAGER,
    RoleEnum.ADMINISTRATOR,
}


class NotificationChannel(str, Enum):
    IN_APP = "IN_APP"
    EMAIL = "EMAIL"


class NotificationType(str, Enum):
    CRITICAL_ALERT = "CRITICAL_ALERT"
    ESCALATION = "ESCALATION"


@dataclass
class NotificationPayload:
    notification_id: str
    channel: NotificationChannel
    notification_type: NotificationType
    recipient_user_id: int
    recipient_email: str
    subject: str
    body: str
    incident_id: int | None
    severity: str
    metadata: dict[str, Any] = field(default_factory=dict)
    dispatched_at: str = ""

    def to_dict(self) -> dict[str, Any]:
        data = asdict(self)
        data["channel"] = self.channel.value
        data["notification_type"] = self.notification_type.value
        return data


_simulated_delivery_log: list[NotificationPayload] = []


def clear_simulated_delivery_log() -> None:
    """Reset the in-process simulated delivery buffer."""
    _simulated_delivery_log.clear()


def get_simulated_delivery_log() -> list[dict[str, Any]]:
    """Return all simulated notification payloads as serialisable dicts."""
    return [payload.to_dict() for payload in _simulated_delivery_log]


def _utcnow() -> datetime:
    return datetime.utcnow()


def _simulate_dispatch(payload: NotificationPayload) -> None:
    _simulated_delivery_log.append(payload)
    logger.info("SIMULATED_NOTIFICATION %s", json.dumps(payload.to_dict(), default=str))


def _active_soc_users(db: Session, roles: set[RoleEnum]) -> list[User]:
    return (
        db.query(User)
        .filter(User.is_active.is_(True), User.role.in_(list(roles)))
        .all()
    )


def _build_critical_subject(incident: Incident, emp_label: str) -> str:
    return (
        f"[ITBIS CRITICAL] Incident #{incident.id} — "
        f"{emp_label} | Score {incident.threat_score}/100"
    )


def _build_critical_body(incident: Incident, emp_label: str, department: str) -> str:
    return (
        f"A CRITICAL insider-threat incident requires immediate SOC attention.\n\n"
        f"Incident ID : {incident.id}\n"
        f"Employee    : {emp_label}\n"
        f"Department  : {department}\n"
        f"Threat Score: {incident.threat_score}/100\n"
        f"Status      : {incident.status.value}\n"
        f"Triggered   : {incident.triggered_at.isoformat() if incident.triggered_at else 'n/a'}\n\n"
        f"Title: {incident.title}"
    )


def dispatch_critical_alert_notifications(
    incident: Incident,
    db: Session,
) -> list[NotificationPayload]:
    """
    Fire in-app and email notifications for a CRITICAL severity incident.

    Returns the list of payloads that were simulated/dispatched.
    """
    if incident.severity is not IncidentSeverityEnum.CRITICAL:
        return []

    emp = incident.employee
    emp_label = (
        f"{emp.first_name} {emp.last_name} ({emp.emp_id})"
        if emp is not None
        else f"employee_id={incident.employee_id}"
    )
    department = emp.department if emp is not None else "Unknown"
    subject = _build_critical_subject(incident, emp_label)
    body = _build_critical_body(incident, emp_label, department)
    dispatched: list[NotificationPayload] = []
    now_iso = _utcnow().isoformat()

    in_app_users = _active_soc_users(db, _IN_APP_ROLES)
    email_users = _active_soc_users(db, _EMAIL_CRITICAL_ROLES)
    email_user_ids = {user.id for user in email_users}

    for user in in_app_users:
        payload = NotificationPayload(
            notification_id=str(uuid.uuid4()),
            channel=NotificationChannel.IN_APP,
            notification_type=NotificationType.CRITICAL_ALERT,
            recipient_user_id=user.id,
            recipient_email=user.email,
            subject=subject,
            body=body,
            incident_id=incident.id,
            severity=IncidentSeverityEnum.CRITICAL.value,
            metadata={
                "emp_id": emp.emp_id if emp else None,
                "threat_score": incident.threat_score,
                "trigger_reason": incident.trigger_reason,
            },
            dispatched_at=now_iso,
        )
        _simulate_dispatch(payload)
        dispatched.append(payload)

    for user in email_users:
        if user.id in {p.recipient_user_id for p in dispatched if p.channel is NotificationChannel.EMAIL}:
            continue
        payload = NotificationPayload(
            notification_id=str(uuid.uuid4()),
            channel=NotificationChannel.EMAIL,
            notification_type=NotificationType.CRITICAL_ALERT,
            recipient_user_id=user.id,
            recipient_email=user.email,
            subject=subject,
            body=body,
            incident_id=incident.id,
            severity=IncidentSeverityEnum.CRITICAL.value,
            metadata={
                "emp_id": emp.emp_id if emp else None,
                "threat_score": incident.threat_score,
                "smtp_simulated": True,
            },
            dispatched_at=now_iso,
        )
        _simulate_dispatch(payload)
        dispatched.append(payload)

    logger.info(
        "Critical alert notifications dispatched for incident %d "
        "(in_app=%d, email=%d)",
        incident.id,
        len(in_app_users),
        len(email_user_ids),
    )
    return dispatched


def _incident_already_escalated(db: Session, incident_id: int) -> bool:
    existing = (
        db.query(IncidentComment)
        .filter(
            IncidentComment.incident_id == incident_id,
            IncidentComment.content.like("[ESCALATION NOTIFICATION]%"),
        )
        .first()
    )
    return existing is not None


def scan_unassigned_incident_escalations(
    db: Session,
    *,
    threshold_minutes: int = DEFAULT_ESCALATION_THRESHOLD_MINUTES,
    reference_time: datetime | None = None,
) -> list[NotificationPayload]:
    """
    Send escalation notifications for open, unassigned incidents that have
    exceeded ``threshold_minutes`` since creation.

    A system comment is recorded on each escalated incident to prevent
    duplicate escalation dispatches.
    """
    now = reference_time or _utcnow()
    cutoff = now - timedelta(minutes=threshold_minutes)
    dispatched: list[NotificationPayload] = []

    candidates: list[Incident] = (
        db.query(Incident)
        .filter(
            Incident.status == IncidentStatusEnum.NEW,
            Incident.assigned_to_id.is_(None),
            Incident.created_at <= cutoff,
        )
        .all()
    )

    escalation_recipients = _active_soc_users(db, _ESCALATION_EMAIL_ROLES)
    manager_recipients = _active_soc_users(db, _IN_APP_ROLES)

    for incident in candidates:
        if _incident_already_escalated(db, incident.id):
            continue

        emp = incident.employee
        emp_label = (
            f"{emp.first_name} {emp.last_name} ({emp.emp_id})"
            if emp is not None
            else f"employee_id={incident.employee_id}"
        )
        age_minutes = int((now - incident.created_at).total_seconds() // 60)
        subject = (
            f"[ITBIS ESCALATION] Unassigned incident #{incident.id} "
            f"open for {age_minutes} min"
        )
        body = (
            f"Incident #{incident.id} remains unassigned beyond the "
            f"{threshold_minutes}-minute SLA.\n\n"
            f"Employee : {emp_label}\n"
            f"Severity : {incident.severity.value}\n"
            f"Score    : {incident.threat_score}/100\n"
            f"Created  : {incident.created_at.isoformat()}\n"
            f"Status   : {incident.status.value}\n\n"
            f"Please assign a SOC analyst immediately."
        )
        now_iso = now.isoformat()

        for user in manager_recipients:
            payload = NotificationPayload(
                notification_id=str(uuid.uuid4()),
                channel=NotificationChannel.IN_APP,
                notification_type=NotificationType.ESCALATION,
                recipient_user_id=user.id,
                recipient_email=user.email,
                subject=subject,
                body=body,
                incident_id=incident.id,
                severity=incident.severity.value,
                metadata={
                    "unassigned_minutes": age_minutes,
                    "threshold_minutes": threshold_minutes,
                },
                dispatched_at=now_iso,
            )
            _simulate_dispatch(payload)
            dispatched.append(payload)

        for user in escalation_recipients:
            payload = NotificationPayload(
                notification_id=str(uuid.uuid4()),
                channel=NotificationChannel.EMAIL,
                notification_type=NotificationType.ESCALATION,
                recipient_user_id=user.id,
                recipient_email=user.email,
                subject=subject,
                body=body,
                incident_id=incident.id,
                severity=incident.severity.value,
                metadata={
                    "unassigned_minutes": age_minutes,
                    "threshold_minutes": threshold_minutes,
                    "smtp_simulated": True,
                },
                dispatched_at=now_iso,
            )
            _simulate_dispatch(payload)
            dispatched.append(payload)

        escalation_note = IncidentComment(
            incident_id=incident.id,
            content=(
                f"[ESCALATION NOTIFICATION] Unassigned for {age_minutes} min "
                f"(threshold={threshold_minutes} min). "
                f"Notified {len(manager_recipients)} in-app + "
                f"{len(escalation_recipients)} email recipients."
            ),
            author_id=None,
        )
        db.add(escalation_note)
        incident.updated_at = now

    if candidates:
        db.commit()

    logger.info(
        "Escalation scan complete: %d candidate(s), %d notification(s) dispatched",
        len(candidates),
        len(dispatched),
    )
    return dispatched
