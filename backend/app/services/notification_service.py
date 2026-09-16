"""Notification creation and querying."""

import uuid

from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models.anomaly import Severity
from app.models.notification import Notification


def create_notification(
    db: Session,
    *,
    notification_type: str,
    severity: Severity,
    title: str,
    message: str,
    employee_id: uuid.UUID | None = None,
    anomaly_id: uuid.UUID | None = None,
    alert_id: uuid.UUID | None = None,
    investigation_id: uuid.UUID | None = None,
    commit: bool = True,
) -> Notification:
    notification = Notification(
        notification_type=notification_type,
        severity=severity,
        title=title,
        message=message,
        occurred_at=utcnow(),
        employee_id=employee_id,
        anomaly_id=anomaly_id,
        alert_id=alert_id,
        investigation_id=investigation_id,
    )
    db.add(notification)
    if commit:
        db.commit()
        db.refresh(notification)
    return notification


def list_notifications(
    db: Session, *, unread_only: bool = False, limit: int = 100
) -> list[Notification]:
    query = select(Notification).order_by(Notification.occurred_at.desc()).limit(limit)
    if unread_only:
        query = query.where(Notification.is_read.is_(False))
    return list(db.scalars(query))


def unread_count(db: Session) -> int:
    return len(
        list(db.scalars(select(Notification.id).where(Notification.is_read.is_(False))))
    )


def mark_read(db: Session, notification_id: uuid.UUID) -> Notification | None:
    notification = db.get(Notification, notification_id)
    if notification is None:
        return None
    notification.is_read = True
    db.commit()
    db.refresh(notification)
    return notification


def mark_all_read(db: Session) -> int:
    result = db.execute(
        update(Notification).where(Notification.is_read.is_(False)).values(is_read=True)
    )
    db.commit()
    return int(result.rowcount or 0)
