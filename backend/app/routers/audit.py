import io
import csv
import json
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, Query, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import AuditLog, User
from app.schemas import AuditLogRead
from app.auth import require_manager_or_admin
from app.audit_service import log_audit_event

router = APIRouter(prefix="/audit", tags=["Audit Trail"])

@router.get("/logs", response_model=List[AuditLogRead])
def get_audit_logs(
    action: Optional[str] = Query(None, description="Filter by audit action"),
    user_email: Optional[str] = Query(None, description="Filter by actor email"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """
    Query system-wide security audit trail logs.
    Restricted to Administrator (fleet-wide) and Security Manager (governance & compliance).
    Unauthorized roles (SOC Engineer, Security Analyst) receive 403 Forbidden.
    """
    query = db.query(AuditLog)

    if action and action != "All":
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))

    if user_email and user_email != "All":
        query = query.filter(AuditLog.user_email.ilike(f"%{user_email}%"))

    logs = query.order_by(desc(AuditLog.timestamp)).offset(offset).limit(limit).all()
    return logs

@router.get("/export")
def export_audit_trail_csv(
    action: Optional[str] = Query(None, description="Filter by audit action"),
    user_email: Optional[str] = Query(None, description="Filter by actor email"),
    limit: int = Query(1000, ge=1, le=5000),
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """
    Export Security & Audit Trail Logs as CSV (Elevation Feature 5).
    Restricted to Administrator and Security Manager.
    """
    query = db.query(AuditLog)

    if action and action != "All":
        query = query.filter(AuditLog.action.ilike(f"%{action}%"))

    if user_email and user_email != "All":
        query = query.filter(AuditLog.user_email.ilike(f"%{user_email}%"))

    logs = query.order_by(desc(AuditLog.timestamp)).limit(limit).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Audit ID", "Timestamp (UTC)", "Actor Email", "Actor Role",
        "Action", "Target Resource", "Client IP", "Details JSON"
    ])

    for log in logs:
        writer.writerow([
            log.id,
            log.timestamp.isoformat(),
            log.user_email,
            log.user_role,
            log.action,
            log.target_resource or "N/A",
            log.ip_address or "127.0.0.1",
            json.dumps(log.details or {})
        ])

    # Record Audit Log for the export itself
    log_audit_event(
        db=db,
        user=current_user,
        action="EXPORT_AUDIT_TRAIL_CSV",
        target_resource="audit_trail",
        details={
            "exported_records_count": len(logs),
            "filter_action": action,
            "filter_user": user_email
        }
    )

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=ams_audit_trail_{datetime.date.today().isoformat()}.csv"
        }
    )

