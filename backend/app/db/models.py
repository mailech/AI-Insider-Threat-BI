import enum
from datetime import datetime
from uuid import uuid4
from sqlalchemy import Column, String, Float, ForeignKey, DateTime, BigInteger, Enum
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class UserRole(str, enum.Enum):
    SECURITY_ANALYST = 'Security Analyst'
    SOC_ENGINEER = 'SOC Engineer'
    SECURITY_MANAGER = 'Security Manager'
    ADMINISTRATOR = 'Administrator'

class ActivityType(str, enum.Enum):
    LOGIN = 'LOGIN'
    FILE_DOWNLOAD = 'FILE_DOWNLOAD'
    FILE_UPLOAD = 'FILE_UPLOAD'
    DATA_TRANSFER = 'DATA_TRANSFER'
    EMAIL_ACTIVITY = 'EMAIL_ACTIVITY'
    PRIVILEGE_CHANGE = 'PRIVILEGE_CHANGE'
    REMOTE_ACCESS = 'REMOTE_ACCESS'
    NETWORK = 'NETWORK'
    USB = 'USB'
    APP_USAGE = 'APP_USAGE'

class Department(Base):
    __tablename__ = "departments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    name = Column(String(255), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

class User(Base):
    __tablename__ = "users"
    id = Column(UUID(as_uuid=True), primary_key=True) # maps to auth.users
    email = Column(String(255), nullable=False, unique=True)
    role = Column(Enum(UserRole), nullable=False, default=UserRole.SECURITY_ANALYST)
    full_name = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class Employee(Base):
    __tablename__ = "employees"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    employee_id = Column(String(50), nullable=False, unique=True)
    department_id = Column(UUID(as_uuid=True), ForeignKey('departments.id', ondelete='SET NULL'))
    designation = Column(String(255))
    manager_id = Column(UUID(as_uuid=True), ForeignKey('employees.id', ondelete='SET NULL'))
    risk_score = Column(Float, default=0.0)
    risk_category = Column(String(50), default='Low')
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

class Device(Base):
    __tablename__ = "devices"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('employees.id', ondelete='CASCADE'))
    device_name = Column(String(255), nullable=False)
    ip_address = Column(String(45))
    mac_address = Column(String(17))
    os_info = Column(String(255))
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    employee_id = Column(UUID(as_uuid=True), ForeignKey('employees.id', ondelete='CASCADE'))
    device_id = Column(UUID(as_uuid=True), ForeignKey('devices.id', ondelete='SET NULL'))
    event_type = Column(Enum(ActivityType), nullable=False)
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
    resource_accessed = Column(JSONB)
    volume_bytes = Column(BigInteger)
    status = Column(String(50))

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey('users.id', ondelete='SET NULL'))
    action_type = Column(String(255), nullable=False)
    target_resource = Column(String(255))
    timestamp = Column(DateTime(timezone=True), default=datetime.utcnow)
