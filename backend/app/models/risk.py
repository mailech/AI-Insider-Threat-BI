"""Insider risk scores (module 6) - weighted model snapshots over time."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.employee import Employee
from app.models.user import utcnow


class RiskScore(Base):
    __tablename__ = "risk_scores"
    __table_args__ = (Index("ix_risk_employee_time", "employee_id", "computed_at"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), index=True)

    score: Mapped[float] = mapped_column(Float, default=0.0)
    category: Mapped[str] = mapped_column(String(20), default="low", index=True)
    previous_score: Mapped[float] = mapped_column(Float, default=0.0)
    trend: Mapped[str] = mapped_column(String(20), default="stable")  # rising|falling|stable

    # Weighted component contributions (already multiplied by their weights)
    behavioral_anomaly_component: Mapped[float] = mapped_column(Float, default=0.0)   # 35%
    privilege_misuse_component: Mapped[float] = mapped_column(Float, default=0.0)     # 25%
    data_access_component: Mapped[float] = mapped_column(Float, default=0.0)          # 20%
    access_deviation_component: Mapped[float] = mapped_column(Float, default=0.0)     # 10%
    historical_events_component: Mapped[float] = mapped_column(Float, default=0.0)    # 10%

    # Raw 0-100 sub-scores before weighting
    raw_components: Mapped[str | None] = mapped_column(Text)
    contributing_factors: Mapped[str | None] = mapped_column(Text)  # JSON list of explanations
    window_days: Mapped[int] = mapped_column(Integer, default=30)

    computed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, index=True)

    employee: Mapped["Employee"] = relationship()  # type: ignore # noqa: F821
