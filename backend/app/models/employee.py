"""Employee identity, department and asset models (module 2)."""
from __future__ import annotations

from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, Float, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.session import Base
from app.models.enums import EmploymentStatus
from app.models.user import utcnow


class Department(Base):
    __tablename__ = "departments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True, nullable=False)
    code: Mapped[str | None] = mapped_column(String(30))
    description: Mapped[str | None] = mapped_column(Text)
    risk_weight: Mapped[float] = mapped_column(Float, default=1.0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    employees: Mapped[list["Employee"]] = relationship(back_populates="department")


class Employee(Base):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_code: Mapped[str] = mapped_column(String(60), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), index=True, nullable=False)

    department_id: Mapped[int | None] = mapped_column(ForeignKey("departments.id"))
    designation: Mapped[str | None] = mapped_column(String(120))
    manager_id: Mapped[int | None] = mapped_column(ForeignKey("employees.id"))
    location: Mapped[str | None] = mapped_column(String(120))

    employment_status: Mapped[str] = mapped_column(String(30), default=EmploymentStatus.ACTIVE.value)
    joined_on: Mapped[date | None] = mapped_column(Date)
    exit_on: Mapped[date | None] = mapped_column(Date)

    # Access privileges / clearance
    access_level: Mapped[str] = mapped_column(String(30), default="standard")  # standard|elevated|privileged|admin
    privileges: Mapped[str | None] = mapped_column(Text)  # comma separated privilege tags
    is_privileged: Mapped[bool] = mapped_column(Boolean, default=False)
    on_watchlist: Mapped[bool] = mapped_column(Boolean, default=False)

    # Denormalised current risk (kept in sync by the scoring engine)
    current_risk_score: Mapped[float] = mapped_column(Float, default=0.0)
    current_risk_category: Mapped[str] = mapped_column(String(20), default="low")
    baseline_ready: Mapped[bool] = mapped_column(Boolean, default=False)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow)

    department: Mapped["Department | None"] = relationship(back_populates="employees")
    manager: Mapped["Employee | None"] = relationship(remote_side="Employee.id")
    assets: Mapped[list["Asset"]] = relationship(back_populates="employee", cascade="all, delete-orphan")


class Asset(Base):
    """Device / asset association (module 2)."""
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id", ondelete="CASCADE"), index=True)
    asset_tag: Mapped[str] = mapped_column(String(80), index=True)
    device_type: Mapped[str] = mapped_column(String(50), default="laptop")
    hostname: Mapped[str | None] = mapped_column(String(120))
    os: Mapped[str | None] = mapped_column(String(80))
    ip_address: Mapped[str | None] = mapped_column(String(60))
    mac_address: Mapped[str | None] = mapped_column(String(60))
    is_managed: Mapped[bool] = mapped_column(Boolean, default=True)
    assigned_on: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    employee: Mapped["Employee"] = relationship(back_populates="assets")
