from datetime import datetime
from sqlalchemy import String, Float, Integer, DateTime, Text, JSON, Boolean, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from .db import Base

class User(Base):
    __tablename__='users'
    id: Mapped[int]=mapped_column(Integer, primary_key=True)
    username: Mapped[str]=mapped_column(String(128), unique=True, index=True)
    password_hash: Mapped[str]=mapped_column(String(512))
    role: Mapped[str]=mapped_column(String(32), default='analyst', index=True)
    employee_id: Mapped[str|None]=mapped_column(String(128), nullable=True)
    active: Mapped[bool]=mapped_column(Boolean, default=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))

class Employee(Base):
    __tablename__='employees'
    id: Mapped[int]=mapped_column(Integer, primary_key=True)
    employee_id: Mapped[str]=mapped_column(String(128), unique=True, index=True)
    username: Mapped[str]=mapped_column(String(256), index=True)
    department: Mapped[str|None]=mapped_column(String(256), nullable=True)
    designation: Mapped[str|None]=mapped_column(String(256), nullable=True)
    manager: Mapped[str|None]=mapped_column(String(256), nullable=True)
    access_privileges: Mapped[list]=mapped_column(JSON, default=list)
    risk_score: Mapped[float]=mapped_column(Float, default=0)
    risk_level: Mapped[str]=mapped_column(String(32), default='low')
    updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))

class Device(Base):
    __tablename__='devices'
    id: Mapped[int]=mapped_column(Integer, primary_key=True)
    device_id: Mapped[str]=mapped_column(String(128), unique=True, index=True)
    device_name: Mapped[str]=mapped_column(String(256))
    api_key_hash: Mapped[str]=mapped_column(String(128))
    active: Mapped[bool]=mapped_column(Boolean, default=True)
    last_seen: Mapped[datetime|None]=mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))

class SecurityEvent(Base):
    __tablename__='security_events'
    id: Mapped[int]=mapped_column(Integer, primary_key=True)
    event_id: Mapped[str]=mapped_column(String(128), unique=True, index=True)
    idempotency_key: Mapped[str]=mapped_column(String(512), unique=True, index=True)
    raw_event_id: Mapped[str|None]=mapped_column(String(256), nullable=True, index=True)
    event_type: Mapped[str]=mapped_column(String(64), index=True)
    source_dataset: Mapped[str]=mapped_column(String(64), index=True)
    timestamp: Mapped[datetime]=mapped_column(DateTime(timezone=True), index=True)
    ingested_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
    user_id: Mapped[str]=mapped_column(String(256), index=True)
    username: Mapped[str|None]=mapped_column(String(256), nullable=True, index=True)
    user_email: Mapped[str|None]=mapped_column(String(320), nullable=True)
    employee_id: Mapped[str|None]=mapped_column(String(128), nullable=True, index=True)
    department: Mapped[str|None]=mapped_column(String(256), nullable=True)
    device_id: Mapped[str|None]=mapped_column(String(128), nullable=True, index=True)
    device_name: Mapped[str|None]=mapped_column(String(256), nullable=True)
    device_type: Mapped[str|None]=mapped_column(String(128), nullable=True)
    ip_address: Mapped[str|None]=mapped_column(String(64), nullable=True)
    mac_address: Mapped[str|None]=mapped_column(String(64), nullable=True)
    operating_system: Mapped[str|None]=mapped_column(String(128), nullable=True)
    target_resource: Mapped[str|None]=mapped_column(Text, nullable=True)
    target_type: Mapped[str|None]=mapped_column(String(128), nullable=True)
    action: Mapped[str|None]=mapped_column(String(128), nullable=True)
    result: Mapped[str|None]=mapped_column(String(128), nullable=True)
    bytes_transferred: Mapped[int|None]=mapped_column(Integer, nullable=True)
    file_count: Mapped[int|None]=mapped_column(Integer, nullable=True)
    location: Mapped[str|None]=mapped_column(String(256), nullable=True)
    country: Mapped[str|None]=mapped_column(String(128), nullable=True)
    city: Mapped[str|None]=mapped_column(String(128), nullable=True)
    is_remote: Mapped[bool|None]=mapped_column(Boolean, nullable=True)
    risk_score: Mapped[float]=mapped_column(Float, default=0)
    risk_level: Mapped[str]=mapped_column(String(32), default='low', index=True)
    anomaly_score: Mapped[float]=mapped_column(Float, default=0)
    risk_indicators: Mapped[list]=mapped_column(JSON, default=list)
    raw_payload: Mapped[dict|None]=mapped_column(JSON, nullable=True)
    enrichments: Mapped[dict|None]=mapped_column(JSON, nullable=True)
    tags: Mapped[list]=mapped_column(JSON, default=list)

class Alert(Base):
    __tablename__='alerts'
    id: Mapped[int]=mapped_column(Integer, primary_key=True)
    event_id: Mapped[str]=mapped_column(String(128), index=True)
    employee_id: Mapped[str|None]=mapped_column(String(128), nullable=True, index=True)
    username: Mapped[str|None]=mapped_column(String(256), nullable=True)
    severity: Mapped[str]=mapped_column(String(32), index=True)
    title: Mapped[str]=mapped_column(String(512))
    description: Mapped[str]=mapped_column(Text)
    status: Mapped[str]=mapped_column(String(32), default='open', index=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime|None]=mapped_column(DateTime(timezone=True), nullable=True)

class Incident(Base):
    __tablename__='incidents'
    id: Mapped[int]=mapped_column(Integer, primary_key=True)
    title: Mapped[str]=mapped_column(String(512))
    severity: Mapped[str]=mapped_column(String(32))
    status: Mapped[str]=mapped_column(String(32), default='open', index=True)
    assignee: Mapped[str|None]=mapped_column(String(256), nullable=True)
    alert_ids: Mapped[list]=mapped_column(JSON, default=list)
    notes: Mapped[str|None]=mapped_column(Text, nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
    updated_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))

class AuditLog(Base):
    __tablename__='audit_logs'
    id: Mapped[int]=mapped_column(Integer, primary_key=True)
    actor: Mapped[str]=mapped_column(String(256))
    action: Mapped[str]=mapped_column(String(256))
    target: Mapped[str|None]=mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
    details: Mapped[dict|None]=mapped_column(JSON, nullable=True)


class Notification(Base):
    __tablename__='notifications'
    id: Mapped[int]=mapped_column(Integer, primary_key=True)
    recipient: Mapped[str]=mapped_column(String(256), index=True)
    kind: Mapped[str]=mapped_column(String(64), default='alert')
    title: Mapped[str]=mapped_column(String(512))
    message: Mapped[str]=mapped_column(Text)
    severity: Mapped[str]=mapped_column(String(32), default='medium')
    read: Mapped[bool]=mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime]=mapped_column(DateTime(timezone=True))
