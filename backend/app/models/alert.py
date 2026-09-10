from datetime import datetime
from sqlalchemy import Column, String, Text, JSON, DateTime, ForeignKey
from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(String(50), primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    severity = Column(String(50), default="High", index=True)
    status = Column(String(50), default="New", index=True)
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False, index=True)
    employee_name = Column(String(255), nullable=False)
    department = Column(String(100), nullable=False)
    timestamp = Column(String(100), default="Just now")
    vector = Column(String(100), default="Behavioral Anomaly")
    summary = Column(Text, nullable=False)
    evidence = Column(JSON, default=list)

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
