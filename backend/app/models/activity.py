"""Raw monitored activity.

This is the table Milestone 2's behavioral profiling and anomaly detection will
read from, which is why it carries both composite indexes and a denormalised
``is_after_hours`` flag: aggregates filter on it constantly and computing it per
query would not scale past a few million rows.
"""

from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.employee import Device, Employee
from app.models.enums import EventSource, EventType


class ActivityEvent(Base):
    __tablename__ = "activity_events"
    __table_args__ = (
        Index("ix_activity_employee_time", "employee_id", "timestamp"),
        Index("ix_activity_type_time", "event_type", "timestamp"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), nullable=False
    )
    device_id: Mapped[int | None] = mapped_column(
        ForeignKey("devices.id", ondelete="SET NULL"), nullable=True
    )
    event_type: Mapped[EventType] = mapped_column(
        SAEnum(EventType, native_enum=False, length=32), nullable=False
    )
    source: Mapped[EventSource] = mapped_column(
        SAEnum(EventSource, native_enum=False, length=32),
        default=EventSource.ENDPOINT_AGENT,
        nullable=False,
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )
    ip_address: Mapped[str | None] = mapped_column(String(45), nullable=True)
    bytes_transferred: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_after_hours: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    details: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    employee: Mapped[Employee] = relationship()
    device: Mapped[Device | None] = relationship()

    @property
    def employee_name(self) -> str | None:
        """Flattened for the UI. Queries that serialise this must eager-load
        ``employee`` or they will issue one query per row."""
        return self.employee.full_name if self.employee else None
