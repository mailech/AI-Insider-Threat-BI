from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr


# ---------------- Auth ----------------
class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: str = "security_analyst"


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    role: str
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


# ---------------- Employee ----------------
class EmployeeCreate(BaseModel):
    employee_code: str
    full_name: str
    department: str
    designation: str
    manager: Optional[str] = None
    device_info: Optional[str] = None
    access_privileges: Optional[str] = None
    is_privileged_user: bool = False


class EmployeeOut(EmployeeCreate):
    id: str
    hire_date: datetime

    class Config:
        from_attributes = True


# ---------------- Activity ----------------
class ActivityCreate(BaseModel):
    employee_id: str
    event_type: str
    source_ip: Optional[str] = None
    device: Optional[str] = None
    resource: Optional[str] = None
    data_volume_mb: float = 0.0
    is_after_hours: bool = False
    is_remote: bool = False
    timestamp: Optional[datetime] = None


class ActivityOut(BaseModel):
    id: str
    employee_id: str
    event_type: str
    timestamp: datetime
    source_ip: Optional[str]
    device: Optional[str]
    resource: Optional[str]
    data_volume_mb: float
    is_after_hours: bool
    is_remote: bool

    class Config:
        from_attributes = True


# ---------------- Baseline ----------------
class BaselineOut(BaseModel):
    employee_id: str
    avg_login_hour: float
    login_hour_stddev: float
    avg_daily_events: float
    daily_events_stddev: float
    avg_data_volume_mb: float
    data_volume_stddev: float
    last_updated: datetime

    class Config:
        from_attributes = True


# ---------------- Anomaly ----------------
class AnomalyOut(BaseModel):
    id: str
    employee_id: str
    category: str
    anomaly_score: float
    description: str
    detected_at: datetime

    class Config:
        from_attributes = True


# ---------------- Risk ----------------
class RiskScoreOut(BaseModel):
    id: str
    employee_id: str
    score: float
    risk_level: str
    behavioral_component: float
    privilege_component: float
    data_access_component: float
    access_pattern_component: float
    historical_component: float
    computed_at: datetime

    class Config:
        from_attributes = True


# ---------------- Alerts / Incidents ----------------
class AlertOut(BaseModel):
    id: str
    employee_id: str
    title: str
    description: str
    severity: str
    status: str
    assigned_to: Optional[str]
    created_at: datetime
    resolved_at: Optional[datetime]

    class Config:
        from_attributes = True


class AlertUpdate(BaseModel):
    status: Optional[str] = None
    assigned_to: Optional[str] = None


class IncidentCreate(BaseModel):
    employee_id: str
    title: str
    summary: str


class IncidentOut(BaseModel):
    id: str
    employee_id: str
    title: str
    summary: str
    status: str
    created_by: Optional[str]
    created_at: datetime
    closed_at: Optional[datetime]

    class Config:
        from_attributes = True


class NoteCreate(BaseModel):
    incident_id: str
    note: str


class NoteOut(BaseModel):
    id: str
    incident_id: str
    author_id: Optional[str]
    note: str
    created_at: datetime

    class Config:
        from_attributes = True
