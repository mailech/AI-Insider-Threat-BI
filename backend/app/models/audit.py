from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, JSON
from backend.app.db.session import Base


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), nullable=False)
    role = Column(String(50), nullable=False)
    action = Column(String(100), nullable=False)  # e.g. LOGIN, UPDATE_INCIDENT, RETRAIN_MODEL, EXPORT
    resource = Column(String(100), nullable=False) # e.g. /api/incidents/INC-2026-001
    details = Column(JSON, default=dict)
    ip_address = Column(String(50), nullable=True)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))
