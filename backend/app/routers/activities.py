from typing import List, Optional
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ActivityLog, ActivityType, AlertSeverity, User
from app.schemas import ActivityCreate, ActivityResponse
from app.auth import get_current_user

router = APIRouter(prefix="/activities", tags=["Activity Monitoring & Ingestion Engine"])

@router.get("", response_model=List[ActivityResponse])
def list_activities(
    employee_id: Optional[str] = Query(None),
    activity_type: Optional[ActivityType] = Query(None),
    severity: Optional[AlertSeverity] = Query(None),
    is_anomalous: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ActivityLog)
    if employee_id:
        query = query.filter(ActivityLog.employee_id == employee_id)
    if activity_type:
        query = query.filter(ActivityLog.activity_type == activity_type)
    if severity:
        query = query.filter(ActivityLog.severity == severity)
    if is_anomalous is not None:
        query = query.filter(ActivityLog.is_anomalous == is_anomalous)
        
    return query.order_by(ActivityLog.timestamp.desc()).limit(limit).all()

@router.post("", response_model=ActivityResponse)
def ingest_activity(
    activity: ActivityCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    log = ActivityLog(
        timestamp=datetime.utcnow(),
        employee_id=activity.employee_id,
        activity_type=activity.activity_type,
        action=activity.action,
        resource=activity.resource,
        details=activity.details or {},
        ip_address=activity.ip_address or "10.0.0.1",
        device_id=activity.device_id or "device-primary",
        is_anomalous=activity.is_anomalous or False,
        anomaly_reason=activity.anomaly_reason,
        severity=activity.severity or AlertSeverity.LOW
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log

@router.get("/stats")
def get_activity_breakdown(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total = db.query(ActivityLog).count()
    anomalous = db.query(ActivityLog).filter(ActivityLog.is_anomalous == True).count()
    
    # By Type
    types_count = {}
    for atype in ActivityType:
        count = db.query(ActivityLog).filter(ActivityLog.activity_type == atype).count()
        types_count[atype.value] = count
        
    return {
        "total_activities": total,
        "anomalous_activities": anomalous,
        "anomalous_percentage": round((anomalous / max(1, total)) * 100, 2),
        "activity_types": types_count
    }
