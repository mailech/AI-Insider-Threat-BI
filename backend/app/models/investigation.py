"""Investigation workflow and its persisted timeline."""

import uuid
from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.models.anomaly import Severity
from app.models.employee import Employee
from app.models.user import User


class InvestigationStatus(StrEnum):
    OPEN = "Open"
    IN_PROGRESS = "In Progress"
    ESCALATED = "Escalated"
    RESOLVED = "Resolved"
    CLOSED = "Closed"


class Investigation(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "investigations"

    reference: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(Text, default="", nullable=False)
    status: Mapped[InvestigationStatus] = mapped_column(
        String(20), default=InvestigationStatus.OPEN, index=True, nullable=False
    )
    severity: Mapped[Severity] = mapped_column(
        String(20), default=Severity.MEDIUM, index=True, nullable=False
    )

    employee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    anomaly_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("anomalies.id", ondelete="SET NULL"), nullable=True
    )
    alert_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("alerts.id", ondelete="SET NULL"), nullable=True
    )
    risk_score_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("risk_scores.id", ondelete="SET NULL"), nullable=True
    )

    created_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    assigned_to_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True, nullable=True
    )
    resolved_by_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    resolution: Mapped[str | None] = mapped_column(Text, nullable=True)
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    closed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    employee: Mapped[Employee] = relationship()
    created_by: Mapped[User | None] = relationship(foreign_keys=[created_by_id])
    assigned_to: Mapped[User | None] = relationship(foreign_keys=[assigned_to_id])
    resolved_by: Mapped[User | None] = relationship(foreign_keys=[resolved_by_id])
    events: Mapped[list["InvestigationEvent"]] = relationship(
        back_populates="investigation",
        cascade="all, delete-orphan",
        order_by="InvestigationEvent.occurred_at",
        lazy="selectin",
    )


class InvestigationEvent(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "investigation_events"

    investigation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("investigations.id", ondelete="CASCADE"), index=True, nullable=False
    )
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    event_type: Mapped[str] = mapped_column(String(40), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    actor_name: Mapped[str | None] = mapped_column(String(160), nullable=True)

    investigation: Mapped[Investigation] = relationship(back_populates="events")
