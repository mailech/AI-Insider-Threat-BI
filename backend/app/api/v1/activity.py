from typing import List, Union
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.activity import ActivityLog
from app.models.employee import Employee
from app.schemas.activity import (
    ActivityLogCreate,
    ActivityLogRead,
    ActivityIngestResponse
)

router = APIRouter(prefix="/activity", tags=["Activity Monitoring Telemetry"])


@router.post("/ingest", response_model=ActivityIngestResponse, status_code=status.HTTP_201_CREATED)
def ingest_telemetry_logs(
    payload: Union[ActivityLogCreate, List[ActivityLogCreate]],
    db: Session = Depends(get_db)
):
    """Ingests activity logs into the telemetry stream and performs real-time heuristic anomaly tagging."""
    logs_to_insert = [payload] if isinstance(payload, ActivityLogCreate) else payload
    anomalies_count = 0

    db_entries = []
    for log_data in logs_to_insert:
        # Heuristic anomaly evaluation (Milestone 1 baseline rule engine)
        is_anom = log_data.is_anomalous
        score = log_data.anomaly_score or 0

        # Heuristic: Flag off-hours logins, massive file downloads, and USB data writes
        act_type = log_data.activity_type.lower()
        if "usb" in act_type or "mass" in act_type or "exfil" in act_type:
            is_anom = True
            score = max(score, 75)
        elif "failed_login" in act_type or "privilege" in act_type:
            is_anom = True
            score = max(score, 60)

        if is_anom:
            anomalies_count += 1

        db_entry = ActivityLog(
            employee_id=log_data.employee_id,
            activity_type=log_data.activity_type,
            source_ip=log_data.source_ip or "127.0.0.1",
            workstation=log_data.workstation or "WS-UNKNOWN",
            details=log_data.details or {},
            is_anomalous=is_anom,
            anomaly_score=score
        )
        db_entries.append(db_entry)

    db.add_all(db_entries)
    db.commit()

    return ActivityIngestResponse(
        status="success",
        ingested_count=len(db_entries),
        anomalies_flagged=anomalies_count
    )


@router.get("/recent", response_model=List[ActivityLogRead])
def get_recent_activity(limit: int = 50, db: Session = Depends(get_db)):
    """Retrieves recent ingested activity logs for SOC surveillance stream."""
    logs = db.query(ActivityLog).order_by(desc(ActivityLog.timestamp)).limit(limit).all()
    return [ActivityLogRead.model_validate(log) for log in logs]
