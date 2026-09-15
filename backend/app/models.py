from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, Text, ForeignKey
from sqlalchemy.orm import relationship
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    username = Column(String(80), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(40), default="Security Analyst", nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Employee(Base):
    __tablename__ = "employees"
    id = Column(Integer, primary_key=True)
    employee_id = Column(String(80), unique=True, index=True, nullable=False)
    name = Column(String(160), nullable=False)
    department = Column(String(120), nullable=False)
    designation = Column(String(120), default="")
    manager = Column(String(160), default="")
    device = Column(String(160), default="")
    access_privileges = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class Activity(Base):
    __tablename__ = "activities"
    id = Column(Integer, primary_key=True)
    employee_id = Column(String(80), index=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    activity_type = Column(String(80), nullable=False)
    resource = Column(String(255), default="")
    source_ip = Column(String(80), default="")
    bytes_transferred = Column(Integer, default=0)
    privilege_level = Column(String(40), default="normal")
    success = Column(Integer, default=1)

class BehavioralProfile(Base):
    __tablename__ = "behavioral_profiles"
    id = Column(Integer, primary_key=True)
    employee_id = Column(String(80), unique=True, index=True, nullable=False)
    login_hour_mean = Column(Float, default=10)
    login_hour_std = Column(Float, default=2)
    avg_data_transfer = Column(Float, default=0)
    avg_access_frequency = Column(Float, default=0)
    application_count = Column(Integer, default=0)
    anomaly_score = Column(Float, default=0)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Anomaly(Base):
    __tablename__ = "anomalies"
    id = Column(Integer, primary_key=True)
    employee_id = Column(String(80), index=True, nullable=False)
    activity_id = Column(Integer, ForeignKey("activities.id"), nullable=True)
    category = Column(String(100), nullable=False)
    severity = Column(String(30), default="Medium")
    score = Column(Float, default=0)
    description = Column(Text, default="")
    status = Column(String(30), default="Open")
    created_at = Column(DateTime, default=datetime.utcnow)

class RiskScore(Base):
    __tablename__ = "risk_scores"
    id = Column(Integer, primary_key=True)
    employee_id = Column(String(80), unique=True, index=True, nullable=False)
    behavioral_anomalies = Column(Float, default=0)
    privilege_misuse = Column(Float, default=0)
    data_access_violations = Column(Float, default=0)
    access_pattern_deviations = Column(Float, default=0)
    historical_security_events = Column(Float, default=0)
    total_score = Column(Float, default=0)
    category = Column(String(30), default="Low Risk")
    updated_at = Column(DateTime, default=datetime.utcnow)

class Incident(Base):
    __tablename__ = "incidents"
    id = Column(Integer, primary_key=True)
    employee_id = Column(String(80), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, default="")
    severity = Column(String(30), default="Medium")
    status = Column(String(30), default="Open")
    assignee = Column(String(120), default="")
    evidence = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow)

class Alert(Base):
    __tablename__ = "alerts"
    id = Column(Integer, primary_key=True)
    employee_id = Column(String(80), nullable=False)
    anomaly_id = Column(Integer, nullable=True)
    title = Column(String(200), nullable=False)
    severity = Column(String(30), default="Medium")
    status = Column(String(30), default="New")
    message = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class AuditLog(Base):
    __tablename__ = "audit_logs"
    id = Column(Integer, primary_key=True)
    username = Column(String(80), nullable=False)
    action = Column(String(200), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
