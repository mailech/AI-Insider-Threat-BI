"""Aggregates powering the analyst dashboard."""

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.core.deps import any_role
from app.db.session import get_db
from app.models.activity import ActivityEvent
from app.models.employee import Department, Employee
from app.models.enums import EmployeeStatus, EventType
from app.models.user import User
from app.schemas.activity import (
    ActivityEventRead,
    DashboardSummary,
    TimeBucket,
    TopEmployee,
    TypeCount,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _count_events(db: Session, *filters) -> int:
    query = select(func.count()).select_from(ActivityEvent)
    for clause in filters:
        query = query.where(clause)
    return db.scalar(query) or 0


@router.get("/summary", response_model=DashboardSummary)
def summary(
    days: int = Query(default=30, ge=1, le=365),
    db: Session = Depends(get_db),
    _: User = Depends(any_role),
) -> DashboardSummary:
    now = datetime.utcnow()
    window_start = now - timedelta(days=days)

    total_employees = db.scalar(select(func.count()).select_from(Employee)) or 0
    active_employees = (
        db.scalar(
            select(func.count())
            .select_from(Employee)
            .where(Employee.status == EmployeeStatus.ACTIVE)
        )
        or 0
    )

    in_window = ActivityEvent.timestamp >= window_start

    events_over_time = [
        TimeBucket(date=str(bucket), count=count)
        for bucket, count in db.execute(
            select(func.date(ActivityEvent.timestamp), func.count())
            .where(in_window)
            .group_by(func.date(ActivityEvent.timestamp))
            .order_by(func.date(ActivityEvent.timestamp))
        )
    ]

    events_by_type = [
        TypeCount(event_type=event_type.value, count=count)
        for event_type, count in db.execute(
            select(ActivityEvent.event_type, func.count())
            .where(in_window)
            .group_by(ActivityEvent.event_type)
            .order_by(func.count().desc())
        )
    ]

    top_active_employees = [
        TopEmployee(
            employee_id=employee_id,
            full_name=full_name,
            department=department,
            count=count,
        )
        for employee_id, full_name, department, count in db.execute(
            select(
                Employee.id,
                Employee.full_name,
                Department.name,
                func.count(ActivityEvent.id),
            )
            .join(ActivityEvent, ActivityEvent.employee_id == Employee.id)
            .outerjoin(Department, Employee.department_id == Department.id)
            .where(in_window)
            .group_by(Employee.id, Employee.full_name, Department.name)
            .order_by(func.count(ActivityEvent.id).desc())
            .limit(10)
        )
    ]

    recent_events = [
        ActivityEventRead.model_validate(row)
        for row in db.scalars(
            select(ActivityEvent)
            .options(selectinload(ActivityEvent.employee))
            .order_by(ActivityEvent.timestamp.desc())
            .limit(15)
        )
    ]

    return DashboardSummary(
        total_employees=total_employees,
        active_employees=active_employees,
        total_events=_count_events(db),
        events_last_24h=_count_events(db, ActivityEvent.timestamp >= now - timedelta(days=1)),
        after_hours_events=_count_events(db, in_window, ActivityEvent.is_after_hours.is_(True)),
        usb_events=_count_events(db, in_window, ActivityEvent.event_type == EventType.USB_CONNECT),
        failed_logins=_count_events(
            db, in_window, ActivityEvent.event_type == EventType.FAILED_LOGIN
        ),
        total_bytes_transferred=int(
            db.scalar(
                select(func.coalesce(func.sum(ActivityEvent.bytes_transferred), 0)).where(
                    in_window
                )
            )
            or 0
        ),
        events_over_time=events_over_time,
        events_by_type=events_by_type,
        top_active_employees=top_active_employees,
        recent_events=recent_events,
    )
