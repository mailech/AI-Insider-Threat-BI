"""Raw monitored activity events (module 3)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.employee import Employee
from app.models.user import utcnow


class ActivityEvent(Base):
    __tablename__ = "activity_events"
    __table_args__ = (
        Index("ix_activity_employee_time", "employee_id", "event_time"),
        Index("ix_activity_type_time", "activity_type", "event_time"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), index=True)

    activity_type: Mapped[str] = mapped_column(String(50), nullable=False)
    log_source: Mapped[str] = mapped_column(String(50), default="manual")
    event_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)

    # Context
    device_id: Mapped[str | None] = mapped_column(String(80))
    ip_address: Mapped[str | None] = mapped_column(String(60))
    hostname: Mapped[str | None] = mapped_column(String(120))
    resource: Mapped[str | None] = mapped_column(String(500))       # file path / URL / app
    application: Mapped[str | None] = mapped_column(String(120))
    destination: Mapped[str | None] = mapped_column(String(255))    # email recipient / remote host
    country: Mapped[str | None] = mapped_column(String(80))

    # Measures
    bytes_transferred: Mapped[float] = mapped_column(Float, default=0.0)
    duration_seconds: Mapped[float] = mapped_column(Float, default=0.0)
    file_count: Mapped[int] = mapped_column(Integer, default=0)

    # Flags used by rules / features
    is_after_hours: Mapped[bool] = mapped_column(Boolean, default=False)
    is_weekend: Mapped[bool] = mapped_column(Boolean, default=False)
    is_external: Mapped[bool] = mapped_column(Boolean, default=False)
    is_removable_media: Mapped[bool] = mapped_column(Boolean, default=False)
    success: Mapped[bool] = mapped_column(Boolean, default=True)
    sensitivity: Mapped[str | None] = mapped_column(String(30))     # public|internal|confidential|restricted

    raw_payload: Mapped[str | None] = mapped_column(Text)
    processed: Mapped[bool] = mapped_column(Boolean, default=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    employee: Mapped["Employee"] = relationship()  # type: ignore # noqa: F821
