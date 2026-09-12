"""Behavioral baselines and peer-group statistics (modules 4 & 8)."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.session import Base
from app.models.user import utcnow


class BehaviorBaseline(Base):
    """Per-employee behavioural baseline: mean/std per feature over the training window."""
    __tablename__ = "behavior_baselines"
    __table_args__ = (UniqueConstraint("employee_id", name="uq_baseline_employee"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), index=True)

    events_analysed: Mapped[int] = mapped_column(Integer, default=0)
    days_observed: Mapped[int] = mapped_column(Integer, default=0)
    window_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    window_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    # Work / login patterns
    mean_login_hour: Mapped[float] = mapped_column(Float, default=9.0)
    std_login_hour: Mapped[float] = mapped_column(Float, default=1.5)
    typical_start_hour: Mapped[float] = mapped_column(Float, default=9.0)
    typical_end_hour: Mapped[float] = mapped_column(Float, default=18.0)
    weekend_activity_ratio: Mapped[float] = mapped_column(Float, default=0.0)
    after_hours_ratio: Mapped[float] = mapped_column(Float, default=0.0)

    # Volume patterns (per day)
    mean_daily_events: Mapped[float] = mapped_column(Float, default=0.0)
    std_daily_events: Mapped[float] = mapped_column(Float, default=1.0)
    mean_daily_downloads: Mapped[float] = mapped_column(Float, default=0.0)
    std_daily_downloads: Mapped[float] = mapped_column(Float, default=1.0)
    mean_daily_bytes: Mapped[float] = mapped_column(Float, default=0.0)
    std_daily_bytes: Mapped[float] = mapped_column(Float, default=1.0)
    mean_daily_uploads: Mapped[float] = mapped_column(Float, default=0.0)
    std_daily_uploads: Mapped[float] = mapped_column(Float, default=1.0)
    mean_daily_emails: Mapped[float] = mapped_column(Float, default=0.0)
    std_daily_emails: Mapped[float] = mapped_column(Float, default=1.0)
    mean_external_emails: Mapped[float] = mapped_column(Float, default=0.0)
    mean_daily_usb_events: Mapped[float] = mapped_column(Float, default=0.0)

    # Device / resource / application usage profiles (JSON encoded)
    device_profile: Mapped[str | None] = mapped_column(Text)
    application_profile: Mapped[str | None] = mapped_column(Text)
    resource_profile: Mapped[str | None] = mapped_column(Text)
    hourly_histogram: Mapped[str | None] = mapped_column(Text)

    quality_score: Mapped[float] = mapped_column(Float, default=0.0)  # baseline quality metric 0-100
    model_path: Mapped[str | None] = mapped_column(String(400))       # per-user IsolationForest

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)


class PeerGroupStat(Base):
    """Aggregated behaviour of a peer group (department + designation) for UEBA comparison."""
    __tablename__ = "peer_group_stats"
    __table_args__ = (UniqueConstraint("group_key", name="uq_peer_group_key"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    group_key: Mapped[str] = mapped_column(String(200), index=True)
    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))
    designation: Mapped[str | None] = mapped_column(String(120))
    member_count: Mapped[int] = mapped_column(Integer, default=0)

    metrics: Mapped[str | None] = mapped_column(Text)  # JSON: {feature: {mean, std, p95}}
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)
