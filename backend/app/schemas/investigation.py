"""Investigation schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.anomaly import Severity
from app.models.investigation import InvestigationStatus


class InvestigationEventRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    occurred_at: datetime
    event_type: str
    message: str
    actor_name: str | None


class InvestigationCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    employee_id: uuid.UUID
    description: str = ""
    severity: Severity = Severity.MEDIUM
    anomaly_id: uuid.UUID | None = None
    alert_id: uuid.UUID | None = None
    assigned_to_id: uuid.UUID | None = None


class InvestigationUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    severity: Severity | None = None
    status: InvestigationStatus | None = None
    note: str | None = None


class InvestigationAssign(BaseModel):
    assigned_to_id: uuid.UUID


class InvestigationResolve(BaseModel):
    resolution: str = Field(min_length=3)


class InvestigationEscalate(BaseModel):
    reason: str = Field(min_length=3)
    severity: Severity = Severity.CRITICAL


class InvestigationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    reference: str
    title: str
    description: str
    status: InvestigationStatus
    severity: Severity
    employee_id: uuid.UUID
    employee_name: str | None = None
    anomaly_id: uuid.UUID | None
    alert_id: uuid.UUID | None
    risk_score_id: uuid.UUID | None
    created_by_id: uuid.UUID | None
    assigned_to_id: uuid.UUID | None
    assigned_to_name: str | None = None
    resolved_by_id: uuid.UUID | None
    resolution: str | None
    resolved_at: datetime | None
    closed_at: datetime | None
    created_at: datetime
    updated_at: datetime
    events: list[InvestigationEventRead] = []
