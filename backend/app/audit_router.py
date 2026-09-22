from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AuditLog
from app.schemas import AuditLogResponse
from app.auth import require_roles

router = APIRouter(
    prefix="/api/v1/audit-logs",
    tags=["Audit Trail"]
)


@router.get("", response_model=list[AuditLogResponse])
def get_audit_logs(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles([
            "ADMINISTRATOR",
            "SECURITY_MANAGER"
        ])
    )
):
    logs = (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .limit(200)
        .all()
    )
    return logs
