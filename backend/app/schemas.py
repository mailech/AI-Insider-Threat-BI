from datetime import datetime
from pydantic import BaseModel


class EmployeeCreate(BaseModel):
    employee_id: str
    name: str
    email: str
    department: str | None = None
    role: str | None = None


class EmployeeResponse(EmployeeCreate):
    id: int
    status: str

    class Config:
        from_attributes = True


class AlertStatusUpdate(BaseModel):
    status: str  # NEW, ACKNOWLEDGED, UNDER_INVESTIGATION, RESOLVED, CLOSED


class AlertAssignRequest(BaseModel):
    assigned_to: str


class AlertResolveRequest(BaseModel):
    resolution_notes: str | None = None


class AlertResponse(BaseModel):
    id: int
    alert_id: str
    employee_id: str
    risk_score: float
    threat_level: str
    activity_type: str | None = None
    description: str | None = None
    status: str
    assigned_to: str | None = None
    resolution_notes: str | None = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class RiskHistoryResponse(BaseModel):
    id: int
    employee_id: str
    threat_score: float
    threat_level: str
    anomaly_factor: float
    frequency_factor: float
    asset_criticality_factor: float
    severity_factor: float
    timestamp: datetime

    class Config:
        from_attributes = True


class AuditLogResponse(BaseModel):
    id: int
    actor: str
    action: str
    target: str | None = None
    status: str
    details: str | None = None
    timestamp: datetime

    class Config:
        from_attributes = True