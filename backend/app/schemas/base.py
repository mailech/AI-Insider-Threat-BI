from pydantic import BaseModel, ConfigDict
from typing import Optional, List, Any
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    email: str
    role: str
    full_name: Optional[str] = None

class User(UserBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DepartmentBase(BaseModel):
    name: str

class Department(DepartmentBase):
    id: UUID
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class EmployeeBase(BaseModel):
    employee_id: str
    department_id: Optional[UUID] = None
    designation: Optional[str] = None
    manager_id: Optional[UUID] = None

class EmployeeCreate(EmployeeBase):
    pass

class EmployeeUpdate(BaseModel):
    department_id: Optional[UUID] = None
    designation: Optional[str] = None
    manager_id: Optional[UUID] = None

class Employee(EmployeeBase):
    id: UUID
    risk_score: float
    risk_category: str
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)

class DeviceBase(BaseModel):
    employee_id: UUID
    device_name: str
    ip_address: Optional[str] = None
    mac_address: Optional[str] = None
    os_info: Optional[str] = None

class Device(DeviceBase):
    id: UUID
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class ActivityLogBase(BaseModel):
    employee_id: UUID
    device_id: Optional[UUID] = None
    event_type: str
    resource_accessed: Optional[dict] = None
    volume_bytes: Optional[int] = None
    status: Optional[str] = None

class ActivityLog(ActivityLogBase):
    id: UUID
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)

class AuditLogBase(BaseModel):
    user_id: Optional[UUID] = None
    action_type: str
    target_resource: Optional[str] = None

class AuditLog(AuditLogBase):
    id: UUID
    timestamp: datetime
    model_config = ConfigDict(from_attributes=True)
