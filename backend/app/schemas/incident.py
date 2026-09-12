"""Investigation, alert and notification schemas (modules 7, 9, 11)."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import (
    AlertStatus,
    IncidentStatus,
    NotificationType,
    Severity,
)


# ---------- Alerts ----------
class AlertOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department: Optional[str] = None
    anomaly_id: Optional[int] = None
    incident_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    severity: str
    status: str
    category: Optional[str] = None
    risk_score: float
    priority: int
    occurrence_count: int = 1
    first_seen_at: Optional[datetime] = None
    last_seen_at: Optional[datetime] = None
    assigned_to_id: Optional[int] = None
    assignee_name: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    resolution_note: Optional[str] = None
    triggered_at: datetime


class AlertCreate(BaseModel):
    employee_id: int
    title: str
    description: Optional[str] = None
    severity: Severity = Severity.MEDIUM
    category: Optional[str] = None
    anomaly_id: Optional[int] = None


class AlertUpdate(BaseModel):
    status: Optional[AlertStatus] = None
    severity: Optional[Severity] = None
    assigned_to_id: Optional[int] = None
    resolution_note: Optional[str] = None


# ---------- Incidents / investigations ----------
class EvidenceCreate(BaseModel):
    evidence_type: str = "activity_event"
    reference_id: Optional[int] = None
    title: str
    description: Optional[str] = None
    payload: Optional[str] = None


class EvidenceOut(EvidenceCreate):
    model_config = ConfigDict(from_attributes=True)
    id: int
    incident_id: int
    hash_value: Optional[str] = None
    collected_by_id: Optional[int] = None
    collected_at: datetime


class TimelineEntryCreate(BaseModel):
    entry_type: str = "note"
    title: str
    description: Optional[str] = None
    severity: Optional[Severity] = None
    occurred_at: Optional[datetime] = None
    reference_id: Optional[int] = None


class TimelineEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    incident_id: int
    entry_type: str
    title: str
    description: Optional[str] = None
    severity: Optional[str] = None
    occurred_at: datetime
    actor_id: Optional[int] = None
    reference_id: Optional[int] = None


class NoteCreate(BaseModel):
    body: str = Field(min_length=1)


class NoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    incident_id: int
    author_id: Optional[int] = None
    author_name: Optional[str] = None
    body: str
    created_at: datetime


class IncidentCreate(BaseModel):
    employee_id: int
    title: str
    summary: Optional[str] = None
    category: Optional[str] = None
    severity: Severity = Severity.MEDIUM
    assigned_to_id: Optional[int] = None
    alert_ids: List[int] = []
    anomaly_ids: List[int] = []
    auto_build_timeline: bool = True


class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    summary: Optional[str] = None
    severity: Optional[Severity] = None
    status: Optional[IncidentStatus] = None
    assigned_to_id: Optional[int] = None
    resolution: Optional[str] = None
    root_cause: Optional[str] = None
    outcome: Optional[str] = None


class IncidentEscalate(BaseModel):
    escalated_to_id: int
    reason: str


class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    reference: str
    employee_id: int
    employee_name: Optional[str] = None
    employee_code: Optional[str] = None
    department: Optional[str] = None
    title: str
    summary: Optional[str] = None
    category: Optional[str] = None
    severity: str
    status: str
    risk_score: float
    assigned_to_id: Optional[int] = None
    assignee_name: Optional[str] = None
    escalated: bool
    detected_at: datetime
    opened_at: datetime
    first_response_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    resolution: Optional[str] = None
    root_cause: Optional[str] = None
    outcome: Optional[str] = None
    alert_count: int = 0
    evidence_count: int = 0


class IncidentDetail(IncidentOut):
    timeline: List[TimelineEntryOut] = []
    evidence: List[EvidenceOut] = []
    notes: List[NoteOut] = []
    alerts: List[AlertOut] = []
    correlated_events: List[Dict[str, Any]] = []
    risk_history: List[Dict[str, Any]] = []
    device_analysis: List[Dict[str, Any]] = []


# ---------- Notifications ----------
class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    type: str
    severity: str
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
    is_read: bool
    created_at: datetime


class NotificationCreate(BaseModel):
    user_ids: List[int] = []
    roles: List[str] = []
    type: NotificationType = NotificationType.SYSTEM
    severity: Severity = Severity.INFORMATIONAL
    title: str
    body: Optional[str] = None
    link: Optional[str] = None
