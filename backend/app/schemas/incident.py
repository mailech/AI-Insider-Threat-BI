from datetime import datetime
from typing import List, Optional, Any
from pydantic import BaseModel, ConfigDict


class IncidentCommentBase(BaseModel):
    author: str
    comment: str


class IncidentCommentCreate(BaseModel):
    comment: str


class IncidentCommentResponse(IncidentCommentBase):
    id: int
    incident_id: str
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentBase(BaseModel):
    title: str
    user_id: str
    severity: str
    status: str = "OPEN"
    assigned_analyst: Optional[str] = None
    description: str
    evidence_references: List[Any] = []
    root_cause: Optional[str] = None
    resolution: Optional[str] = None


class IncidentCreate(IncidentBase):
    incident_id: Optional[str] = None


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    severity: Optional[str] = None
    status: Optional[str] = None
    assigned_analyst: Optional[str] = None
    description: Optional[str] = None
    evidence_references: Optional[List[Any]] = None
    root_cause: Optional[str] = None
    resolution: Optional[str] = None


class IncidentResponse(IncidentBase):
    id: int
    incident_id: str
    created_at: datetime
    updated_at: datetime
    comments: List[IncidentCommentResponse] = []

    model_config = ConfigDict(from_attributes=True)
