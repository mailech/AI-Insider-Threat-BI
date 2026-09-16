"""Activity log schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.activity import ActivityType


class ActivityCreate(BaseModel):
    employee_id: uuid.UUID
    timestamp: datetime
    activity_type: ActivityType
    source: str = Field(min_length=1, max_length=120)
    device: str = Field(min_length=1, max_length=120)
    ip_address: str = Field(min_length=3, max_length=45)
    application: str | None = None
    data_volume_mb: float = 0.0
    details: str | None = None


class ActivityRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    timestamp: datetime
    activity_type: ActivityType
    source: str
    device: str
    ip_address: str
    application: str | None
    data_volume_mb: float
    details: str | None
