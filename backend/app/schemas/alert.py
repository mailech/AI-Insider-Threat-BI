from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class AlertBase(BaseModel):
    id: str
    title: str
    severity: str
    status: str
    employee_id: str
    employee_name: str
    department: str
    timestamp: str
    vector: str
    summary: str
    evidence: List[Dict[str, Any]] = []


class AlertRead(AlertBase):
    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    status: str


class AlertListResponse(BaseModel):
    total: int
    items: List[AlertRead]
