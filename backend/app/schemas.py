from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field

class RegisterRequest(BaseModel):
    username: str = Field(min_length=3, max_length=80)
    password: str = Field(min_length=8)
    role: str = "Security Analyst"

class EmployeeCreate(BaseModel):
    employee_id: str
    name: str
    department: str
    designation: str = ""
    manager: str = ""
    device: str = ""
    access_privileges: str = ""

class ActivityCreate(BaseModel):
    employee_id: str
    timestamp: Optional[datetime] = None
    activity_type: str
    resource: str = ""
    source_ip: str = ""
    bytes_transferred: int = 0
    privilege_level: str = "normal"
    success: int = 1

class IncidentCreate(BaseModel):
    employee_id: str
    title: str
    description: str = ""
    severity: str = "Medium"
    assignee: str = ""
    evidence: str = ""

class IncidentUpdate(BaseModel):
    status: Optional[str] = None
    assignee: Optional[str] = None
    evidence: Optional[str] = None

class AlertUpdate(BaseModel):
    status: str

class PolicyConfig(BaseModel):
    unusual_login_start: int = 22
    unusual_login_end: int = 6
    large_transfer_mb: int = 100
    failed_attempt_threshold: int = 5
