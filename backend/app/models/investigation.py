from sqlalchemy import Column, Integer, String, DateTime, Text
from datetime import datetime

from app.database import Base


class Investigation(Base):

    __tablename__ = "investigations"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    investigation_id = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    employee_id = Column(
        String(50),
        nullable=False,
        index=True
    )

    alert_id = Column(
        Integer,
        nullable=True,
        index=True
    )

    title = Column(
        String(255),
        nullable=False
    )

    description = Column(
        Text,
        nullable=True
    )

    severity = Column(
        String(20),
        nullable=False,
        default="Medium"
    )

    status = Column(
        String(30),
        nullable=False,
        default="Open",
        index=True
    )

    assigned_analyst = Column(
        String(150),
        nullable=True
    )

    resolution_notes = Column(
        Text,
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    updated_at = Column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )

    resolved_at = Column(
        DateTime,
        nullable=True
    )