from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, Text, DateTime, JSON, ForeignKey
from sqlalchemy.orm import relationship
from backend.app.db.session import Base


class Incident(Base):
    __tablename__ = "incidents"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), unique=True, index=True, nullable=False)  # e.g. INC-2026-001
    title = Column(String(200), nullable=False)
    user_id = Column(String(50), index=True, nullable=False)
    severity = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    status = Column(String(30), default="OPEN")    # OPEN, IN_PROGRESS, CLOSED
    assigned_analyst = Column(String(100), nullable=True)
    description = Column(Text, nullable=False)
    evidence_references = Column(JSON, default=list)  # List of alert IDs, file hashes, URL strings
    root_cause = Column(Text, nullable=True)
    resolution = Column(Text, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    comments = relationship("IncidentComment", back_populates="incident", cascade="all, delete-orphan")


class IncidentComment(Base):
    __tablename__ = "incident_comments"

    id = Column(Integer, primary_key=True, index=True)
    incident_id = Column(String(50), ForeignKey("incidents.incident_id"), nullable=False)
    author = Column(String(100), nullable=False)
    comment = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    incident = relationship("Incident", back_populates="comments")
