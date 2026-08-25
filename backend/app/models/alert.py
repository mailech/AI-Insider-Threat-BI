from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime

from app.database import Base


class Alert(Base):
    __tablename__ = "alerts"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    employee_id = Column(
        String(50),
        nullable=False,
        index=True
    )

    # Informational / Low / Medium / High / Critical
    severity = Column(
        String(20),
        nullable=False,
        index=True
    )

    # Open / In Progress / Resolved
    status = Column(
        String(30),
        nullable=False,
        default="Open",
        index=True
    )

    description = Column(
        String(1000),
        nullable=False
    )

    # Security analyst assigned to investigate the alert
    assigned_analyst = Column(
        String(150),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    resolved_at = Column(
        DateTime,
        nullable=True
    )