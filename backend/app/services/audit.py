"""Audit trail helper - every state-changing action is recorded."""
from __future__ import annotations

from typing import Any, Optional

from sqlalchemy.orm import Session

from app.models.audit import AuditLog
from app.models.user import User


def record(
    db: Session,
    action: str,
    user: Optional[User] = None,
    entity_type: Optional[str] = None,
    entity_id: Optional[Any] = None,
    detail: Optional[str] = None,
    ip_address: Optional[str] = None,
) -> AuditLog:
    log = AuditLog(
        user_id=user.id if user else None,
        actor_email=user.email if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        detail=detail,
        ip_address=ip_address,
    )
    db.add(log)
    return log
