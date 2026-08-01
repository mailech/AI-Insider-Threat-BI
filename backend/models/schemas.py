from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field

class Token(BaseModel):
    access_token: str
    token_type: str
    user_id: str
    username: str
    role: str
    name: str

class UserLogin(BaseModel):
    username: str
    password: str

class UserProfile(BaseModel):
    id: str
    username: str
    name: str
    email: str
    role: str
    department: str
    avatar: Optional[str] = None

class Employee(BaseModel):
    id: str
    employee_id: str
    name: str
    department: str
    designation: str
    manager: str
    email: str
    device_info: Dict[str, str]
    access_privileges: List[str]
    risk_score: float
    risk_category: str
    status: str = "Active"

class ActivityLog(BaseModel):
    id: str
    timestamp: str
    employee_id: str
    employee_name: str
    activity_type: str  # Login, File Download, File Upload, Data Transfer, Email, Privilege Change, Remote Access, USB Device
    details: str
    ip_address: str
    device_id: str
    risk_impact: float
    is_anomaly: bool = False

class RiskBreakdown(BaseModel):
    behavioral: float = Field(description="Behavioral Anomalies (35%)")
    privilege: float = Field(description="Privilege Misuse Indicators (25%)")
    data: float = Field(description="Data Access Violations (20%)")
    access: float = Field(description="Access Pattern Deviations (10%)")
    historical: float = Field(description="Historical Security Events (10%)")

class TimelineEvent(BaseModel):
    t: str
    e: str
    severity: str = "Info"

class Alert(BaseModel):
    id: str
    user: str
    employee_id: str
    dept: str
    role: str
    severity: str  # Critical, High, Medium, Low, Informational
    score: float
    anomaly: str
    time: str
    status: str  # Open, Investigating, Escalated, Resolved
    assigned_to: Optional[str] = None
    breakdown: RiskBreakdown
    timeline: List[TimelineEvent]
    evidence_count: int = 0

class Incident(BaseModel):
    id: str
    alert_id: str
    title: str
    employee_id: str
    employee_name: str
    assigned_analyst: str
    severity: str
    status: str  # In Progress, Under Review, Closed
    created_at: str
    summary: str
    findings: List[str]

class UEBAProfile(BaseModel):
    employee_id: str
    employee_name: str
    department: str
    baseline_working_hours: str
    data_transfer_baseline_mb: float
    current_data_transfer_mb: float
    anomalous_login_count: int
    peer_group_avg_score: float
    user_score: float
    peer_percentile: float
    threat_prediction: str  # Low, Moderate, High, Imminent

class AnalystDashboardMetrics(BaseModel):
    open_alerts: int
    critical_risk_users: int
    mean_time_to_detect: str
    active_investigations: int
    recent_alerts: List[Alert]

class SOCDashboardMetrics(BaseModel):
    total_events_today: int
    anomalies_flagged: int
    active_threat_level: str
    investigations_in_flight: int
    live_event_stream: List[ActivityLog]

class SecurityManagerDashboardMetrics(BaseModel):
    org_risk_score: float
    high_risk_dept_count: int
    compliance_score_percent: float
    risk_trend_labels: List[str]
    risk_trend_scores: List[float]
    department_risks: Dict[str, float]

class AdminDashboardMetrics(BaseModel):
    total_users: int
    active_sessions: int
    log_ingestion_rate_eps: int
    system_health_status: str
    audit_logs: List[Dict[str, Any]]
