"""Monitored employee activity records."""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Float, ForeignKey, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.employee import Employee


class ActivityType(StrEnum):
    LOGIN = "Login"
    FILE_DOWNLOAD = "File Download"
    FILE_UPLOAD = "File Upload"
    DATA_TRANSFER = "Data Transfer"
    EMAIL = "Email"
    PRIVILEGE_CHANGE = "Privilege Change"
    REMOTE_ACCESS = "Remote Access"
    DEVICE_USAGE = "Device Usage"


class ActivityLog(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "activity_logs"
    __table_args__ = (
        Index("ix_activity_logs_employee_timestamp", "employee_id", "timestamp"),
        Index("ix_activity_logs_type_timestamp", "activity_type", "timestamp"),
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    activity_type: Mapped[ActivityType] = mapped_column(String(40), nullable=False)
    source: Mapped[str] = mapped_column(String(120), nullable=False)
    device: Mapped[str] = mapped_column(String(120), nullable=False)
    ip_address: Mapped[str] = mapped_column(String(45), nullable=False)
    application: Mapped[str | None] = mapped_column(String(120), nullable=True)
    data_volume_mb: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    details: Mapped[str | None] = mapped_column(String(400), nullable=True)

    employee: Mapped[Employee] = relationship()
