"""Anomaly schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.anomaly import AnomalyCategory, AnomalyStatus, Severity


class AnomalyRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    detected_at: datetime
    category: AnomalyCategory
    severity: Severity
    status: AnomalyStatus
    description: str
    baseline_deviation: float
    observed_value: float
    baseline_value: float


class AnomalyStatusUpdate(BaseModel):
    status: AnomalyStatus


class AnomalyScanRequest(BaseModel):
    employee_id: uuid.UUID | None = None
    lookback_days: int = 30


class AnomalyScanResponse(BaseModel):
    scanned_employees: int
    created: int
    alerts_created: int
    notifications_created: int
    anomalies: list[AnomalyRead]
