from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict


class AlertBase(BaseModel):
    user_id: str
    timestamp: str
    severity: str
    risk_score: float
    anomaly_score: float
    reasons: List[str] = []
    related_activities: List[Any] = []
    status: str = "NEW"
    assigned_analyst: Optional[str] = None
    notes: Optional[str] = None


class AlertCreate(AlertBase):
    alert_id: str


class AlertUpdate(BaseModel):
    status: Optional[str] = None
    assigned_analyst: Optional[str] = None
    notes: Optional[str] = None


class AlertResponse(AlertBase):
    id: int
    alert_id: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
