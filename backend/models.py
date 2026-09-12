from sqlalchemy import Column, Integer, String, Float, DateTime, Text
from datetime import datetime

from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    full_name = Column(String)
    email = Column(String, unique=True)
    password_hash = Column(String)
    role = Column(String, default="Security Analyst")


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    activity_type = Column(String)
    activity_time = Column(DateTime, default=datetime.utcnow)
    description = Column(Text)


class RiskScore(Base):
    __tablename__ = "risk_scores"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, index=True)
    risk_score = Column(Float)
    risk_level = Column(String)
    explanation = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)


class EmployeeProfile(Base):
    __tablename__ = "employee_profiles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, index=True)
    employee_id = Column(String, unique=True, index=True)
    department = Column(String)
    designation = Column(String)
    manager = Column(String)
    device_info = Column(String)
    access_privileges = Column(String)