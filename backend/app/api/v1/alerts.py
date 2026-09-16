"""Alert endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.alert import Alert, AlertStatus
from app.models.anomaly import Severity
from app.models.user import User
from app.schemas.alert import AlertRead, AlertStatusUpdate

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get(
    "",
    response_model=list[AlertRead],
    summary="List alerts with optional filters",
)
def list_alerts(
    employee_id: uuid.UUID | None = Query(None),
    severity: Severity | None = Query(None),
    alert_status: AlertStatus | None = Query(None, alias="status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[Alert]:
    q = select(Alert).order_by(Alert.raised_at.desc()).offset(skip).limit(limit)
    if employee_id:
        q = q.where(Alert.employee_id == employee_id)
    if severity:
        q = q.where(Alert.severity == severity)
    if alert_status:
        q = q.where(Alert.status == alert_status)
    return list(db.scalars(q))


@router.get(
    "/{alert_id}",
    response_model=AlertRead,
    summary="Get a single alert",
)
def get_alert(
    alert_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Alert:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    return alert


@router.patch(
    "/{alert_id}/status",
    response_model=AlertRead,
    summary="Update alert status",
)
def update_alert_status(
    alert_id: uuid.UUID,
    payload: AlertStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> Alert:
    alert = db.get(Alert, alert_id)
    if alert is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found.")
    alert.status = payload.status
    db.commit()
    db.refresh(alert)
    return alert
