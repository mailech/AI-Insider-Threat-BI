"""Detected anomalies (module 5)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.employee import Employee
from app.models.user import utcnow


class Anomaly(Base):
    __tablename__ = "anomalies"
    __table_args__ = (Index("ix_anomaly_employee_detected", "employee_id", "detected_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), index=True)
    event_id: Mapped[int | None] = mapped_column(ForeignKey("activity_events.id", ondelete="SET NULL"))

    category: Mapped[str] = mapped_column(String(60), nullable=False, index=True)
    detection_method: Mapped[str] = mapped_column(String(40), default="rule")
    severity: Mapped[str] = mapped_column(String(20), default="low", index=True)

    title: Mapped[str] = mapped_column(String(255))
    description: Mapped[str | None] = mapped_column(Text)

    score: Mapped[float] = mapped_column(Float, default=0.0)       # 0-100 normalised anomaly score
    confidence: Mapped[float] = mapped_column(Float, default=0.5)  # 0-1
    deviation_sigma: Mapped[float] = mapped_column(Float, default=0.0)

    observed_value: Mapped[float | None] = mapped_column(Float)
    baseline_value: Mapped[float | None] = mapped_column(Float)
    features: Mapped[str | None] = mapped_column(Text)  # JSON contributing features

    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)
    detected_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    is_false_positive: Mapped[bool] = mapped_column(Boolean, default=False)
    reviewed: Mapped[bool] = mapped_column(Boolean, default=False)
    alert_generated: Mapped[bool] = mapped_column(Boolean, default=False)

    employee: Mapped["Employee"] = relationship()  # type: ignore # noqa: F821
