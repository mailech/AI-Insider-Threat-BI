from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, Text, DateTime
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    department = Column(String(100))
    role = Column(String(50))
    status = Column(String(20), default="ACTIVE")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(50), unique=True, nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    asset_type = Column(String(50))
    asset_name = Column(String(100))
    status = Column(String(20), default="ACTIVE")


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, nullable=False, index=True)
    employee_id = Column(String(50), nullable=False, index=True)
    risk_score = Column(Float, nullable=False)
    threat_level = Column(String(20), nullable=False)
    activity_type = Column(String(100))
    description = Column(Text)
    status = Column(String(30), default="NEW", nullable=False)  # NEW, ACKNOWLEDGED, UNDER_INVESTIGATION, RESOLVED, CLOSED
    assigned_to = Column(String(100), nullable=True)
    resolution_notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class RiskHistory(Base):
    __tablename__ = "risk_history"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), nullable=False, index=True)
    threat_score = Column(Float, nullable=False)
    threat_level = Column(String(20), nullable=False)
    anomaly_factor = Column(Float, default=0.0)
    frequency_factor = Column(Float, default=0.0)
    asset_criticality_factor = Column(Float, default=0.0)
    severity_factor = Column(Float, default=0.0)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    actor = Column(String(150), nullable=False)
    action = Column(String(100), nullable=False)
    target = Column(String(150), nullable=True)
    status = Column(String(50), default="SUCCESS")
    details = Column(Text, nullable=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)