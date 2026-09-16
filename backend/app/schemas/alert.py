"""Alert and notification schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.alert import AlertStatus
from app.models.anomaly import Severity


class AlertRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    anomaly_id: uuid.UUID | None
    raised_at: datetime
    title: str
    description: str
    severity: Severity
    status: AlertStatus


class AlertStatusUpdate(BaseModel):
    status: AlertStatus


class NotificationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    notification_type: str
    severity: Severity
    title: str
    message: str
    is_read: bool
    occurred_at: datetime
    employee_id: uuid.UUID | None
    anomaly_id: uuid.UUID | None
    alert_id: uuid.UUID | None
    investigation_id: uuid.UUID | None
