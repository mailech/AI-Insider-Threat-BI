"""Anomaly detection endpoints."""

import uuid

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.anomaly import AnomalyCategory, AnomalyStatus, Severity
from app.models.user import User
from app.schemas.anomaly import (
    AnomalyRead,
    AnomalyScanRequest,
    AnomalyScanResponse,
    AnomalyStatusUpdate,
)
from app.services import anomaly_service

router = APIRouter(prefix="/anomalies", tags=["anomalies"])


@router.get(
    "",
    response_model=list[AnomalyRead],
    summary="List anomalies with optional filters",
)
def list_anomalies(
    employee_id: uuid.UUID | None = Query(None),
    severity: Severity | None = Query(None),
    status_filter: AnomalyStatus | None = Query(None, alias="status"),
    category: AnomalyCategory | None = Query(None),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list:
    return anomaly_service.list_anomalies(
        db,
        employee_id=employee_id,
        severity=severity,
        status=status_filter,
        category=category,
        offset=skip,
        limit=limit,
    )


@router.get(
    "/{anomaly_id}",
    response_model=AnomalyRead,
    summary="Get a single anomaly",
)
def get_anomaly(
    anomaly_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> object:
    anomaly = anomaly_service.get_anomaly(db, anomaly_id)
    if anomaly is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly not found.")
    return anomaly


@router.patch(
    "/{anomaly_id}/status",
    response_model=AnomalyRead,
    summary="Update anomaly status",
)
def update_anomaly_status(
    anomaly_id: uuid.UUID,
    payload: AnomalyStatusUpdate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> object:
    anomaly = anomaly_service.update_anomaly_status(db, anomaly_id, payload.status)
    if anomaly is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Anomaly not found.")
    return anomaly


@router.post(
    "/scan",
    response_model=AnomalyScanResponse,
    summary="Trigger an anomaly scan for one or all employees",
)
def trigger_scan(
    payload: AnomalyScanRequest,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> AnomalyScanResponse:
    if payload.employee_id is not None:
        result = anomaly_service.scan_employee(db, payload.employee_id)
        return AnomalyScanResponse(
            scanned_employees=1,
            created=result.get("created", 0),
            alerts_created=result.get("alerts_created", 0),
            notifications_created=result.get("notifications_created", 0),
            anomalies=anomaly_service.list_anomalies(
                db, employee_id=payload.employee_id, limit=500
            ),
        )
    else:
        result = anomaly_service.scan_all_employees(db)
        return AnomalyScanResponse(
            scanned_employees=result.get("scanned_employees", 0),
            created=result.get("created", 0),
            alerts_created=result.get("alerts_created", 0),
            notifications_created=result.get("notifications_created", 0),
            anomalies=anomaly_service.list_anomalies(db, limit=500),
        )
