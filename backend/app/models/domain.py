"""
ITBIS — SQLAlchemy ORM Models
Modules: Auth/RBAC (User) | Employee Identity (Employee, Asset)
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Float,
    DateTime, ForeignKey, Enum as SAEnum, Text,
)
from sqlalchemy.orm import Mapped, relationship
from app.db.session import Base


# ─────────────────────────────────────────────────────────────
# Enumerations
# ─────────────────────────────────────────────────────────────

class RoleEnum(str, enum.Enum):
    """System roles that govern RBAC permissions."""
    SECURITY_ANALYST  = "SECURITY_ANALYST"
    SOC_ENGINEER      = "SOC_ENGINEER"
    SECURITY_MANAGER  = "SECURITY_MANAGER"
    ADMINISTRATOR     = "ADMINISTRATOR"


class AssetTypeEnum(str, enum.Enum):
    """Category of a tracked corporate asset."""
    DEVICE = "DEVICE"
    IP     = "IP"


class AccessLevelEnum(str, enum.Enum):
    """Access privilege tier assigned to an employee."""
    READ  = "READ"
    WRITE = "WRITE"
    ADMIN = "ADMIN"


class RiskCategoryEnum(str, enum.Enum):
    """
    Risk band derived from the numeric risk_score.
    Values use short-code strings (e.g. 'LOW') to align with the
    frontend TypeScript RiskCategory type and API consumers.

    Score thresholds:
        CRITICAL : >= 0.80
        HIGH     : >= 0.60
        MEDIUM   : >= 0.30
        LOW      : <  0.30
    """
    LOW      = "LOW"
    MEDIUM   = "MEDIUM"
    HIGH     = "HIGH"
    CRITICAL = "CRITICAL"


# ─────────────────────────────────────────────────────────────
# Module 1 — Auth / RBAC
# ─────────────────────────────────────────────────────────────

class User(Base):
    """
    Platform user account.
    Stores credentials and the RBAC role that controls UI/API access.
    """
    __tablename__ = "users"

    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(
                        SAEnum(RoleEnum, name="roleenum", create_type=True),
                        nullable=False,
                        default=RoleEnum.SECURITY_ANALYST,
                    )
    is_active       = Column(Boolean, nullable=False, default=True)
    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<User id={self.id} email={self.email!r} role={self.role}>"


# ─────────────────────────────────────────────────────────────
# Module 2 — Employee Identity
# ─────────────────────────────────────────────────────────────

class Employee(Base):
    """
    Monitored employee entity.
    Holds identity metadata and a continuously updated risk profile.
    """
    __tablename__ = "employees"

    id            = Column(Integer, primary_key=True, index=True)
    emp_id        = Column(String(20), unique=True, nullable=False, index=True,
                           comment="Human-readable ID, e.g. 'emp_4091'")
    first_name    = Column(String(100), nullable=False)
    last_name     = Column(String(100), nullable=False)
    department    = Column(String(150), nullable=False)
    designation   = Column(String(150), nullable=False)
    manager_name  = Column(String(200), nullable=True)

    # ── Device Information (Milestone 1 requirement) ───────────
    device_id     = Column(String(100), nullable=True,  index=True,
                           comment="Primary device tag assigned to this employee, e.g. 'ASSET-LT-001'")
    ip_address    = Column(String(45),  nullable=True,
                           comment="Primary IP address associated with this employee (IPv4 or IPv6)")
    os_type       = Column(String(50),  nullable=True,
                           comment="Operating system on the primary device, e.g. 'Windows 11', 'Ubuntu 22.04'")

    # ── Access Privileges (Milestone 1 requirement) ─────────────
    access_level  = Column(
                        SAEnum(AccessLevelEnum, name="accesslevelenum", create_type=True),
                        nullable=False,
                        default=AccessLevelEnum.READ,
                        comment="Highest access privilege tier granted to this employee",
                    )

    # ── Risk profile ───────────────────────────────────────────
    risk_score    = Column(Float,  nullable=False, default=0.0,
                           comment="Normalised 0.0–1.0 anomaly score")
    risk_category = Column(
                        SAEnum(RiskCategoryEnum, name="riskcategoryenum", create_type=True),
                        nullable=False,
                        default=RiskCategoryEnum.LOW,
                    )

    created_at    = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at    = Column(
                        DateTime,
                        nullable=False,
                        default=datetime.utcnow,
                        onupdate=datetime.utcnow,
                        comment="Timestamp of last profile update (risk re-score or manual edit)",
                    )

    # ── Relationships ──────────────────────────────────────────
    assets: Mapped[list["Asset"]] = relationship(
        "Asset", back_populates="employee", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return (
            f"<Employee id={self.id} emp_id={self.emp_id!r} "
            f"name={self.first_name} {self.last_name} risk={self.risk_score:.2f}>"
        )


class Asset(Base):
    """
    Corporate asset (physical device or IP address) assigned to an employee.
    Used to track endpoint and network activity per identity.
    """
    __tablename__ = "assets"

    id          = Column(Integer, primary_key=True, index=True)
    asset_id    = Column(String(50), nullable=False, index=True,
                         comment="Internal asset tag or UUID")
    asset_type  = Column(
                    SAEnum(AssetTypeEnum, name="assettypeenum", create_type=True),
                    nullable=False,
                  )
    ip_address  = Column(String(45),  nullable=True,  comment="IPv4 or IPv6")
    mac_address = Column(String(17),  nullable=True,  comment="AA:BB:CC:DD:EE:FF")

    # ── Foreign key ────────────────────────────────────────────
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"),
                         nullable=False, index=True)
    employee: Mapped["Employee"] = relationship("Employee", back_populates="assets")

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self) -> str:
        return (
            f"<Asset id={self.id} asset_id={self.asset_id!r} "
            f"type={self.asset_type} ip={self.ip_address}>"
        )
