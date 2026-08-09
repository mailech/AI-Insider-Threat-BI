from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import DeviceType, EmployeeStatus, PrivilegeLevel


class DepartmentBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    code: str = Field(min_length=1, max_length=20)


class DepartmentCreate(DepartmentBase):
    pass


class DepartmentUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=120)
    code: str | None = Field(default=None, min_length=1, max_length=20)


class DepartmentRead(DepartmentBase):
    model_config = ConfigDict(from_attributes=True)

    id: int


class DeviceBase(BaseModel):
    hostname: str = Field(min_length=1, max_length=120)
    device_type: DeviceType = DeviceType.LAPTOP
    os: str | None = None
    mac_address: str | None = None
    is_managed: bool = True


class DeviceCreate(DeviceBase):
    employee_id: int


class DeviceUpdate(BaseModel):
    hostname: str | None = None
    device_type: DeviceType | None = None
    os: str | None = None
    mac_address: str | None = None
    is_managed: bool | None = None


class DeviceRead(DeviceBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int


class PrivilegeBase(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    level: PrivilegeLevel = PrivilegeLevel.READ


class PrivilegeCreate(PrivilegeBase):
    employee_id: int


class PrivilegeRead(PrivilegeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    employee_id: int


class EmployeeBase(BaseModel):
    employee_code: str = Field(min_length=1, max_length=32)
    full_name: str = Field(min_length=1, max_length=255)
    email: EmailStr
    designation: str = Field(min_length=1, max_length=120)
    status: EmployeeStatus = EmployeeStatus.ACTIVE
    joined_at: date | None = None
    department_id: int | None = None
    manager_id: int | None = None


class EmployeeCreate(EmployeeBase):
    pass


class EmployeeUpdate(BaseModel):
    employee_code: str | None = Field(default=None, min_length=1, max_length=32)
    full_name: str | None = Field(default=None, min_length=1, max_length=255)
    email: EmailStr | None = None
    designation: str | None = Field(default=None, min_length=1, max_length=120)
    status: EmployeeStatus | None = None
    joined_at: date | None = None
    department_id: int | None = None
    manager_id: int | None = None


class EmployeeRead(EmployeeBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    department: DepartmentRead | None = None


class EmployeeDetail(EmployeeRead):
    manager: EmployeeRead | None = None
    devices: list[DeviceRead] = []
    privileges: list[PrivilegeRead] = []
