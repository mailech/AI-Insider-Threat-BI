from typing import Optional

from pydantic import BaseModel


# ============================================================
# EMPLOYEE CREATE
# ============================================================

class EmployeeCreate(BaseModel):

    employee_id: str
    full_name: str
    department: str
    designation: str
    manager: str
    device_information: str
    access_privileges: str


# ============================================================
# EMPLOYEE UPDATE
# ============================================================

class EmployeeUpdate(BaseModel):

    employee_id: str
    full_name: str
    department: str
    designation: str
    manager: str
    device_information: str
    access_privileges: str
    risk_level: str
    status: str


# ============================================================
# EMPLOYEE RESPONSE
# ============================================================

class EmployeeResponse(BaseModel):

    id: int
    employee_id: str
    full_name: str
    department: str
    designation: str
    manager: str
    device_information: str
    access_privileges: str
    risk_level: str
    status: str

    class Config:
        from_attributes = True


# ============================================================
# PSYCHOMETRIC INTELLIGENCE
# ============================================================

class PsychometricIntelligence(BaseModel):

    employee_name: str
    user_id: str

    openness: int
    conscientiousness: int
    extraversion: int
    agreeableness: int
    neuroticism: int


# ============================================================
# ACTIVITY INTELLIGENCE
# ============================================================

class LogonActivityIntelligence(BaseModel):

    total_events: int
    logon_events: int
    logoff_events: int
    unique_devices: int
    last_activity: Optional[str] = None


class EmailActivityIntelligence(BaseModel):

    total_emails: int
    emails_with_attachments: int
    emails_without_attachments: int
    average_email_size: float
    unique_devices: int
    last_activity: Optional[str] = None


class FileActivityIntelligence(BaseModel):

    total_file_events: int
    unique_files: int
    unique_devices: int
    last_activity: Optional[str] = None


class HttpActivityIntelligence(BaseModel):

    total_http_events: int
    unique_websites: int
    unique_devices: int
    last_activity: Optional[str] = None


class DeviceActivityIntelligence(BaseModel):

    total_device_events: int
    activity_types: list[str]
    unique_devices: int
    last_activity: Optional[str] = None


class ActivityIntelligence(BaseModel):

    logon: LogonActivityIntelligence
    email: EmailActivityIntelligence
    file: FileActivityIntelligence
    http: HttpActivityIntelligence
    device: DeviceActivityIntelligence


# ============================================================
# RISK INTELLIGENCE
# ============================================================

class RiskIntelligence(BaseModel):

    risk_score: int
    risk_level: str

    behavioral_anomalies: float
    privilege_misuse: float
    data_access_violations: float
    access_pattern_deviations: float
    historical_security_events: float

    explanation: str


# ============================================================
# COMPLETE EMPLOYEE INTELLIGENCE RESPONSE
# ============================================================

class EmployeeIntelligenceResponse(BaseModel):

    employee: EmployeeResponse

    psychometric: Optional[
        PsychometricIntelligence
    ] = None

    activity: ActivityIntelligence

    risk: Optional[
        RiskIntelligence
    ] = None