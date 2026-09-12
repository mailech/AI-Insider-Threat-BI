"""Activity monitoring endpoints (module 3)."""
from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, Request, UploadFile, status
from sqlalchemy import Integer, func, select
from sqlalchemy.orm import Session

from app.api.deps import client_ip, require_analyst, require_soc
from app.db.session import get_db
from app.ml import features as F
from app.models.activity import ActivityEvent
from app.models.employee import Employee
from app.models.enums import ActivityType, LogSource
from app.models.user import User
from app.schemas.activity import (
    ActivityBulkIngest,
    ActivityEventCreate,
    ActivityEventOut,
    ActivityStats,
    IngestResult,
)
from app.schemas.common import Page
from app.services import audit, ingestion

router = APIRouter(prefix="/activity", tags=["Activity Monitoring"])

MAX_UPLOAD_BYTES = 25 * 1024 * 1024


def _row(event: ActivityEvent) -> dict:
    data = {c.name: getattr(event, c.name) for c in ActivityEvent.__table__.columns}
    data["employee_name"] = event.employee.full_name if event.employee else None
    return data


@router.get("/events", response_model=Page[ActivityEventOut])
def list_events(
    employee_id: Optional[int] = None,
    activity_type: Optional[ActivityType] = None,
    log_source: Optional[LogSource] = None,
    after_hours: Optional[bool] = None,
    external_only: Optional[bool] = None,
    start: Optional[datetime] = None,
    end: Optional[datetime] = None,
    page: int = Query(1, ge=1),
    size: int = Query(50, ge=1, le=200),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    stmt = select(ActivityEvent)
    if employee_id:
        stmt = stmt.where(ActivityEvent.employee_id == employee_id)
    if activity_type:
        stmt = stmt.where(ActivityEvent.activity_type == activity_type.value)
    if log_source:
        stmt = stmt.where(ActivityEvent.log_source == log_source.value)
    if after_hours is not None:
        stmt = stmt.where(ActivityEvent.is_after_hours.is_(after_hours))
    if external_only:
        stmt = stmt.where(ActivityEvent.is_external.is_(True))
    if start:
        stmt = stmt.where(ActivityEvent.event_time >= F.as_utc(start))
    if end:
        stmt = stmt.where(ActivityEvent.event_time <= F.as_utc(end))

    total = int(db.execute(select(func.count()).select_from(stmt.subquery())).scalar_one())
    rows = db.execute(
        stmt.order_by(ActivityEvent.event_time.desc()).offset((page - 1) * size).limit(size)
    ).scalars().all()
    return {
        "items": [_row(e) for e in rows],
        "total": total,
        "page": page,
        "size": size,
        "pages": max(1, (total + size - 1) // size),
    }


@router.post("/events", response_model=IngestResult, status_code=status.HTTP_201_CREATED)
def ingest_event(
    payload: ActivityEventCreate,
    request: Request,
    user: User = Depends(require_soc),
    db: Session = Depends(get_db),
) -> Any:
    """Single-event ingestion (agent / webhook style)."""
    result = ingestion.ingest_events(db, [payload], run_detection=True)
    audit.record(db, "activity.ingest_single", user, "activity", None, str(result), client_ip(request))
    db.commit()
    if result["ingested"] == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=result["errors"][0] if result["errors"] else "Event could not be ingested",
        )
    return result


@router.post("/ingest", response_model=IngestResult)
def ingest_batch(
    payload: ActivityBulkIngest,
    request: Request,
    user: User = Depends(require_soc),
    db: Session = Depends(get_db),
) -> Any:
    """Bulk log ingestion pipeline: normalise, enrich, detect, score and alert."""
    result = ingestion.ingest_events(db, payload.events, run_detection=payload.run_detection)
    audit.record(
        db, "activity.ingest_batch", user, "activity", None,
        f"ingested={result['ingested']} anomalies={result['anomalies_detected']}", client_ip(request),
    )
    db.commit()
    return result


@router.post("/upload", response_model=IngestResult)
async def upload_logs(
    request: Request,
    file: UploadFile = File(...),
    run_detection: bool = Query(True),
    user: User = Depends(require_soc),
    db: Session = Depends(get_db),
) -> Any:
    """Upload a CSV log export (CERT / LANL / SIEM style) for ingestion."""
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only .csv files are supported")
    content = await file.read()
    if len(content) > MAX_UPLOAD_BYTES:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB upload limit",
        )
    result = ingestion.ingest_csv(db, content, run_detection=run_detection)
    audit.record(
        db, "activity.upload_csv", user, "activity", None,
        f"file={file.filename} ingested={result['ingested']}", client_ip(request),
    )
    db.commit()
    return result


@router.get("/stats", response_model=ActivityStats)
def activity_stats(
    employee_id: Optional[int] = None,
    days: int = Query(30, ge=1, le=365),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Monitoring statistics for the activity dashboards."""
    since = datetime.now(timezone.utc) - timedelta(days=days)
    conditions = [ActivityEvent.event_time >= since]
    if employee_id:
        conditions.append(ActivityEvent.employee_id == employee_id)

    total = int(db.execute(select(func.count(ActivityEvent.id)).where(*conditions)).scalar_one())
    by_type = {
        r[0]: int(r[1])
        for r in db.execute(
            select(ActivityEvent.activity_type, func.count(ActivityEvent.id))
            .where(*conditions)
            .group_by(ActivityEvent.activity_type)
            .order_by(func.count(ActivityEvent.id).desc())
        ).all()
    }
    by_source = {
        r[0]: int(r[1])
        for r in db.execute(
            select(ActivityEvent.log_source, func.count(ActivityEvent.id))
            .where(*conditions)
            .group_by(ActivityEvent.log_source)
        ).all()
    }
    after_hours = int(
        db.execute(
            select(func.count(ActivityEvent.id)).where(*conditions, ActivityEvent.is_after_hours.is_(True))
        ).scalar_one()
    )
    weekend = int(
        db.execute(
            select(func.count(ActivityEvent.id)).where(*conditions, ActivityEvent.is_weekend.is_(True))
        ).scalar_one()
    )
    external = int(
        db.execute(
            select(func.count(ActivityEvent.id)).where(*conditions, ActivityEvent.is_external.is_(True))
        ).scalar_one()
    )
    total_bytes = float(
        db.execute(
            select(func.coalesce(func.sum(ActivityEvent.bytes_transferred), 0.0)).where(*conditions)
        ).scalar_one()
    )

    buckets: dict = {}
    for offset in range(days, -1, -1):
        key = (datetime.now(timezone.utc) - timedelta(days=offset)).date().isoformat()
        buckets[key] = {"date": key, "events": 0, "megabytes": 0.0}
    for ts, size in db.execute(
        select(ActivityEvent.event_time, ActivityEvent.bytes_transferred).where(*conditions)
    ).all():
        key = F.as_utc(ts).date().isoformat()
        if key in buckets:
            buckets[key]["events"] += 1
            buckets[key]["megabytes"] = round(buckets[key]["megabytes"] + (size or 0.0) / F.MB, 3)

    return {
        "total_events": total,
        "by_type": by_type,
        "by_source": by_source,
        "after_hours_events": after_hours,
        "weekend_events": weekend,
        "external_transfers": external,
        "total_bytes": round(total_bytes, 2),
        "timeline": list(buckets.values()),
    }


@router.get("/employees/{employee_id}/timeline", response_model=List[ActivityEventOut])
def employee_timeline(
    employee_id: int,
    days: int = Query(14, ge=1, le=180),
    limit: int = Query(200, ge=1, le=1000),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Chronological activity timeline for one employee."""
    if not db.get(Employee, employee_id):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Employee not found")
    since = datetime.now(timezone.utc) - timedelta(days=days)
    rows = db.execute(
        select(ActivityEvent)
        .where(ActivityEvent.employee_id == employee_id, ActivityEvent.event_time >= since)
        .order_by(ActivityEvent.event_time.desc())
        .limit(limit)
    ).scalars().all()
    return [_row(e) for e in rows]
