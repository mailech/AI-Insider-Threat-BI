"""Employee and device schemas."""

import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field


class DeviceBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    device_type: str = Field(min_length=1, max_length=60)
    operating_system: str = Field(min_length=1, max_length=60)
    serial_number: str = Field(min_length=1, max_length=60)


class DeviceCreate(DeviceBase):
    pass


class DeviceRead(DeviceBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    employee_id: uuid.UUID


class EmployeeBase(BaseModel):
    employee_code: str = Field(min_length=1, max_length=40)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    email: EmailStr
    department: str = Field(min_length=1, max_length=80)
    designation: str = Field(min_length=1, max_length=80)
    manager: str | None = None
    access_level: str = "Standard"
    access_privileges: str = ""


class EmployeeCreate(EmployeeBase):
    devices: list[DeviceCreate] = []


class EmployeeUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    department: str | None = None
    designation: str | None = None
    manager: str | None = None
    access_level: str | None = None
    access_privileges: str | None = None


class EmployeeRead(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    created_at: datetime
    devices: list[DeviceRead] = []

    @computed_field  # type: ignore[prop-decorator]
    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"

    @computed_field  # type: ignore[prop-decorator]
    @property
    def devices_count(self) -> int:
        return len(self.devices)


class DepartmentSummary(BaseModel):
    department: str
    employee_count: int
    open_anomalies: int
    average_risk_score: float


class DepartmentCreate(BaseModel):
    code: str = Field(min_length=1, max_length=40)
    name: str = Field(min_length=1, max_length=80)
    head_employee_id: uuid.UUID | None = None


class DepartmentUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=40)
    name: str | None = Field(default=None, min_length=1, max_length=80)
    head_employee_id: uuid.UUID | None = None


class DepartmentRead(DepartmentCreate):
    model_config = ConfigDict(from_attributes=True)
    id: uuid.UUID
    employee_count: int = 0
