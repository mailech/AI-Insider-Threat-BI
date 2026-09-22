from datetime import datetime
from sqlalchemy.orm import Session
from app.models import AuditLog


def log_audit(
    db: Session,
    actor: str,
    action: str,
    target: str = None,
    status: str = "SUCCESS",
    details: str = None
):
    try:
        log_entry = AuditLog(
            actor=actor,
            action=action,
            target=target,
            status=status,
            details=details,
            timestamp=datetime.utcnow()
        )
        db.add(log_entry)
        db.commit()
        return log_entry
    except Exception as e:
        db.rollback()
        print(f"Failed to log audit event: {e}")
        return None
