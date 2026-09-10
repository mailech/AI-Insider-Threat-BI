from typing import Optional, List, Dict, Any
from pydantic import BaseModel


class RiskFactor(BaseModel):
    name: str
    score: int
    weight: str


class SecurityEvent(BaseModel):
    id: str
    title: str
    severity: str
    timestamp: str
    source: str
    description: str


class EmployeeBase(BaseModel):
    id: str
    name: str
    department: str
    role: str
    status: str
    email: str
    workstation: str
    ip_address: str
    location: str
    risk_level: str
    score: int
    last_activity: str
    seen: str
    avatar_bg: Optional[str] = "#e8f0fe"
    avatar_color: Optional[str] = "#1a73e8"
    initial: Optional[str] = "ID"
    details: Optional[str] = None


class EmployeeRead(EmployeeBase):
    behavioral_indicators: List[str] = []
    risk_factors: List[Dict[str, Any]] = []
    security_events: List[Dict[str, Any]] = []

    class Config:
        from_attributes = True


class EmployeeListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    items: List[EmployeeRead]


class ContainmentResponse(BaseModel):
    id: str
    status: str
    score: int
    risk_level: str
    message: str
