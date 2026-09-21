import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Float, Boolean, DateTime,
    ForeignKey, Text, Enum, JSON
)
from sqlalchemy.orm import relationship
from app.database import Base

class UserRole(str, enum.Enum):
    SECURITY_ANALYST = "Security Analyst"
    SOC_ENGINEER = "SOC Engineer"
    SECURITY_MANAGER = "Security Manager"
    ADMINISTRATOR = "Administrator"

class RiskLevel(str, enum.Enum):
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class AlertSeverity(str, enum.Enum):
    INFORMATIONAL = "Informational"
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"

class IncidentStatus(str, enum.Enum):
    OPEN = "Open"
    INVESTIGATING = "Investigating"
    ESCALATED = "Escalated"
    CONTAINED = "Contained"
    RESOLVED = "Resolved"
    CLOSED = "Closed"

class ActivityType(str, enum.Enum):
    LOGIN = "login"
    FILE_ACCESS = "file_access"
    EMAIL = "email"
    USB_USAGE = "usb_usage"
    NETWORK = "network"
    APPLICATION = "application"
    REMOTE_ACCESS = "remote_access"
    PRIVILEGE_CHANGE = "privilege_change"
    DATA_TRANSFER = "data_transfer"

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.SECURITY_ANALYST, nullable=False)
    is_active = Column(Boolean, default=True)
    department = Column(String(100), default="Security Operations")
    avatar_url = Column(String(500), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime, nullable=True)

class Employee(Base):
    __tablename__ = "employees"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    department = Column(String(100), nullable=False, index=True)
    designation = Column(String(100), nullable=False)
    manager = Column(String(255), nullable=True)
    device_info = Column(JSON, default=dict)  # {"laptop": "Dell XPS-15-SOC", "mac": "00:1A:2B:3C:4D:5E", "ip": "10.0.4.12", "usb_whitelist": ["usb_1"]}
    access_privileges = Column(JSON, default=list)  # ["Database Access", "Cloud Storage", "Root/Admin", "Financial ERP"]
    status = Column(String(50), default="Active")  # Active, Under Investigation, Suspended, Quarantined
    risk_score = Column(Float, default=0.0)  # 0.0 - 100.0
    risk_level = Column(Enum(RiskLevel), default=RiskLevel.LOW)
    is_red_team = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    activities = relationship("ActivityLog", back_populates="employee", cascade="all, delete-orphan")
    behavioral_profile = relationship("BehavioralProfile", back_populates="employee", uselist=False, cascade="all, delete-orphan")
    anomaly_scores = relationship("AnomalyScore", back_populates="employee", cascade="all, delete-orphan")
    risk_history = relationship("InsiderRiskScore", back_populates="employee", cascade="all, delete-orphan")
    alerts = relationship("ThreatAlert", back_populates="employee", cascade="all, delete-orphan")
    incidents = relationship("Incident", back_populates="employee", cascade="all, delete-orphan")

class ActivityLog(Base):
    __tablename__ = "activity_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    employee_id = Column(String(50), ForeignKey("employees.employee_id"), index=True, nullable=False)
    activity_type = Column(Enum(ActivityType), nullable=False, index=True)
    action = Column(String(255), nullable=False)
    resource = Column(String(255), nullable=True)
    details = Column(JSON, default=dict)
    ip_address = Column(String(45), default="10.0.0.1")
    device_id = Column(String(100), default="device-primary")
    is_anomalous = Column(Boolean, default=False, index=True)
    anomaly_reason = Column(String(500), nullable=True)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.LOW)
    
    employee = relationship("Employee", back_populates="activities")

class BehavioralProfile(Base):
    __tablename__ = "behavioral_profiles"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), ForeignKey("employees.employee_id"), unique=True, nullable=False)
    mean_login_hour = Column(Float, default=9.0)
    mean_logout_hour = Column(Float, default=17.5)
    files_per_day = Column(Float, default=15.0)
    usb_per_day = Column(Float, default=0.2)
    emails_per_day = Column(Float, default=20.0)
    network_mb_per_day = Column(Float, default=150.0)
    out_of_session_access = Column(Integer, default=0)
    degree_centrality = Column(Float, default=0.05)
    betweenness_centrality = Column(Float, default=0.01)
    keyword_flag_ratio = Column(Float, default=0.0)
    peer_group_deviation = Column(Float, default=0.0)
    z_score_composite = Column(Float, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    employee = relationship("Employee", back_populates="behavioral_profile")

class AnomalyScore(Base):
    __tablename__ = "anomaly_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), ForeignKey("employees.employee_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    isolation_forest = Column(Float, default=0.0)
    oneclass_svm = Column(Float, default=0.0)
    autoencoder = Column(Float, default=0.0)
    graph_analytics = Column(Float, default=0.0)
    gnn_score = Column(Float, default=0.0)
    ensemble_score = Column(Float, default=0.0)
    shap_explanation = Column(JSON, default=dict)
    lime_explanation = Column(JSON, default=dict)
    
    employee = relationship("Employee", back_populates="anomaly_scores")

class InsiderRiskScore(Base):
    __tablename__ = "insider_risk_scores"
    
    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), ForeignKey("employees.employee_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    overall_score = Column(Float, nullable=False)  # 0 to 100
    risk_level = Column(Enum(RiskLevel), nullable=False)
    
    # 5 Exact PDF Weighted Components
    behavioral_anomalies_score = Column(Float, default=0.0)    # 35%
    privilege_misuse_score = Column(Float, default=0.0)        # 25%
    data_access_violations_score = Column(Float, default=0.0)  # 20%
    access_pattern_deviations_score = Column(Float, default=0.0) # 10%
    historical_security_events_score = Column(Float, default=0.0) # 10%
    
    summary = Column(Text, nullable=True)
    contributing_factors = Column(JSON, default=list)
    
    employee = relationship("Employee", back_populates="risk_history")

class ThreatAlert(Base):
    __tablename__ = "threat_alerts"
    
    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    employee_id = Column(String(50), ForeignKey("employees.employee_id"), index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.MEDIUM, index=True)
    status = Column(String(50), default="New")  # New, Acknowledged, Investigating, Dismissed, Converted to Incident
    source_engine = Column(String(100), default="UEBA / ML Anomaly Engine")
    anomaly_score = Column(Float, default=0.0)
    risk_score = Column(Float, default=0.0)
    is_acknowledged = Column(Boolean, default=False)
    acknowledged_by = Column(String(255), nullable=True)
    
    employee = relationship("Employee", back_populates="alerts")

class Incident(Base):
    __tablename__ = "incidents"
    
    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), unique=True, index=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.HIGH, index=True)
    status = Column(Enum(IncidentStatus), default=IncidentStatus.OPEN, index=True)
    employee_id = Column(String(50), ForeignKey("employees.employee_id"), index=True, nullable=False)
    assigned_analyst = Column(String(255), default="Unassigned")
    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    containment_actions = Column(JSON, default=list)  # ["Disabled Account", "Revoked USB", "Isolated Endpoint"]
    root_cause = Column(Text, nullable=True)
    resolution_notes = Column(Text, nullable=True)
    
    employee = relationship("Employee", back_populates="incidents")
    investigation = relationship("Investigation", back_populates="incident", uselist=False, cascade="all, delete-orphan")

class Investigation(Base):
    __tablename__ = "investigations"
    
    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(String(50), unique=True, index=True, nullable=False)
    incident_id = Column(String(50), ForeignKey("incidents.incident_id"), unique=True, nullable=False)
    employee_id = Column(String(50), nullable=False)
    lead_analyst = Column(String(255), default="SOC Lead")
    status = Column(String(50), default="In Progress")
    findings = Column(Text, nullable=True)
    evidence_items = Column(JSON, default=list)  # [{"id": 1, "type": "pcap", "name": "data_leak_traffic.pcap", "hash": "..."}]
    investigator_notes = Column(JSON, default=list)  # [{"author": "analyst1", "timestamp": "...", "text": "..."}]
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    incident = relationship("Incident", back_populates="investigation")
    timeline_events = relationship("InvestigationTimeline", back_populates="investigation", cascade="all, delete-orphan")

class InvestigationTimeline(Base):
    __tablename__ = "investigation_timelines"
    
    id = Column(Integer, primary_key=True, index=True)
    investigation_id = Column(String(50), ForeignKey("investigations.investigation_id"), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    event_title = Column(String(255), nullable=False)
    event_type = Column(String(100), nullable=False)
    severity = Column(Enum(AlertSeverity), default=AlertSeverity.MEDIUM)
    details = Column(Text, nullable=True)
    
    investigation = relationship("Investigation", back_populates="timeline_events")

class AuditLog(Base):
    __tablename__ = "audit_logs"
    
    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    user_email = Column(String(255), nullable=False)
    action = Column(String(255), nullable=False)
    resource = Column(String(255), nullable=False)
    details = Column(Text, nullable=True)
    ip_address = Column(String(45), default="127.0.0.1")
