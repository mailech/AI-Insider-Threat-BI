from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, ConfigDict


class EmployeeBase(BaseModel):
    user_id: str
    full_name: str
    email: str
    department: str
    role: str
    manager: Optional[str] = None
    devices: List[str] = []
    access_privileges: List[str] = []
    is_monitored: bool = True


class EmployeeResponse(EmployeeBase):
    id: int
    current_risk_score: float
    current_severity: str
    anomaly_count: int
    alert_count: int
    last_active_date: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class EmployeeDetailResponse(EmployeeResponse):
    behavioral_baseline: Dict[str, Any] = {}
    recent_anomalies: List[Dict[str, Any]] = []
    recent_alerts: List[Dict[str, Any]] = []
    recent_incidents: List[Dict[str, Any]] = []
    risk_history: List[Dict[str, Any]] = []
    activity_timeline: List[Dict[str, Any]] = []
