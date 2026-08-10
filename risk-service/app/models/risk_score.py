from __future__ import annotations

from datetime import datetime
from enum import Enum

from pydantic import BaseModel, Field


class RiskSeverity(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskScore(BaseModel):
    employee_id: str = Field(..., min_length=2, max_length=120)
    severity: RiskSeverity
    score: float = Field(..., ge=0, le=100)
    score_breakdown: dict[str, float] = Field(default_factory=dict)
    trend_direction: str = Field(default="stable")
    historical_weight: float = Field(default=0.0, ge=0, le=1)
    computed_at: datetime = Field(default_factory=datetime.utcnow)
    explanation: str = Field(..., min_length=5, max_length=500)


class RiskTimelineEntry(BaseModel):
    employee_id: str
    score: float
    severity: RiskSeverity
    timestamp: datetime
    explanation: str
