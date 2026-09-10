from datetime import datetime
from sqlalchemy import Column, String, Integer, Text, JSON, DateTime
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(String(50), primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    department = Column(String(100), nullable=False, index=True)
    role = Column(String(100), nullable=False)
    status = Column(String(50), default="Active", index=True)
    email = Column(String(255), nullable=False)
    workstation = Column(String(100), default="WS-CORP-001")
    ip_address = Column(String(50), default="192.168.1.100")
    location = Column(String(100), default="HQ / On-Premise")
    risk_level = Column(String(50), default="Low", index=True)
    score = Column(Integer, default=15)
    last_activity = Column(String(255), default="Normal authenticated activity")
    seen = Column(String(50), default="Just now")
    avatar_bg = Column(String(50), default="#e8f0fe")
    avatar_color = Column(String(50), default="#1a73e8")
    initial = Column(String(10), default="ID")
    details = Column(Text, nullable=True)

    # Telemetry and factors stored as JSON structures
    behavioral_indicators = Column(JSON, default=list)
    risk_factors = Column(JSON, default=list)
    security_events = Column(JSON, default=list)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
