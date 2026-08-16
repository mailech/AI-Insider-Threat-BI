from typing import Any

from pydantic import BaseModel, ConfigDict, Field, field_validator

from backend.app.config import RISK_LEVELS, SEVERITY_LEVELS, normalize_named_level, normalize_role, risk_level_for_score


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class LoginRequest(StrictModel):
    email: str
    password: str


class RegisterRequest(StrictModel):
    full_name: str = Field(min_length=2, max_length=120)
    email: str = Field(min_length=5, max_length=160)
    password: str = Field(min_length=8, max_length=128)
    role: str = "security_analyst"

    @field_validator("role")
    @classmethod
    def validate_role(cls, value: str) -> str:
        return normalize_role(value)


class UserOut(StrictModel):
    id: int
    full_name: str
    email: str
    role: str
    role_label: str
    status: str
    last_login_at: str | None = None
    created_at: str


class TokenResponse(StrictModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


class EmployeeBase(StrictModel):
    employee_id: str = Field(min_length=2, max_length=40)
    full_name: str = Field(min_length=2, max_length=120)
    department: str = Field(min_length=2, max_length=80)
    designation: str = Field(min_length=2, max_length=100)
    manager: str = Field(min_length=2, max_length=120)
    device_info: str = Field(min_length=2, max_length=180)
    access_privileges: str = Field(min_length=2, max_length=240)
    risk_score: int = Field(default=25, ge=0, le=100)
    risk_level: str | None = None
    status: str = "active"

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_named_level(value, RISK_LEVELS, "risk level")


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(StrictModel):
    full_name: str | None = Field(default=None, min_length=2, max_length=120)
    department: str | None = Field(default=None, min_length=2, max_length=80)
    designation: str | None = Field(default=None, min_length=2, max_length=100)
    manager: str | None = Field(default=None, min_length=2, max_length=120)
    device_info: str | None = Field(default=None, min_length=2, max_length=180)
    access_privileges: str | None = Field(default=None, min_length=2, max_length=240)
    risk_score: int | None = Field(default=None, ge=0, le=100)
    risk_level: str | None = None
    status: str | None = None

    @field_validator("risk_level")
    @classmethod
    def validate_risk_level(cls, value: str | None) -> str | None:
        if value is None:
            return None
        return normalize_named_level(value, RISK_LEVELS, "risk level")


class EmployeeOut(EmployeeBase):
    id: int
    risk_level: str
    created_at: str
    updated_at: str


class ActivityEventCreate(StrictModel):
    employee_id: str
    event_type: str = Field(min_length=2, max_length=80)
    description: str = Field(min_length=2, max_length=300)
    severity: str = "Low"
    source: str | None = Field(default=None, max_length=80)
    asset: str | None = Field(default=None, max_length=120)
    actor: str | None = Field(default=None, max_length=120)
    ip_address: str | None = Field(default=None, max_length=64)
    event_time: str | None = None
    metadata: dict[str, Any] = Field(default_factory=dict)

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, value: str) -> str:
        return normalize_named_level(value, SEVERITY_LEVELS, "severity")


class ActivityIngestRequest(StrictModel):
    source: str = Field(min_length=2, max_length=80)
    events: list[ActivityEventCreate] = Field(min_length=1, max_length=200)


class ActivityOut(StrictModel):
    id: int
    employee_id: int
    employee_ref: str
    employee_name: str
    department: str
    event_type: str
    source: str
    description: str
    severity: str
    asset: str | None = None
    actor: str | None = None
    ip_address: str | None = None
    event_time: str
    metadata: dict[str, Any]
    ingested_at: str


def employee_risk_level(score: int, provided_level: str | None) -> str:
    return provided_level or risk_level_for_score(score)
