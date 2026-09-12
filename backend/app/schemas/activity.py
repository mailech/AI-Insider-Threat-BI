"""Activity monitoring schemas (module 3)."""
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import ActivityType, LogSource


class ActivityEventCreate(BaseModel):
    employee_id: Optional[int] = None
    employee_code: Optional[str] = None  # alternative identifier for log ingestion
    activity_type: ActivityType
    log_source: LogSource = LogSource.MANUAL
    event_time: datetime
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    hostname: Optional[str] = None
    resource: Optional[str] = None
    application: Optional[str] = None
    destination: Optional[str] = None
    country: Optional[str] = None
    bytes_transferred: float = 0.0
    duration_seconds: float = 0.0
    file_count: int = 0
    is_external: bool = False
    is_removable_media: bool = False
    success: bool = True
    sensitivity: Optional[str] = None
    raw_payload: Optional[str] = None


class ActivityBulkIngest(BaseModel):
    events: List[ActivityEventCreate] = Field(min_length=1, max_length=5000)
    run_detection: bool = True


class ActivityEventOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    activity_type: str
    log_source: str
    event_time: datetime
    device_id: Optional[str] = None
    ip_address: Optional[str] = None
    hostname: Optional[str] = None
    resource: Optional[str] = None
    application: Optional[str] = None
    destination: Optional[str] = None
    country: Optional[str] = None
    bytes_transferred: float
    duration_seconds: float
    file_count: int
    is_after_hours: bool
    is_weekend: bool
    is_external: bool
    is_removable_media: bool
    success: bool
    sensitivity: Optional[str] = None
    created_at: datetime


class IngestResult(BaseModel):
    ingested: int
    skipped: int
    anomalies_detected: int = 0
    alerts_created: int = 0
    employees_touched: int = 0
    errors: List[str] = []


class ActivityStats(BaseModel):
    total_events: int
    by_type: dict
    by_source: dict
    after_hours_events: int
    weekend_events: int
    external_transfers: int
    total_bytes: float
    timeline: List[dict] = []
