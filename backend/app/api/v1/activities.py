"""Activity monitoring: browsing the event stream and ingesting new batches."""

from datetime import datetime

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import any_role, soc_or_above
from app.db.session import get_db
from app.models.activity import ActivityEvent
from app.models.employee import Employee
from app.models.enums import EventType
from app.models.user import User
from app.schemas.activity import (
    ActivityEventCreate,
    ActivityEventRead,
    IngestionResult,
    Page,
)
from app.services.ingestion import ingest_csv, is_after_hours

router = APIRouter(prefix="/activities", tags=["activities"])

MAX_UPLOAD_BYTES = 10 * 1024 * 1024


@router.get("", response_model=Page[ActivityEventRead])
def list_activities(
    employee_id: int | None = None,
    event_type: EventType | None = None,
    start: datetime | None = None,
    end: datetime | None = None,
    after_hours: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=500),
    db: Session = Depends(get_db),
    _: User = Depends(any_role),
) -> Page[ActivityEventRead]:
    query = select(ActivityEvent).options(selectinload(ActivityEvent.employee))
    count_query = select(func.count()).select_from(ActivityEvent)

    filters = []
    if employee_id is not None:
        filters.append(ActivityEvent.employee_id == employee_id)
    if event_type is not None:
        filters.append(ActivityEvent.event_type == event_type)
    if start is not None:
        filters.append(ActivityEvent.timestamp >= start.replace(tzinfo=None))
    if end is not None:
        filters.append(ActivityEvent.timestamp <= end.replace(tzinfo=None))
    if after_hours is not None:
        filters.append(ActivityEvent.is_after_hours.is_(after_hours))

    for clause in filters:
        query = query.where(clause)
        count_query = count_query.where(clause)

    total = db.scalar(count_query) or 0
    rows = db.scalars(
        query.order_by(ActivityEvent.timestamp.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()

    return Page[ActivityEventRead](
        items=[ActivityEventRead.model_validate(row) for row in rows],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.post("", response_model=ActivityEventRead, status_code=status.HTTP_201_CREATED)
def create_activity(
    payload: ActivityEventCreate,
    db: Session = Depends(get_db),
    _: User = Depends(soc_or_above),
) -> ActivityEventRead:
    if db.get(Employee, payload.employee_id) is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found"
        )

    data = payload.model_dump()
    timestamp = data.pop("timestamp", None) or datetime.utcnow()
    if timestamp.tzinfo is not None:
        timestamp = timestamp.replace(tzinfo=None)

    event = ActivityEvent(**data, timestamp=timestamp, is_after_hours=is_after_hours(timestamp))
    db.add(event)
    db.commit()
    db.refresh(event)
    return ActivityEventRead.model_validate(event)


@router.post("/ingest", response_model=IngestionResult)
async def ingest_activities(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(soc_or_above),
) -> IngestionResult:
    """Bulk-load a CSV export.

    Columns: employee_code, event_type, timestamp[, source, ip_address,
    bytes_transferred, details].
    """
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="Upload exceeds the 10 MB limit",
        )
    return ingest_csv(db, content)
