"""Alert management endpoints (module 9)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import client_ip, require_analyst
from app.db.session import get_db
from app.models.alert import Alert
from app.models.employee import Employee
from app.models.enums import AlertStatus, Severity
from app.models.user import User
from app.schemas.common import Message, Page
from app.schemas.incident import AlertCreate, AlertOut, AlertUpdate
from app.services import alerts as alert_service
from app.services import audit

router = APIRouter(prefix="/alerts", tags=["Alerts"])


def _row(alert: Alert) -> dict:
    data = {c.name: getattr(alert, c.name) for c in Alert.__table__.columns}
    employee = alert.employee
    data["employee_name"] = employee.full_name if employee else None
    data["employee_code"] = employee.employee_code if employee else None
    data["department"] = employee.department.name if employee and employee.department else None
    data["assignee_name"] = alert.assignee.full_name if alert.assignee else None
    return data


@router.get("", response_model=Page[AlertOut])
def list_alerts(
    status_filter: Optional[AlertStatus] = Query(None, alias="status"),
    severity: Optional[Severity] = None,
    employee_id: Optional[int] = None,
    assigned_to_me: bool = False,
    days: int = Query(30, ge=1, le=365),
    page: int = Query(1, ge=1),
    size: int = Query(25, ge=1, le=200),
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    since = datetime.now(timezone.utc) - timedelta(days=days)
    stmt = select(Alert).where(Alert.triggered_at >= since)
    if status_filter:
        stmt = stmt.where(Alert.status == status_filter.value)
    if severity:
        stmt = stmt.where(Alert.severity == severity.value)
    if employee_id:
        stmt = stmt.where(Alert.employee_id == employee_id)
    if assigned_to_me:
        stmt = stmt.where(Alert.assigned_to_id == user.id)

    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one())
    rows = db.execute(
        stmt.order_by(Alert.priority.asc(), Alert.triggered_at.desc())
        .offset((page - 1) * size)
        .limit(size)
    ).scalars().all()
    return {
        "items": [_row(a) for a in rows],
        "total": total,
        "page": page,
        "size": size,
        "pages": max(1, (total + size - 1) // size),
    }


@router.post("", response_model=AlertOut, status_code=status.HTTP_201_CREATED)
def create_alert(
    payload: AlertCreate,
    request: Request,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Manually raise an alert (analyst-initiated)."""
    employee = db.get(Employee, payload.employee_id)
    if not employee:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    alert = Alert(
        employee_id=employee.id,
        anomaly_id=payload.anomaly_id,
        title=payload.title,
        description=payload.description,
        severity=payload.severity.value,
        category=payload.category,
        risk_score=float(employee.current_risk_score or 0.0),
        priority=alert_service.priority_for(payload.severity.value, float(employee.current_risk_score or 0.0)),
        triggered_at=datetime.now(timezone.utc),
    )
    db.add(alert)
    db.flush()
    audit.record(db, "alert.create", user, "alert", alert.id, payload.title, client_ip(request))
    db.commit()
    db.refresh(alert)
    return _row(alert)


@router.get("/{alert_id}", response_model=AlertOut)
def get_alert(alert_id: int, _: User = Depends(require_analyst), db: Session = Depends(get_db)) -> Any:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    return _row(alert)


@router.patch("/{alert_id}", response_model=AlertOut)
def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    request: Request,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Update status, severity, assignment or resolution note."""
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    data = payload.model_dump(exclude_unset=True)

    new_status = data.pop("status", None)
    if new_status is not None:
        value = new_status.value if isinstance(new_status, AlertStatus) else new_status
        if value == AlertStatus.ACKNOWLEDGED.value:
            alert_service.acknowledge(db, alert, user.id)
        elif value in {AlertStatus.CLOSED.value, AlertStatus.DISMISSED.value}:
            alert_service.close(db, alert, data.get("resolution_note"), dismissed=value == AlertStatus.DISMISSED.value)
        else:
            alert.status = value
    if "severity" in data and data["severity"] is not None:
        alert.severity = data["severity"].value if isinstance(data["severity"], Severity) else data["severity"]
        alert.priority = alert_service.priority_for(alert.severity, float(alert.risk_score or 0.0))
    if "assigned_to_id" in data:
        alert.assigned_to_id = data["assigned_to_id"]
    if "resolution_note" in data and data["resolution_note"] is not None:
        alert.resolution_note = data["resolution_note"]

    audit.record(db, "alert.update", user, "alert", alert.id, str(data), client_ip(request))
    db.commit()
    db.refresh(alert)
    return _row(alert)


@router.post("/{alert_id}/acknowledge", response_model=AlertOut)
def acknowledge_alert(
    alert_id: int,
    request: Request,
    user: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    alert = db.get(Alert, alert_id)
    if not alert:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Alert not found")
    alert_service.acknowledge(db, alert, user.id)
    audit.record(db, "alert.acknowledge", user, "alert", alert.id, None, client_ip(request))
    db.commit()
    db.refresh(alert)
    return _row(alert)
