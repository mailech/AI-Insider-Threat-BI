from datetime import datetime

from pydantic import BaseModel, Field


class AlertResponse(BaseModel):
    id: int
    employee_id: str
    severity: str
    status: str
    description: str
    assigned_analyst: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None

    class Config:
        from_attributes = True


class AlertAssignRequest(BaseModel):
    assigned_analyst: str = Field(
        min_length=1,
        max_length=150
    )


class AlertStatusUpdate(BaseModel):
    status: str = Field(
        min_length=1,
        max_length=30
    )