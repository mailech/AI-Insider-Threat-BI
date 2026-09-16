"""Security alerts raised from High/Critical anomalies."""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.anomaly import Anomaly, Severity
from app.models.employee import Employee


class AlertStatus(StrEnum):
    OPEN = "Open"
    ACKNOWLEDGED = "Acknowledged"
    CLOSED = "Closed"


class Alert(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "alerts"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    anomaly_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("anomalies.id", ondelete="SET NULL"), index=True, nullable=True
    )
    raised_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    severity: Mapped[Severity] = mapped_column(String(20), index=True, nullable=False)
    status: Mapped[AlertStatus] = mapped_column(
        String(20), default=AlertStatus.OPEN, index=True, nullable=False
    )

    employee: Mapped[Employee] = relationship()
    anomaly: Mapped[Anomaly | None] = relationship()
