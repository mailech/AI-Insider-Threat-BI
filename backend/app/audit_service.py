import datetime
from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models import AuditLog, User

def log_audit_event(
    db: Session,
    user: Optional[User] = None,
    action: str = "",
    target_resource: Optional[str] = None,
    details: Optional[Dict[str, Any]] = None,
    ip_address: Optional[str] = "127.0.0.1",
    user_email: Optional[str] = None,
    user_role: Optional[str] = None,
) -> AuditLog:
    """
    Persists a CloudTrail-style audit log entry capturing actor identity, role,
    action type, target resource, and metadata.
    """
    email = user.email if user else (user_email or "system@ams.internal")
    role = user.role if user else (user_role or "System Pipeline")

    entry = AuditLog(
        user_email=email,
        user_role=role,
        action=action,
        target_resource=target_resource,
        details=details or {},
        ip_address=ip_address,
        timestamp=datetime.datetime.utcnow()
    )
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry
