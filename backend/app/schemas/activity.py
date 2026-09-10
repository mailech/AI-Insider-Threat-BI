from typing import Optional, Dict, Any, List
from datetime import datetime
from pydantic import BaseModel


class ActivityLogCreate(BaseModel):
    employee_id: str
    activity_type: str
    source_ip: Optional[str] = "127.0.0.1"
    workstation: Optional[str] = "WS-UNKNOWN"
    details: Optional[Dict[str, Any]] = {}
    is_anomalous: Optional[bool] = False
    anomaly_score: Optional[int] = 0


class ActivityLogRead(BaseModel):
    id: int
    employee_id: str
    activity_type: str
    source_ip: str
    workstation: str
    timestamp: datetime
    details: Dict[str, Any]
    is_anomalous: bool
    anomaly_score: int

    class Config:
        from_attributes = True


class ActivityIngestResponse(BaseModel):
    status: str
    ingested_count: int
    anomalies_flagged: int
