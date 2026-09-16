"""Detected anomalies."""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Float, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.employee import Employee


class Severity(StrEnum):
    INFORMATIONAL = "Informational"
    LOW = "Low"
    MEDIUM = "Medium"
    HIGH = "High"
    CRITICAL = "Critical"


class AnomalyCategory(StrEnum):
    UNUSUAL_LOGIN_TIME = "Unusual Login Time"
    ABNORMAL_DATA_DOWNLOAD = "Abnormal Data Download"
    UNAUTHORIZED_ACCESS_ATTEMPTS = "Unauthorized Access Attempts"
    EXCESSIVE_FILE_TRANSFERS = "Excessive File Transfers"
    SUSPICIOUS_DEVICE_USAGE = "Suspicious Device Usage"


class AnomalyStatus(StrEnum):
    NEW = "New"
    UNDER_REVIEW = "Under Review"
    CONFIRMED = "Confirmed"
    DISMISSED = "Dismissed"


class Anomaly(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "anomalies"
    __table_args__ = (
        Index("ix_anomalies_severity_status", "severity", "status"),
        Index("ix_anomalies_employee_detected", "employee_id", "detected_at"),
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    detected_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    category: Mapped[AnomalyCategory] = mapped_column(String(60), index=True, nullable=False)
    severity: Mapped[Severity] = mapped_column(String(20), index=True, nullable=False)
    status: Mapped[AnomalyStatus] = mapped_column(
        String(20), default=AnomalyStatus.NEW, index=True, nullable=False
    )
    description: Mapped[str] = mapped_column(Text, nullable=False)
    baseline_deviation: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    observed_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    baseline_value: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)

    employee: Mapped[Employee] = relationship()
