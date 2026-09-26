from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Float, DateTime, JSON, Text
from backend.app.db.session import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(Integer, primary_key=True, index=True)
    alert_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. ALT-2026-001
    user_id = Column(String(50), index=True, nullable=False)
    timestamp = Column(String(30), nullable=False)  # ISO timestamp
    severity = Column(String(20), nullable=False)   # LOW, MEDIUM, HIGH, CRITICAL
    risk_score = Column(Float, nullable=False)
    anomaly_score = Column(Float, nullable=False)
    reasons = Column(JSON, default=list)  # Measurable indicator list explaining why it triggered
    related_activities = Column(JSON, default=list)  # Associated log references / events
    status = Column(String(30), default="NEW")  # NEW, INVESTIGATING, RESOLVED, FALSE_POSITIVE
    assigned_analyst = Column(String(100), nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
