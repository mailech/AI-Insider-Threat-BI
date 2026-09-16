"""Per-employee behavioral baselines used by UEBA and anomaly evaluation."""

import uuid

from sqlalchemy import Float, ForeignKey, Integer, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.employee import Employee


class BehaviorProfile(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "behavior_profiles"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        Uuid(as_uuid=True),
        ForeignKey("employees.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        nullable=False,
    )
    typical_login_hour_start: Mapped[int] = mapped_column(Integer, default=8, nullable=False)
    typical_login_hour_end: Mapped[int] = mapped_column(Integer, default=19, nullable=False)
    typical_daily_logins: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    typical_daily_downloads: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    typical_daily_transfers: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    typical_daily_emails: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    typical_daily_data_volume_mb: Mapped[float] = mapped_column(
        Float, default=0.0, nullable=False
    )
    typical_device_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    typical_applications: Mapped[str] = mapped_column(String(400), default="", nullable=False)

    employee: Mapped[Employee] = relationship()
