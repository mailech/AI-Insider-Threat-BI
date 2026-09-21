from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr
from app.models import UserRole, RiskLevel, AlertSeverity, IncidentStatus, ActivityType

# Auth & User Schemas
class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserRegister(BaseModel):
    email: EmailStr
    name: str
    password: str
    role: UserRole = UserRole.SECURITY_ANALYST
    department: str = "Security Operations"

class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: UserRole
    department: str
    is_active: bool
    created_at: datetime
    last_login: Optional[datetime] = None

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Employee Schemas
class EmployeeBase(BaseModel):
    employee_id: str
    name: str
    email: str
    department: str
    designation: str
    manager: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None
    access_privileges: Optional[List[str]] = None
    status: str = "Active"

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    name: Optional[str] = None
    department: Optional[str] = None
    designation: Optional[str] = None
    manager: Optional[str] = None
    device_info: Optional[Dict[str, Any]] = None
    access_privileges: Optional[List[str]] = None
    status: Optional[str] = None
    risk_score: Optional[float] = None
    risk_level: Optional[RiskLevel] = None

class EmployeeResponse(EmployeeBase):
    id: int
    risk_score: float
    risk_level: RiskLevel
    is_red_team: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Activity Log Schemas
class ActivityCreate(BaseModel):
    employee_id: str
    activity_type: ActivityType
    action: str
    resource: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    ip_address: Optional[str] = "10.0.0.1"
    device_id: Optional[str] = "device-primary"
    is_anomalous: Optional[bool] = False
    anomaly_reason: Optional[str] = None
    severity: Optional[AlertSeverity] = AlertSeverity.LOW

class ActivityResponse(BaseModel):
    id: int
    timestamp: datetime
    employee_id: str
    activity_type: ActivityType
    action: str
    resource: Optional[str] = None
    details: Dict[str, Any]
    ip_address: str
    device_id: str
    is_anomalous: bool
    anomaly_reason: Optional[str] = None
    severity: AlertSeverity

    class Config:
        from_attributes = True

# Behavioral Profile & UEBA Schemas
class BehavioralProfileResponse(BaseModel):
    id: int
    employee_id: str
    mean_login_hour: float
    mean_logout_hour: float
    files_per_day: float
    usb_per_day: float
    emails_per_day: float
    network_mb_per_day: float
    out_of_session_access: int
    degree_centrality: float
    betweenness_centrality: float
    keyword_flag_ratio: float
    peer_group_deviation: float
    z_score_composite: float
    updated_at: datetime

    class Config:
        from_attributes = True

# Anomaly Scores Schemas
class AnomalyScoreResponse(BaseModel):
    id: int
    employee_id: str
    timestamp: datetime
    isolation_forest: float
    oneclass_svm: float
    autoencoder: float
    graph_analytics: float
    gnn_score: float
    ensemble_score: float
    shap_explanation: Dict[str, Any]
    lime_explanation: Dict[str, Any]

    class Config:
        from_attributes = True

# Insider Risk Score Schemas
class RiskScoreResponse(BaseModel):
    id: int
    employee_id: str
    timestamp: datetime
    overall_score: float
    risk_level: RiskLevel
    behavioral_anomalies_score: float
    privilege_misuse_score: float
    data_access_violations_score: float
    access_pattern_deviations_score: float
    historical_security_events_score: float
    summary: Optional[str] = None
    contributing_factors: List[Dict[str, Any]]

    class Config:
        from_attributes = True

# Alerts & Incidents Schemas
class AlertCreate(BaseModel):
    employee_id: str
    title: str
    description: str
    severity: AlertSeverity = AlertSeverity.MEDIUM
    source_engine: Optional[str] = "Behavioral Engine"
    anomaly_score: Optional[float] = 0.0
    risk_score: Optional[float] = 0.0

class AlertResponse(BaseModel):
    id: int
    alert_id: str
    timestamp: datetime
    employee_id: str
    title: str
    description: str
    severity: AlertSeverity
    status: str
    source_engine: str
    anomaly_score: float
    risk_score: float
    is_acknowledged: bool
    acknowledged_by: Optional[str] = None

    class Config:
        from_attributes = True

class IncidentCreate(BaseModel):
    title: str
    description: str
    severity: AlertSeverity = AlertSeverity.HIGH
    employee_id: str
    assigned_analyst: Optional[str] = "SOC Analyst"
    containment_actions: Optional[List[str]] = []

class IncidentUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    severity: Optional[AlertSeverity] = None
    status: Optional[IncidentStatus] = None
    assigned_analyst: Optional[str] = None
    containment_actions: Optional[List[str]] = None
    root_cause: Optional[str] = None
    resolution_notes: Optional[str] = None

class IncidentResponse(BaseModel):
    id: int
    incident_id: str
    title: str
    description: str
    severity: AlertSeverity
    status: IncidentStatus
    employee_id: str
    assigned_analyst: str
    created_at: datetime
    updated_at: datetime
    containment_actions: List[str]
    root_cause: Optional[str] = None
    resolution_notes: Optional[str] = None

    class Config:
        from_attributes = True

class InvestigationTimelineItem(BaseModel):
    id: int
    timestamp: datetime
    event_title: str
    event_type: str
    severity: AlertSeverity
    details: Optional[str] = None

    class Config:
        from_attributes = True

class InvestigationResponse(BaseModel):
    id: int
    investigation_id: str
    incident_id: str
    employee_id: str
    lead_analyst: str
    status: str
    findings: Optional[str] = None
    evidence_items: List[Dict[str, Any]]
    investigator_notes: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    timeline_events: List[InvestigationTimelineItem] = []

    class Config:
        from_attributes = True

class SimulationRequest(BaseModel):
    scenario: str = "red_team_data_theft"  # red_team_data_theft, privilege_escalation, after_hours_exfiltration, normal_traffic
    intensity: str = "medium"  # low, medium, high
    target_employee_id: Optional[str] = None
