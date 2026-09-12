"""Reports and export endpoints (module 12)."""
from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.api.deps import client_ip, require_analyst
from app.db.session import get_db
from app.models.user import User
from app.services import audit
from app.services import reports as service

router = APIRouter(prefix="/reports", tags=["Reports & Export"])

MEDIA_TYPES = {
    "pdf": "application/pdf",
    "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}


@router.get("/types", response_model=list)
def report_types(_: User = Depends(require_analyst)) -> Any:
    return [
        {"key": "insider_threat", "label": "Insider Threat Report"},
        {"key": "behavioral_analytics", "label": "Behavioural Analytics Report"},
        {"key": "investigation", "label": "Investigation Report"},
        {"key": "compliance", "label": "Compliance Report"},
        {"key": "risk_assessment", "label": "Risk Assessment Report"},
    ]


@router.get("/{report_type}", response_model=dict)
def preview_report(
    report_type: str,
    days: int = Query(30, ge=1, le=365),
    incident_id: Optional[int] = None,
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """JSON preview of a report, used to render it in the browser."""
    try:
        return service.build_report(db, report_type, days=days, incident_id=incident_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))


@router.get("/{report_type}/export", response_class=Response)
def export_report(
    report_type: str,
    request: Request,
    format: str = Query("pdf", pattern="^(pdf|excel|xlsx)$"),
    days: int = Query(30, ge=1, le=365),
    incident_id: Optional[int] = None,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Download a report as PDF or Excel."""
    try:
        report = service.build_report(db, report_type, days=days, incident_id=incident_id)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc))

    if format == "pdf":
        content = service.render_pdf(report)
        filename = service.filename_for(report, "pdf")
    else:
        content = service.render_excel(report)
        filename = service.filename_for(report, "xlsx")

    audit.record(
        db, "report.export", user, "report", report_type, f"format={format} days={days}", client_ip(request)
    )
    db.commit()
    return Response(
        content=content,
        media_type=MEDIA_TYPES[format],
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
