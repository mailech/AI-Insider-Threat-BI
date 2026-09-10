from typing import Optional
from pydantic import BaseModel


class InvestigationCreate(BaseModel):
    employee_id: str
    alert_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    severity: str = "Medium"


class InvestigationAssign(BaseModel):
    assigned_analyst: str


class InvestigationStatusUpdate(BaseModel):
    status: str


class InvestigationResolve(BaseModel):
    resolution_notes: str


class InvestigationResponse(BaseModel):
    id: int
    investigation_id: str
    employee_id: str
    alert_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    severity: str
    status: str
    assigned_analyst: Optional[str] = None
    resolution_notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    resolved_at: Optional[str] = None