"""Monitored employees and their associated devices."""

import uuid

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Employee(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "employees"

    employee_code: Mapped[str] = mapped_column(
        String(40), unique=True, index=True, nullable=False
    )
    first_name: Mapped[str] = mapped_column(String(80), nullable=False)
    last_name: Mapped[str] = mapped_column(String(80), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    department: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    designation: Mapped[str] = mapped_column(String(80), index=True, nullable=False)
    manager: Mapped[str | None] = mapped_column(String(160), nullable=True)
    access_level: Mapped[str] = mapped_column(String(40), nullable=False, default="Standard")
    access_privileges: Mapped[str] = mapped_column(String(400), nullable=False, default="")

    devices: Mapped[list["Device"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan", lazy="selectin"
    )

    @property
    def full_name(self) -> str:
        return f"{self.first_name} {self.last_name}"


class Device(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "devices"

    employee_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    device_type: Mapped[str] = mapped_column(String(60), nullable=False)
    operating_system: Mapped[str] = mapped_column(String(60), nullable=False)
    serial_number: Mapped[str] = mapped_column(String(60), nullable=False)

    employee: Mapped[Employee] = relationship(back_populates="devices")
