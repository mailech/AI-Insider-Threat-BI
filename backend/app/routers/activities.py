from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.deps import get_current_user

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.post("", response_model=schemas.ActivityOut)
def ingest_activity(
    payload: schemas.ActivityCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    """Ingests a single activity event (Module 3: Activity Monitoring Engine)."""
    data = payload.dict()
    ts = data.pop("timestamp") or datetime.utcnow()
    event = models.ActivityEvent(timestamp=ts, **data)
    db.add(event)
    db.commit()
    db.refresh(event)
    return event


@router.get("", response_model=list[schemas.ActivityOut])
def list_activities(
    employee_id: str | None = None,
    event_type: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    q = db.query(models.ActivityEvent)
    if employee_id:
        q = q.filter(models.ActivityEvent.employee_id == employee_id)
    if event_type:
        q = q.filter(models.ActivityEvent.event_type == event_type)
    return q.order_by(models.ActivityEvent.timestamp.desc()).limit(limit).all()
