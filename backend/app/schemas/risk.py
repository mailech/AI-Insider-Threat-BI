"""Risk scoring schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.risk import RiskBand


class RiskFeatures(BaseModel):
    logon_count: float
    after_hours_logon_count: float
    usb_connect_count: float
    file_copy_count: float
    email_count: float


class RiskScoreRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID
    computed_at: datetime
    lookback_days: int
    logon_count: float
    after_hours_logon_count: float
    usb_connect_count: float
    file_copy_count: float
    email_count: float
    decision_function_score: float
    predict_label: int
    risk_score: float
    risk_band: RiskBand


class FleetRiskEntry(BaseModel):
    employee_id: uuid.UUID
    employee_code: str
    employee_name: str
    department: str
    risk_score: float
    risk_band: RiskBand
    decision_function_score: float
    computed_at: datetime


class FleetRiskSummary(BaseModel):
    total_scored: int
    fleet_average_score: float
    band_distribution: dict[str, int]
    results: list[FleetRiskEntry]
    service_available: bool
