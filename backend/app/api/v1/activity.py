"""Activity log endpoints."""

import uuid
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.activity import ActivityLog, ActivityType
from app.models.user import User
from app.schemas.activity import ActivityCreate, ActivityRead

router = APIRouter(prefix="/activity", tags=["activity"])


@router.get(
    "",
    response_model=list[ActivityRead],
    summary="List activity logs with optional filters",
)
def list_activity(
    employee_id: uuid.UUID | None = Query(None),
    activity_type: ActivityType | None = Query(None),
    since: datetime | None = Query(None, description="ISO-8601 timestamp lower bound"),
    until: datetime | None = Query(None, description="ISO-8601 timestamp upper bound"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> list[ActivityLog]:
    q = select(ActivityLog).order_by(ActivityLog.timestamp.desc()).offset(skip).limit(limit)
    if employee_id:
        q = q.where(ActivityLog.employee_id == employee_id)
    if activity_type:
        q = q.where(ActivityLog.activity_type == activity_type)
    if since:
        q = q.where(ActivityLog.timestamp >= since)
    if until:
        q = q.where(ActivityLog.timestamp <= until)
    return list(db.scalars(q))


@router.get(
    "/{log_id}",
    response_model=ActivityRead,
    summary="Get a single activity log entry",
)
def get_activity(
    log_id: uuid.UUID,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ActivityLog:
    log = db.get(ActivityLog, log_id)
    if log is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Activity log not found.")
    return log


@router.post(
    "",
    response_model=ActivityRead,
    status_code=status.HTTP_201_CREATED,
    summary="Create an activity log entry",
)
def create_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> ActivityLog:
    log = ActivityLog(**payload.model_dump())
    db.add(log)
    db.commit()
    db.refresh(log)
    return log
