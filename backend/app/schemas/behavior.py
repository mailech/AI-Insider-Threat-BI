"""Behavioral profiling and UEBA schemas."""

import uuid

from pydantic import BaseModel, ConfigDict


class WorkPatternPoint(BaseModel):
    day: str
    hours: float


class BehaviorProfileRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    employee_id: uuid.UUID
    typical_login_hour_start: int
    typical_login_hour_end: int
    typical_daily_logins: float
    typical_daily_downloads: float
    typical_daily_transfers: float
    typical_daily_emails: float
    typical_daily_data_volume_mb: float
    typical_device_count: int
    typical_applications: str


class BehaviorIndicator(BaseModel):
    name: str
    baseline_value: float
    observed_value: float
    deviation_percent: float
    trend: str  # Increasing / Decreasing / Stable


class PeerComparison(BaseModel):
    peer_group: str
    peer_count: int
    employee_average_risk: float
    peer_average_risk: float
    relative_position: str  # Above peers / In line with peers / Below peers


class BehaviorAnalysis(BaseModel):
    employee_id: uuid.UUID
    lookback_days: int
    profile: BehaviorProfileRead | None
    indicators: list[BehaviorIndicator]
    work_pattern: list[WorkPatternPoint]
    peer_comparison: PeerComparison | None
    risk_trend: str
