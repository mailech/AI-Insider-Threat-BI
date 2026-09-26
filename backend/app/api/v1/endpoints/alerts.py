from typing import Any, List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.alert import Alert
from backend.app.schemas.alert import AlertResponse, AlertUpdate
from backend.app.api.deps import get_current_user, record_audit

router = APIRouter()


@router.get("", response_model=List[AlertResponse])
def get_alerts(
    user_id: Optional[str] = None,
    severity: Optional[str] = None,
    status_filter: Optional[str] = None,
    assigned_analyst: Optional[str] = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get explainable security alerts triggered by risk and anomaly spikes.
    """
    query = db.query(Alert)

    if user_id:
        query = query.filter(Alert.user_id.ilike(f"%{user_id}%"))
    if severity and severity != "ALL":
        query = query.filter(Alert.severity == severity)
    if status_filter and status_filter != "ALL":
        query = query.filter(Alert.status == status_filter)
    if assigned_analyst:
        query = query.filter(Alert.assigned_analyst == assigned_analyst)

    return query.order_by(desc(Alert.id)).offset(skip).limit(limit).all()


@router.patch("/{alert_id}", response_model=AlertResponse)
def update_alert(
    alert_id: str,
    alert_in: AlertUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Update alert status (e.g. NEW -> INVESTIGATING -> RESOLVED / FALSE_POSITIVE) or assigned analyst.
    """
    alert = db.query(Alert).filter((Alert.alert_id == alert_id) | (Alert.id == int(alert_id) if alert_id.isdigit() else False)).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    if alert_in.status is not None:
        alert.status = alert_in.status
    if alert_in.assigned_analyst is not None:
        alert.assigned_analyst = alert_in.assigned_analyst
    if alert_in.notes is not None:
        alert.notes = alert_in.notes

    db.commit()
    db.refresh(alert)

    record_audit(db, current_user.username, current_user.role, "UPDATE_ALERT", f"/api/alerts/{alert.alert_id}", {"status": alert.status})
    return alert
