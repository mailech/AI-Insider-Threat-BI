import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    JSON,
    Text,
)
from sqlalchemy.orm import relationship
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False)  # Administrator, Security Manager, SOC Engineer, Security Analyst
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(50), primary_key=True, index=True)  # e.g., emp_1001
    full_name = Column(String(255), nullable=False, index=True)
    email = Column(String(255), nullable=False)
    department = Column(String(100), nullable=False, index=True)
    designation = Column(String(100), nullable=False)
    direct_manager = Column(String(255), nullable=False)
    enrolled_date = Column(DateTime, nullable=False)
    threat_score = Column(Float, default=0.0)
    risk_category = Column(String(20), default="Low")  # Critical, High, Medium, Low
    avatar_initials = Column(String(10), nullable=False)
    last_active = Column(DateTime, default=datetime.datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

    # Elevation Feature 2: SOC Case-Status Flags
    vpn_revocation_flagged = Column(Boolean, default=False)
    containment_status = Column(String(30), default="normal")  # normal / isolated
    requires_mfa_reset = Column(Boolean, default=False)
    training_assigned = Column(Boolean, default=False)
    training_assigned_date = Column(DateTime, nullable=True)

    # In-Bounds Feature 1: Access Privileges & Security Entitlements
    access_privileges = Column(JSON, default=list, nullable=True)

    # ML Corroboration Engine: Additive ML Anomaly Corroboration Score
    ml_corroboration_score = Column(Float, nullable=True, default=None)

    # Relationships

    device_assets = relationship("DeviceAsset", back_populates="employee", cascade="all, delete-orphan")
    trajectories = relationship("RiskTrajectory", back_populates="employee", cascade="all, delete-orphan", order_by="RiskTrajectory.day_offset")
    telemetry_logs = relationship("TelemetryLog", back_populates="employee", cascade="all, delete-orphan", order_by="desc(TelemetryLog.timestamp)")
    notes = relationship("InvestigationNote", back_populates="employee", cascade="all, delete-orphan", order_by="InvestigationNote.timestamp")
    incidents = relationship("Incident", back_populates="employee", cascade="all, delete-orphan", order_by="desc(Incident.created_at)")
    identity_mappings = relationship("EmployeeIdentityMapping", back_populates="employee", cascade="all, delete-orphan")



class DeviceAsset(Base):
    __tablename__ = "device_assets"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False)
    asset_id = Column(String(100), nullable=False)
    asset_type = Column(String(50), nullable=False)  # Laptop, Workstation, Cloud Bastion, Mobile
    ip_address = Column(String(50), nullable=False)
    mac_address = Column(String(50), nullable=True)
    os_name = Column(String(100), default="Ubuntu 22.04 LTS / Windows 11 Enterprise")
    status = Column(String(50), default="Active")

    employee = relationship("Employee", back_populates="device_assets")

class RiskTrajectory(Base):
    __tablename__ = "risk_trajectories"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False)
    day_offset = Column(Integer, nullable=False)  # -30 to 0 (0 = Today)
    date = Column(DateTime, nullable=False)
    score = Column(Float, nullable=False)
    baseline_score = Column(Float, default=25.0)

    employee = relationship("Employee", back_populates="trajectories")

class TelemetryLog(Base):
    __tablename__ = "telemetry_logs"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False, index=True)
    event_type = Column(String(50), nullable=False, index=True)  # LOGIN, FILE_DOWNLOAD, FILE_UPLOAD, DATA_TRANSFER, EMAIL_ACTIVITY, PRIVILEGE_CHANGE, REMOTE_ACCESS, APPLICATION_USAGE, USB_DEVICE, NETWORK_ACTIVITY
    severity = Column(String(20), nullable=False, index=True)    # INFO, LOW, MEDIUM, HIGH, CRITICAL
    anomaly_category = Column(String(50), nullable=True, index=True)  # UNUSUAL_LOGIN_TIME, ABNORMAL_DATA_DOWNLOAD, UNAUTHORIZED_ACCESS_ATTEMPT, EXCESSIVE_FILE_TRANSFER, SUSPICIOUS_DEVICE_USAGE
    source_ip = Column(String(50), nullable=False)
    timestamp = Column(DateTime, nullable=False, index=True)
    description = Column(Text, nullable=False)
    payload = Column(JSON, nullable=True)
    source = Column(String(50), nullable=True, default="seeded")  # "seeded" or "live_windows_listener"

    employee = relationship("Employee", back_populates="telemetry_logs")

class EmployeeIdentityMapping(Base):
    __tablename__ = "employee_identity_mappings"

    id = Column(Integer, primary_key=True, index=True)
    windows_identifier = Column(String(255), unique=True, nullable=False, index=True)  # e.g., CORP\elena.rostova or S-1-5-...
    employee_id = Column(String(50), ForeignKey("employees.id", ondelete="CASCADE"), nullable=False, index=True)
    description = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, nullable=False)
    created_by = Column(String(255), default="Administrator", nullable=False)

    employee = relationship("Employee", back_populates="identity_mappings")

class UnmappedIngestionLog(Base):
    __tablename__ = "unmapped_ingestion_logs"

    id = Column(Integer, primary_key=True, index=True)
    raw_identifier = Column(String(255), nullable=False, index=True)
    channel = Column(String(100), nullable=False)
    event_id = Column(Integer, nullable=False)
    event_type = Column(String(50), nullable=False)
    source_ip = Column(String(50), default="127.0.0.1", nullable=False)
    timestamp = Column(DateTime, nullable=False, default=datetime.datetime.utcnow, index=True)
    raw_details = Column(JSON, nullable=True)
    reason = Column(String(255), default="Unmapped Windows Account Identifier", nullable=False)

class SystemSetting(Base):
    __tablename__ = "system_settings"

    key = Column(String(100), primary_key=True, index=True)
    value = Column(JSON, nullable=False)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_email = Column(String(255), nullable=False, index=True)
    user_role = Column(String(50), nullable=False, index=True)
    action = Column(String(100), nullable=False, index=True)
    target_resource = Column(String(255), nullable=True)
    details = Column(JSON, nullable=True)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, index=True)

class InvestigationNote(Base):
    __tablename__ = "investigation_notes"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False, index=True)
    incident_id = Column(Integer, ForeignKey("incidents.id"), nullable=True, index=True)
    author_email = Column(String(255), nullable=False)
    author_name = Column(String(255), nullable=False)
    author_role = Column(String(50), nullable=False)  # Administrator, Security Manager, SOC Engineer, Security Analyst
    note_text = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow, nullable=False, index=True)

    employee = relationship("Employee", back_populates="notes")
    incident = relationship("Incident", back_populates="notes")


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g., INC-2026-0101
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(String(20), nullable=False, index=True)  # CRITICAL, HIGH, MEDIUM, LOW
    status = Column(String(30), default="Open", index=True)   # Open, Investigating, Escalated, Resolved
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False, index=True)
    telemetry_event_id = Column(Integer, ForeignKey("telemetry_logs.id"), nullable=True)
    anomaly_category = Column(String(50), nullable=True)
    mitre_technique_id = Column(String(50), nullable=True)
    mitre_technique_name = Column(String(255), nullable=True)
    assigned_to_user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    assigned_to_email = Column(String(255), nullable=True)
    assigned_to_name = Column(String(255), nullable=True)
    assigned_to_role = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow, index=True)
    first_investigated_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolution_summary = Column(Text, nullable=True)

    employee = relationship("Employee", back_populates="incidents")
    telemetry_event = relationship("TelemetryLog")
    assigned_user = relationship("User")
    notes = relationship("InvestigationNote", back_populates="incident", cascade="all, delete-orphan", order_by="InvestigationNote.timestamp")



