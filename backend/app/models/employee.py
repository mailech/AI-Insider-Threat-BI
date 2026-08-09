"""Monitored employees, their org placement, devices and access privileges."""

from datetime import date, datetime, timezone

from sqlalchemy import Boolean, Date, DateTime, Enum as SAEnum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import DeviceType, EmployeeStatus, PrivilegeLevel


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    code: Mapped[str] = mapped_column(String(20), unique=True, index=True, nullable=False)

    employees: Mapped[list["Employee"]] = relationship(back_populates="department")


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_code: Mapped[str] = mapped_column(
        String(32), unique=True, index=True, nullable=False
    )
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False)
    designation: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[EmployeeStatus] = mapped_column(
        SAEnum(EmployeeStatus, native_enum=False, length=32),
        default=EmployeeStatus.ACTIVE,
        nullable=False,
    )
    joined_at: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime, default=lambda: datetime.now(timezone.utc), nullable=False
    )

    department_id: Mapped[int | None] = mapped_column(
        ForeignKey("departments.id", ondelete="SET NULL"), nullable=True
    )
    manager_id: Mapped[int | None] = mapped_column(
        ForeignKey("employees.id", ondelete="SET NULL"), nullable=True
    )

    department: Mapped[Department | None] = relationship(back_populates="employees")
    manager: Mapped["Employee | None"] = relationship(remote_side="Employee.id")
    devices: Mapped[list["Device"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )
    privileges: Mapped[list["AccessPrivilege"]] = relationship(
        back_populates="employee", cascade="all, delete-orphan"
    )


class Device(Base):
    __tablename__ = "devices"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    hostname: Mapped[str] = mapped_column(String(120), nullable=False)
    device_type: Mapped[DeviceType] = mapped_column(
        SAEnum(DeviceType, native_enum=False, length=32),
        default=DeviceType.LAPTOP,
        nullable=False,
    )
    os: Mapped[str | None] = mapped_column(String(80), nullable=True)
    mac_address: Mapped[str | None] = mapped_column(String(32), nullable=True)
    is_managed: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    employee: Mapped[Employee] = relationship(back_populates="devices")


class AccessPrivilege(Base):
    __tablename__ = "access_privileges"

    id: Mapped[int] = mapped_column(primary_key=True)
    employee_id: Mapped[int] = mapped_column(
        ForeignKey("employees.id", ondelete="CASCADE"), index=True, nullable=False
    )
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    level: Mapped[PrivilegeLevel] = mapped_column(
        SAEnum(PrivilegeLevel, native_enum=False, length=32),
        default=PrivilegeLevel.READ,
        nullable=False,
    )

    employee: Mapped[Employee] = relationship(back_populates="privileges")
