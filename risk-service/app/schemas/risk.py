from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class RiskScoreRequest(BaseModel):
    employee_id: str = Field(..., min_length=2, max_length=120)
    anomaly_score: float = Field(..., ge=0, le=100)
    baseline_distance: float = Field(..., ge=0, le=100)
    peer_distance: float = Field(..., ge=0, le=100)
    historical_weight: float = Field(default=0.5, ge=0, le=1)
    explanation: str = Field(..., min_length=5, max_length=500)


class RiskScoreResponse(BaseModel):
    employee_id: str
    severity: str
    score: float
    score_breakdown: dict[str, float]
    trend_direction: str
    historical_weight: float
    computed_at: datetime
    explanation: str


class RiskTimelineResponse(BaseModel):
    employee_id: str
    timeline: list[dict[str, Any]]
