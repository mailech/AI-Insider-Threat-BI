"""Persisted risk scores produced by the Isolation Forest service."""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.employee import Employee


class RiskBand(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class RiskScore(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "risk_scores"
    __table_args__ = (Index("ix_risk_scores_employee_computed", "employee_id", "computed_at"),)

    employee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    computed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), index=True, nullable=False
    )
    lookback_days: Mapped[int] = mapped_column(Integer, default=30, nullable=False)

    # The five features sent to the existing Isolation Forest service.
    logon_count: Mapped[float] = mapped_column(Float, nullable=False)
    after_hours_logon_count: Mapped[float] = mapped_column(Float, nullable=False)
    usb_connect_count: Mapped[float] = mapped_column(Float, nullable=False)
    file_copy_count: Mapped[float] = mapped_column(Float, nullable=False)
    email_count: Mapped[float] = mapped_column(Float, nullable=False)

    # Values returned by the model service.
    decision_function_score: Mapped[float] = mapped_column(Float, nullable=False)
    predict_label: Mapped[int] = mapped_column(Integer, nullable=False)
    risk_score: Mapped[float] = mapped_column(Float, nullable=False)
    risk_band: Mapped[RiskBand] = mapped_column(String(20), index=True, nullable=False)

    employee: Mapped[Employee] = relationship()
