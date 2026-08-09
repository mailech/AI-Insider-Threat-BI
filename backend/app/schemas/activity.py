from datetime import datetime
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import EventSource, EventType

T = TypeVar("T")


class Page(BaseModel, Generic[T]):
    items: list[T]
    total: int
    page: int
    page_size: int


class ActivityEventBase(BaseModel):
    employee_id: int
    device_id: int | None = None
    event_type: EventType
    source: EventSource = EventSource.ENDPOINT_AGENT
    timestamp: datetime | None = None
    ip_address: str | None = None
    bytes_transferred: int = Field(default=0, ge=0)
    details: dict | None = None


class ActivityEventCreate(ActivityEventBase):
    pass


class ActivityEventRead(ActivityEventBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    timestamp: datetime
    is_after_hours: bool
    employee_name: str | None = None


class IngestionResult(BaseModel):
    received: int
    inserted: int
    rejected: int
    errors: list[str]


class TimeBucket(BaseModel):
    date: str
    count: int


class TypeCount(BaseModel):
    event_type: str
    count: int


class TopEmployee(BaseModel):
    employee_id: int
    full_name: str
    department: str | None
    count: int


class DashboardSummary(BaseModel):
    total_employees: int
    active_employees: int
    total_events: int
    events_last_24h: int
    after_hours_events: int
    usb_events: int
    failed_logins: int
    total_bytes_transferred: int
    events_over_time: list[TimeBucket]
    events_by_type: list[TypeCount]
    top_active_employees: list[TopEmployee]
    recent_events: list[ActivityEventRead]
