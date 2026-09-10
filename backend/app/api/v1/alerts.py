from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.alert import Alert
from app.schemas.alert import AlertRead, AlertUpdate, AlertListResponse

router = APIRouter(prefix="/alerts", tags=["Incident Alerts"])


@router.get("", response_model=AlertListResponse)
def list_alerts(
    severity: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    employee_id: Optional[str] = None,
    db: Session = Depends(get_db)
):
    """Retrieves security incidents with optional severity and status filtering."""
    query = db.query(Alert)

    if severity and severity != "All":
        query = query.filter(Alert.severity == severity)

    if status_filter and status_filter != "All":
        target_status = "New" if status_filter == "Unresolved" else status_filter
        query = query.filter(Alert.status == target_status)

    if employee_id:
        query = query.filter(Alert.employee_id == employee_id)

    alerts = query.order_by(desc(Alert.created_at)).all()

    return AlertListResponse(
        total=len(alerts),
        items=[AlertRead.model_validate(a) for a in alerts]
    )


@router.get("/{alert_id}", response_model=AlertRead)
def get_alert(alert_id: str, db: Session = Depends(get_db)):
    """Retrieves a single incident alert with forensic evidence details."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert #{alert_id} not found."
        )
    return AlertRead.model_validate(alert)


@router.patch("/{alert_id}", response_model=AlertRead)
def update_alert_status(alert_id: str, payload: AlertUpdate, db: Session = Depends(get_db)):
    """Updates the triage status of an active security alert."""
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Alert #{alert_id} not found."
        )

    status_value = "New" if payload.status == "Unresolved" else payload.status
    if status_value not in ["New", "Investigating", "Resolved"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Status must be one of: New, Investigating, Resolved, Unresolved."
        )

    alert.status = status_value
    db.commit()
    db.refresh(alert)
    return AlertRead.model_validate(alert)

