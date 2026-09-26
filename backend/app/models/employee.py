from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, JSON
from backend.app.db.session import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(String(50), unique=True, index=True, nullable=False)  # E.g. AAE0190
    full_name = Column(String(100), nullable=False)
    email = Column(String(100), nullable=False)
    department = Column(String(100), nullable=False, default="Engineering")
    role = Column(String(100), nullable=False, default="Software Engineer")  # Job title
    manager = Column(String(100), nullable=True)
    devices = Column(JSON, default=list)  # List of authorized computer IDs
    access_privileges = Column(JSON, default=list)  # E.g. ["ADMIN", "PROD_DB", "CODE_REPO"]
    current_risk_score = Column(Float, default=0.0)
    current_severity = Column(String(20), default="LOW")  # LOW, MEDIUM, HIGH, CRITICAL
    anomaly_count = Column(Integer, default=0)
    alert_count = Column(Integer, default=0)
    is_monitored = Column(Boolean, default=True)
    last_active_date = Column(String(20), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
