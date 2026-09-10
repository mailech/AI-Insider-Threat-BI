"""Employee, department and asset schemas (module 2)."""
from __future__ import annotations

from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import EmploymentStatus


class DepartmentBase(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    code: Optional[str] = None
    description: Optional[str] = None
    risk_weight: float = 1.0


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: Optional[str] = None
    code: Optional[str] = None
    description: Optional[str] = None
    risk_weight: Optional[float] = None


class DepartmentOut(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_count: int = 0
    created_at: datetime


class AssetBase(BaseModel):
    asset_tag: str
    device_type: str = "laptop"
    hostname: Optional[str] = None
    os: Optional[str] = None
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    is_managed: bool = True
    assigned_on: Optional[date] = None


class AssetCreate(AssetBase):
    employee_id: int


class AssetOut(AssetBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    employee_id: int


class EmployeeBase(BaseModel):
    employee_code: str = Field(min_length=1, max_length=60)
    full_name: str = Field(min_length=2, max_length=255)
    email: EmailStr
    department_id: Optional[int] = None
    designation: Optional[str] = None
    manager_id: Optional[int] = None
    location: Optional[str] = None
    employment_status: EmploymentStatus = EmploymentStatus.ACTIVE
    joined_on: Optional[date] = None
    exit_on: Optional[date] = None
    access_level: str = "standard"
    privileges: Optional[str] = None
    is_privileged: bool = False
    on_watchlist: bool = False


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    department_id: Optional[int] = None
    designation: Optional[str] = None
    manager_id: Optional[int] = None
    location: Optional[str] = None
    employment_status: Optional[EmploymentStatus] = None
    exit_on: Optional[date] = None
    access_level: Optional[str] = None
    privileges: Optional[str] = None
    is_privileged: Optional[bool] = None
    on_watchlist: Optional[bool] = None


class EmployeeOut(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    department_name: Optional[str] = None
    manager_name: Optional[str] = None
    current_risk_score: float = 0.0
    current_risk_category: str = "low"
    baseline_ready: bool = False
    created_at: datetime


class EmployeeDetail(EmployeeOut):
    assets: List[AssetOut] = []
    total_events: int = 0
    open_anomalies: int = 0
    open_incidents: int = 0
