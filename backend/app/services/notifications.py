"""Notification and escalation system (module 11).

Fan-out to individual users or whole roles, plus a live WebSocket broadcast so
SOC dashboards update without polling.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
from typing import Any, Dict, Iterable, List, Optional, Set

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core import mailer
from app.core.documents import NOTIFICATION_LOG, documents
from app.models.enums import NotificationType, Role, Severity
from app.models.notification import Notification
from app.models.user import User


class ConnectionManager:
    """Tracks active WebSocket clients for real-time alert push."""

    def __init__(self) -> None:
        self._connections: Set[Any] = set()

    async def connect(self, websocket) -> None:
        await websocket.accept()
        self._connections.add(websocket)

    def disconnect(self, websocket) -> None:
        self._connections.discard(websocket)

    async def broadcast(self, message: Dict[str, Any]) -> None:
        stale = []
        payload = json.dumps(message, default=str)
        for ws in list(self._connections):
            try:
                await ws.send_text(payload)
            except Exception:
                stale.append(ws)
        for ws in stale:
            self.disconnect(ws)

    @property
    def active(self) -> int:
        return len(self._connections)


manager = ConnectionManager()


def push_event(event_type: str, payload: Dict[str, Any]) -> None:
    """Fire-and-forget broadcast that is safe to call from sync request handlers."""
    message = {"type": event_type, "at": datetime.now(timezone.utc).isoformat(), "data": payload}
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        return
    loop.create_task(manager.broadcast(message))


def resolve_recipients(
    db: Session,
    user_ids: Optional[Iterable[int]] = None,
    roles: Optional[Iterable[str]] = None,
) -> List[User]:
    users: Dict[int, User] = {}
    if user_ids:
        for u in db.execute(select(User).where(User.id.in_(list(user_ids)))).scalars().all():
            users[u.id] = u
    if roles:
        role_values = [r.value if isinstance(r, Role) else str(r) for r in roles]
        for u in db.execute(
            select(User).where(User.role.in_(role_values), User.is_active.is_(True))
        ).scalars().all():
            users[u.id] = u
    return list(users.values())


def notify(
    db: Session,
    title: str,
    body: Optional[str] = None,
    *,
    user_ids: Optional[Iterable[int]] = None,
    roles: Optional[Iterable[str]] = None,
    type: NotificationType = NotificationType.SECURITY_EVENT,
    severity: Severity = Severity.INFORMATIONAL,
    link: Optional[str] = None,
    broadcast: bool = True,
) -> List[Notification]:
    """Create in-app notifications and optionally push them over the socket."""
    recipients = resolve_recipients(db, user_ids, roles)
    created: List[Notification] = []
    for user in recipients:
        note = Notification(
            user_id=user.id,
            type=type.value if isinstance(type, NotificationType) else str(type),
            severity=severity.value if isinstance(severity, Severity) else str(severity),
            title=title,
            body=body,
            link=link,
        )
        db.add(note)
        created.append(note)
    db.flush()
    severity_value = severity.value if isinstance(severity, Severity) else str(severity)

    if broadcast and created:
        push_event(
            "notification",
            {
                "title": title,
                "body": body,
                "severity": severity_value,
                "link": link,
                "recipients": [u.id for u in recipients],
            },
        )

    # Escalation by email, gated on severity so routine notices stay in-app.
    delivery = None
    if recipients and mailer.meets_threshold(severity_value):
        delivery = mailer.send(
            [u.email for u in recipients],
            subject=title,
            body=body,
            severity=severity_value,
            link=link,
        )

    # Every fan-out is archived, whether or not it left the building -- "was the
    # manager told, and when" is a question compliance reporting has to answer.
    documents.store(
        NOTIFICATION_LOG,
        {
            "title": title,
            "body": body,
            "severity": severity_value,
            "type": type.value if isinstance(type, NotificationType) else str(type),
            "link": link,
            "recipients": [{"id": u.id, "email": u.email, "role": u.role} for u in recipients],
            "email": delivery,
        },
        db=db,
    )
    return created


def notify_threat_alert(db: Session, alert, employee_name: str) -> None:
    """Insider threat alert fan-out (analysts + SOC; managers for high severity)."""
    roles = [Role.SECURITY_ANALYST.value, Role.SOC_ENGINEER.value]
    if alert.severity in {Severity.HIGH.value, Severity.CRITICAL.value}:
        roles.append(Role.SECURITY_MANAGER.value)
    notify(
        db,
        title=f"[{alert.severity.upper()}] {alert.title}",
        body=f"{employee_name}: {alert.description or ''}".strip(),
        roles=roles,
        type=NotificationType.INSIDER_THREAT_ALERT,
        severity=Severity(alert.severity),
        link=f"/alerts/{alert.id}",
    )


def notify_escalation(db: Session, incident, reason: str, target_user_id: int) -> None:
    notify(
        db,
        title=f"Incident escalated: {incident.reference}",
        body=reason,
        user_ids=[target_user_id],
        roles=[Role.SECURITY_MANAGER.value],
        type=NotificationType.ESCALATION,
        severity=Severity(incident.severity),
        link=f"/investigations/{incident.id}",
    )


def notify_investigation(db: Session, incident, message: str, user_ids: Optional[List[int]] = None) -> None:
    notify(
        db,
        title=f"Investigation update: {incident.reference}",
        body=message,
        user_ids=user_ids or ([incident.assigned_to_id] if incident.assigned_to_id else None),
        type=NotificationType.INVESTIGATION,
        severity=Severity(incident.severity),
        link=f"/investigations/{incident.id}",
    )


def notify_compliance(db: Session, title: str, body: str) -> None:
    notify(
        db,
        title=title,
        body=body,
        roles=[Role.SECURITY_MANAGER.value, Role.ADMINISTRATOR.value],
        type=NotificationType.COMPLIANCE,
        severity=Severity.INFORMATIONAL,
        link="/reports",
    )
