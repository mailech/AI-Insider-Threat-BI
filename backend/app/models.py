import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Column, String, DateTime, Float, Integer, Boolean, ForeignKey, Text, Enum
)
from sqlalchemy.orm import relationship

from app.database import Base


def gen_uuid():
    return str(uuid.uuid4())


class RoleEnum(str, enum.Enum):
    security_analyst = "security_analyst"
    soc_engineer = "soc_engineer"
    security_manager = "security_manager"
    administrator = "administrator"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class AlertSeverity(str, enum.Enum):
    informational = "informational"
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class AlertStatus(str, enum.Enum):
    open = "open"
    investigating = "investigating"
    resolved = "resolved"
    dismissed = "dismissed"


# ---------------------------------------------------------------------------
# 1. User Authentication & Role-Based Access
# ---------------------------------------------------------------------------
class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=gen_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.security_analyst)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# 2. Employee Identity & Profile Management
# ---------------------------------------------------------------------------
class Employee(Base):
    __tablename__ = "employees"

    id = Column(String, primary_key=True, default=gen_uuid)
    employee_code = Column(String, unique=True, index=True, nullable=False)
    full_name = Column(String, nullable=False)
    department = Column(String, index=True)
    designation = Column(String)
    manager = Column(String)
    device_info = Column(String)
    access_privileges = Column(String)  # comma separated privilege tags
    is_privileged_user = Column(Boolean, default=False)
    hire_date = Column(DateTime, default=datetime.utcnow)

    activities = relationship("ActivityEvent", back_populates="employee")
    baseline = relationship("BehaviorBaseline", back_populates="employee", uselist=False)


# ---------------------------------------------------------------------------
# 3. Activity Monitoring Engine
# ---------------------------------------------------------------------------
class ActivityEvent(Base):
    __tablename__ = "activity_events"

    id = Column(String, primary_key=True, default=gen_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), index=True)
    event_type = Column(String, index=True)  # login, file_download, file_upload, data_transfer,
    # email, privilege_change, remote_access, usb
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    source_ip = Column(String, nullable=True)
    device = Column(String, nullable=True)
    resource = Column(String, nullable=True)  # file path / app / system touched
    data_volume_mb = Column(Float, default=0.0)
    is_after_hours = Column(Boolean, default=False)
    is_remote = Column(Boolean, default=False)
    metadata_json = Column(Text, nullable=True)

    employee = relationship("Employee", back_populates="activities")


# ---------------------------------------------------------------------------
# 4. Behavioral Profiling Engine
# ---------------------------------------------------------------------------
class BehaviorBaseline(Base):
    __tablename__ = "behavior_baselines"

    id = Column(String, primary_key=True, default=gen_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), unique=True)
    avg_login_hour = Column(Float, default=9.0)
    login_hour_stddev = Column(Float, default=1.0)
    avg_daily_events = Column(Float, default=20.0)
    daily_events_stddev = Column(Float, default=5.0)
    avg_data_volume_mb = Column(Float, default=50.0)
    data_volume_stddev = Column(Float, default=15.0)
    common_resources = Column(Text, nullable=True)  # comma separated
    last_updated = Column(DateTime, default=datetime.utcnow)

    employee = relationship("Employee", back_populates="baseline")


# ---------------------------------------------------------------------------
# 5. Anomaly Detection Engine
# ---------------------------------------------------------------------------
class Anomaly(Base):
    __tablename__ = "anomalies"

    id = Column(String, primary_key=True, default=gen_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), index=True)
    activity_event_id = Column(String, ForeignKey("activity_events.id"), nullable=True)
    category = Column(String)  # unusual_login_time, abnormal_data_download,
    # unauthorized_access, excessive_file_transfer, suspicious_device
    anomaly_score = Column(Float, default=0.0)  # 0-1, higher = more anomalous
    description = Column(Text)
    detected_at = Column(DateTime, default=datetime.utcnow)


# ---------------------------------------------------------------------------
# 6. Insider Risk Scoring Engine
# ---------------------------------------------------------------------------
class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(String, primary_key=True, default=gen_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), index=True)
    score = Column(Float, default=0.0)  # 0-100
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.low)
    behavioral_component = Column(Float, default=0.0)
    privilege_component = Column(Float, default=0.0)
    data_access_component = Column(Float, default=0.0)
    access_pattern_component = Column(Float, default=0.0)
    historical_component = Column(Float, default=0.0)
    computed_at = Column(DateTime, default=datetime.utcnow, index=True)


# ---------------------------------------------------------------------------
# 7 & 9. Threat Investigation + Alert & Incident Management
# ---------------------------------------------------------------------------
class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String, primary_key=True, default=gen_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), index=True)
    anomaly_id = Column(String, ForeignKey("anomalies.id"), nullable=True)
    title = Column(String)
    description = Column(Text)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.medium)
    status = Column(Enum(AlertStatus), default=AlertStatus.open)
    assigned_to = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    resolved_at = Column(DateTime, nullable=True)


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(String, primary_key=True, default=gen_uuid)
    employee_id = Column(String, ForeignKey("employees.id"), index=True)
    title = Column(String)
    summary = Column(Text)
    status = Column(String, default="open")  # open, in_progress, closed
    created_by = Column(String, ForeignKey("users.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    closed_at = Column(DateTime, nullable=True)


class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    id = Column(String, primary_key=True, default=gen_uuid)
    incident_id = Column(String, ForeignKey("incidents.id"), index=True)
    author_id = Column(String, ForeignKey("users.id"), nullable=True)
    note = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
