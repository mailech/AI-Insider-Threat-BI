from datetime import datetime
from enum import Enum
from pydantic import BaseModel, Field


class ActivityType(str, Enum):
    login = "login"
    file_download = "file_download"
    file_upload = "file_upload"
    data_transfer = "data_transfer"
    privilege_change = "privilege_change"
    remote_access = "remote_access"


class ActivityEventCreate(BaseModel):
    employee_id: str = Field(min_length=1, max_length=100)
    event_type: ActivityType
    occurred_at: datetime
    source: str = Field(min_length=1, max_length=100)
    metadata: dict[str, str | int | float | bool] = Field(default_factory=dict)
