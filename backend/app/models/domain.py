"""
ITBIS — SQLAlchemy ORM Models
Modules: Auth/RBAC (User) | Employee Identity (Employee, Asset) | Incidents (Milestone 3)
"""

import enum
from datetime import datetime
from sqlalchemy import (
    Column, Integer, String, Boolean, Float,
    DateTime, ForeignKey, Enum as SAEnum, Text, JSON,
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


class IncidentStatusEnum(str, enum.Enum):
    """
    Lifecycle status of a Security Incident.

    Workflow:
        NEW → UNDER_INVESTIGATION → RESOLVED | FALSE_POSITIVE
    """
    NEW                  = "NEW"
    UNDER_INVESTIGATION  = "UNDER_INVESTIGATION"
    RESOLVED             = "RESOLVED"
    FALSE_POSITIVE       = "FALSE_POSITIVE"


class IncidentSeverityEnum(str, enum.Enum):
    """Severity tier of an incident, mirrors the threat score bands."""
    CRITICAL = "CRITICAL"
    HIGH     = "HIGH"
    MEDIUM   = "MEDIUM"
    LOW      = "LOW"


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
    access_isolated = Column(
                        Boolean,
                        nullable=False,
                        default=False,
                        comment="True when SOC has isolated this identity's access as a containment action",
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
    incidents: Mapped[list["Incident"]] = relationship(
        "Incident", back_populates="employee", cascade="all, delete-orphan"
    )
    behavioral_baseline: Mapped["BehavioralBaseline | None"] = relationship(
        "BehavioralBaseline",
        back_populates="employee",
        uselist=False,
        cascade="all, delete-orphan",
    )

    def __repr__(self) -> str:
        return (
            f"<Employee id={self.id} emp_id={self.emp_id!r} "
            f"name={self.first_name} {self.last_name} risk={self.risk_score:.2f}>"
        )


class BehavioralBaseline(Base):
    """
    Per-employee behavioral baseline matrix (Milestone 2).

    Stores typical login hours and average download/upload volumes derived
    from telemetry so risk scoring can measure pattern deviations.
    """
    __tablename__ = "behavioral_baselines"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(
        Integer,
        ForeignKey("employees.id", ondelete="CASCADE"),
        nullable=False,
        unique=True,
        index=True,
    )
    employee: Mapped["Employee"] = relationship("Employee", back_populates="behavioral_baseline")

    typical_login_hour_start = Column(Integer, nullable=False, default=8,
                                      comment="Earliest typical weekday login hour (0-23 UTC)")
    typical_login_hour_end = Column(Integer, nullable=False, default=18,
                                    comment="Latest typical weekday login hour (0-23 UTC)")
    peak_login_hour = Column(Integer, nullable=False, default=9,
                             comment="Most frequent weekday login hour")
    avg_download_mb_per_day = Column(Float, nullable=False, default=0.0)
    avg_upload_mb_per_day = Column(Float, nullable=False, default=0.0)
    avg_daily_logins = Column(Float, nullable=False, default=0.0)
    sample_event_count = Column(Integer, nullable=False, default=0)
    window_days = Column(Integer, nullable=False, default=14)
    login_hour_histogram = Column(JSON, nullable=True,
                                  comment="Map of hour (str) -> login count")
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    def __repr__(self) -> str:
        return (
            f"<BehavioralBaseline emp={self.employee_id} "
            f"hours={self.typical_login_hour_start}-{self.typical_login_hour_end} "
            f"dl={self.avg_download_mb_per_day:.1f}MB/d>"
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


# ─────────────────────────────────────────────────────────────
# Module 7 — Incident & Alert Management  (Milestone 3)
# ─────────────────────────────────────────────────────────────

class Incident(Base):
    """
    Security Incident automatically triggered when an employee's ML
    anomaly score exceeds the CRITICAL_SCORE_THRESHOLD (>75/100).
    Can also be created manually by SOC analysts.

    Lifecycle: NEW → UNDER_INVESTIGATION → RESOLVED | FALSE_POSITIVE
    """
    __tablename__ = "incidents"

    id              = Column(Integer, primary_key=True, index=True)
    title           = Column(String(255), nullable=False,
                             comment="Short descriptor auto-generated from trigger reason")
    description     = Column(Text, nullable=True,
                             comment="Free-form context set at creation or updated by analyst")

    # ── Classification ─────────────────────────────────────────
    status          = Column(
                          SAEnum(IncidentStatusEnum, name="incidentstatusenum", create_type=True),
                          nullable=False,
                          default=IncidentStatusEnum.NEW,
                          index=True,
                      )
    severity        = Column(
                          SAEnum(IncidentSeverityEnum, name="incidentseverityenum", create_type=True),
                          nullable=False,
                          default=IncidentSeverityEnum.HIGH,
                          index=True,
                      )

    # ── Scoring snapshot at trigger time ───────────────────────
    threat_score    = Column(Integer, nullable=False, default=0,
                             comment="Threat score (0–100) at the moment the incident was created")

    # ── Employee reference ─────────────────────────────────────
    employee_id     = Column(
                          Integer,
                          ForeignKey("employees.id", ondelete="CASCADE"),
                          nullable=False,
                          index=True,
                      )
    employee: Mapped["Employee"] = relationship("Employee", back_populates="incidents")

    # ── Assignment (optional) ──────────────────────────────────
    assigned_to_id  = Column(
                          Integer,
                          ForeignKey("users.id", ondelete="SET NULL"),
                          nullable=True,
                          index=True,
                          comment="User (analyst/SOC engineer) who owns the case",
                      )
    assigned_to: Mapped["User"] = relationship("User", foreign_keys=[assigned_to_id])

    # ── Trigger metadata ───────────────────────────────────────
    trigger_reason  = Column(String(100), nullable=False, default="ML_AUTO_TRIGGER",
                             comment="Why this incident was created: ML_AUTO_TRIGGER | MANUAL")
    triggered_at    = Column(DateTime, nullable=False, default=datetime.utcnow,
                             comment="Timestamp when the triggering event/score was observed")

    # ── Audit timestamps ───────────────────────────────────────
    created_at      = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at      = Column(
                          DateTime,
                          nullable=False,
                          default=datetime.utcnow,
                          onupdate=datetime.utcnow,
                      )
    resolved_at     = Column(DateTime, nullable=True,
                             comment="Set when status transitions to RESOLVED or FALSE_POSITIVE")

    # ── Relationships ──────────────────────────────────────────
    comments: Mapped[list["IncidentComment"]] = relationship(
        "IncidentComment", back_populates="incident", cascade="all, delete-orphan",
        order_by="IncidentComment.created_at",
    )

    def __repr__(self) -> str:
        return (
            f"<Incident id={self.id} title={self.title!r} "
            f"status={self.status} severity={self.severity}>"
        )


class IncidentComment(Base):
    """
    Analyst case note attached to a Security Incident.
    Supports a full threaded audit trail of investigation activity.
    """
    __tablename__ = "incident_comments"

    id          = Column(Integer, primary_key=True, index=True)
    content     = Column(Text, nullable=False)

    incident_id = Column(
                      Integer,
                      ForeignKey("incidents.id", ondelete="CASCADE"),
                      nullable=False,
                      index=True,
                  )
    incident: Mapped["Incident"] = relationship("Incident", back_populates="comments")

    author_id   = Column(
                      Integer,
                      ForeignKey("users.id", ondelete="SET NULL"),
                      nullable=True,
                  )
    author: Mapped["User"] = relationship("User", foreign_keys=[author_id])

    created_at  = Column(DateTime, nullable=False, default=datetime.utcnow)

    def __repr__(self) -> str:
        return f"<IncidentComment id={self.id} incident_id={self.incident_id}>"
