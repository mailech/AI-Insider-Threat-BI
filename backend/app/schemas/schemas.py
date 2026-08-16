"""
ITBIS — Pydantic v2 Schemas
Covers: Auth/RBAC (User) | Employee Identity (Employee, Asset)
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.domain import AccessLevelEnum, AssetTypeEnum, RiskCategoryEnum, RoleEnum


# ─────────────────────────────────────────────────────────────
# Shared helpers
# ─────────────────────────────────────────────────────────────

class _OrmBase(BaseModel):
    """Enables ORM mode for all read schemas that inherit from this class."""
    model_config = {"from_attributes": True}


# ─────────────────────────────────────────────────────────────
# Module 1 — Auth / RBAC  (User)
# ─────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    """Payload for registering a new platform user."""
    email:    EmailStr = Field(..., examples=["analyst@corp.internal"])
    password: str      = Field(..., min_length=8, examples=["S3cur3P@ss!"])
    role:     RoleEnum = Field(default=RoleEnum.SECURITY_ANALYST)

    @field_validator("password")
    @classmethod
    def password_strength(cls, v: str) -> str:
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter.")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit.")
        return v


class UserRead(_OrmBase):
    """Safe user representation returned to API consumers (no password)."""
    id:         int
    email:      EmailStr
    role:       RoleEnum
    is_active:  bool
    created_at: datetime


class UserLogin(BaseModel):
    """Credentials submitted to the /auth/token endpoint."""
    email:    EmailStr
    password: str


class TokenResponse(BaseModel):
    """JWT bearer token returned after successful authentication."""
    access_token: str
    token_type:   str = "bearer"


# ─────────────────────────────────────────────────────────────
# Module 2 — Employee Identity
# ─────────────────────────────────────────────────────────────

# ── Employee ─────────────────────────────────────────────────

class EmployeeCreate(BaseModel):
    """Payload for onboarding a new monitored employee."""
    emp_id:       str = Field(..., pattern=r"^emp_\d+$",
                              examples=["emp_4091"],
                              description="Unique employee identifier, e.g. 'emp_4091'")
    first_name:   str = Field(..., min_length=1, max_length=100)
    last_name:    str = Field(..., min_length=1, max_length=100)
    department:   str = Field(..., min_length=1, max_length=150)
    designation:  str = Field(..., min_length=1, max_length=150)
    manager_name: Optional[str] = Field(default=None, max_length=200)
    # Device Information
    device_id:    Optional[str] = Field(default=None, max_length=100,
                                        description="Primary device tag, e.g. 'ASSET-LT-001'")
    ip_address:   Optional[str] = Field(default=None, max_length=45,
                                        description="Primary IP address of the employee's device")
    os_type:      Optional[str] = Field(default=None, max_length=50,
                                        description="OS on primary device, e.g. 'Windows 11'")
    # Access Privileges
    access_level: AccessLevelEnum = Field(default=AccessLevelEnum.READ,
                                          description="Highest access tier granted to this employee")


class EmployeeUpdate(BaseModel):
    """Partial update for employee profile fields."""
    first_name:    Optional[str]              = None
    last_name:     Optional[str]              = None
    department:    Optional[str]              = None
    designation:   Optional[str]              = None
    manager_name:  Optional[str]              = None
    # Device Information
    device_id:     Optional[str]              = None
    ip_address:    Optional[str]              = None
    os_type:       Optional[str]              = None
    # Access Privileges
    access_level:  Optional[AccessLevelEnum]  = None
    # Risk profile
    risk_score:    Optional[float]            = Field(default=None, ge=0.0, le=1.0)
    risk_category: Optional[RiskCategoryEnum] = None


class EmployeeRead(_OrmBase):
    """Full employee record returned from the API."""
    id:            int
    emp_id:        str
    first_name:    str
    last_name:     str
    department:    str
    designation:   str
    manager_name:  Optional[str]
    # Device Information
    device_id:     Optional[str]
    ip_address:    Optional[str]
    os_type:       Optional[str]
    # Access Privileges
    access_level:  AccessLevelEnum
    # Risk profile
    risk_score:    float
    risk_category: RiskCategoryEnum
    created_at:    datetime
    updated_at:    datetime
    assets:        list[AssetRead] = []


# ── Asset ─────────────────────────────────────────────────────

class AssetCreate(BaseModel):
    """Payload for registering a new corporate asset against an employee."""
    asset_id:    str                   = Field(..., examples=["ASSET-7721"])
    asset_type:  AssetTypeEnum
    ip_address:  Optional[str]         = Field(default=None, examples=["192.168.10.45"])
    mac_address: Optional[str]         = Field(
                                           default=None,
                                           pattern=r"^([0-9A-Fa-f]{2}:){5}[0-9A-Fa-f]{2}$",
                                           examples=["AA:BB:CC:DD:EE:FF"],
                                         )
    employee_id: int


class AssetRead(_OrmBase):
    """Asset record returned from the API."""
    id:          int
    asset_id:    str
    asset_type:  AssetTypeEnum
    ip_address:  Optional[str]
    mac_address: Optional[str]
    employee_id: int
    created_at:  datetime


# ── Required for forward-reference resolution ──────────────────
EmployeeRead.model_rebuild()


# ─────────────────────────────────────────────────────────────
# Module 6 — Analytics & Risk Scoring
# ─────────────────────────────────────────────────────────────

class DepartmentRisk(BaseModel):
    """Per-department average risk score for the analytics breakdown chart."""
    department:          str   = Field(..., description="Department name")
    employee_count:      int   = Field(..., description="Number of employees in this department")
    avg_risk_score:      float = Field(..., description="Average threat score (0–100) for this department")
    high_risk_count:     int   = Field(..., description="Employees with HIGH or CRITICAL risk in this dept")


class RiskSummaryResponse(BaseModel):
    """
    Overall risk posture summary returned by GET /api/v1/analytics/summary.
    """
    total_employees:      int   = Field(
                                      ...,
                                      description="Total number of monitored employees in PostgreSQL",
                                      examples=[150],
                                  )
    high_risk_count:      int   = Field(
                                      ...,
                                      description="Employees whose risk_category is HIGH or CRITICAL",
                                      examples=[12],
                                  )
    critical_count:       int   = Field(
                                      ...,
                                      description="Employees whose risk_category is CRITICAL",
                                      examples=[3],
                                  )
    average_threat_score: float = Field(
                                      ...,
                                      description="Mean threat score (0–100) across all employees",
                                      examples=[34.7],
                                  )
    evaluated_at:         datetime = Field(
                                      ...,
                                      description="UTC timestamp at which this summary was computed",
                                  )
    risk_distribution:    dict[str, int] = Field(
                                      default_factory=dict,
                                      description="Count of employees per risk category: {CRITICAL, HIGH, MEDIUM, LOW}",
                                      examples=[{"CRITICAL": 2, "HIGH": 3, "MEDIUM": 4, "LOW": 3}],
                                  )
    department_breakdown: list[DepartmentRisk] = Field(
                                      default_factory=list,
                                      description="Per-department risk breakdown for analytics charts",
                                  )


class RiskCalculateRequest(BaseModel):
    """
    Request body for POST /api/v1/analytics/calculate-risk.
    Triggers a manual risk score re-calculation for one employee.
    """
    emp_id: str = Field(
                      ...,
                      examples=["emp_4091"],
                      description=(
                          "Human-readable employee identifier to re-score "
                          "(e.g. 'emp_4091'). Must exist in PostgreSQL."
                      ),
                  )
    window_hours: int = Field(
                          default=24,
                          ge=1,
                          le=720,
                          description=(
                              "Look-back window (in hours) used when querying "
                              "MongoDB for telemetry events. Range: 1–720 (30 days)."
                          ),
                          examples=[24],
                      )


class RiskCalculateResponse(BaseModel):
    """
    Risk re-calculation result returned by POST /api/v1/analytics/calculate-risk.
    All factor values that were fed into the scoring engine are included for
    full auditability.
    """
    emp_id:              str              = Field(..., examples=["emp_4091"])
    threat_score:        int              = Field(
                                               ...,
                                               ge=0,
                                               le=100,
                                               description="Computed threat score in range [0, 100]",
                                               examples=[72],
                                           )
    risk_category:       RiskCategoryEnum = Field(
                                               ...,
                                               description="Risk band derived from threat_score",
                                           )
    anomaly_weight:      float            = Field(
                                               ...,
                                               ge=0.0,
                                               le=1.0,
                                               description="Highest anomaly weight observed in the evaluation window",
                                               examples=[0.85],
                                           )
    frequency:           int              = Field(
                                               ...,
                                               ge=0,
                                               description="Raw event count in the evaluation window",
                                               examples=[47],
                                           )
    asset_criticality:   float            = Field(
                                               ...,
                                               ge=0.0,
                                               le=1.0,
                                               description="Weighted asset criticality for this employee",
                                               examples=[0.9],
                                           )
    historical_severity: float            = Field(
                                               ...,
                                               ge=0.0,
                                               le=1.0,
                                               description="Average severity weight of events in the window",
                                               examples=[0.6],
                                           )
    evaluated_at:        datetime         = Field(
                                               ...,
                                               description="UTC timestamp at which the score was computed",
                                           )

