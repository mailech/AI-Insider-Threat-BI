from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, DateTime, JSON, ForeignKey
from app.database import Base


class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    employee_id = Column(String(50), ForeignKey("employees.id"), nullable=False, index=True)
    activity_type = Column(String(100), nullable=False, index=True)
    source_ip = Column(String(50), default="127.0.0.1")
    workstation = Column(String(100), default="WS-UNKNOWN")
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    details = Column(JSON, default=dict)
    is_anomalous = Column(Boolean, default=False, index=True)
    anomaly_score = Column(Integer, default=0)
