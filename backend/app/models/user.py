"""Application user accounts and roles."""

from datetime import datetime
from enum import StrEnum

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class Role(StrEnum):
    ADMINISTRATOR = "Administrator"
    SECURITY_MANAGER = "Security Manager"
    SOC_ENGINEER = "SOC Engineer"
    SECURITY_ANALYST = "Security Analyst"


class UserStatus(StrEnum):
    ACTIVE = "Active"
    INVITED = "Invited"
    DISABLED = "Disabled"


class User(UUIDPrimaryKeyMixin, TimestampMixin, Base):
    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    full_name: Mapped[str] = mapped_column(String(160), nullable=False)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[Role] = mapped_column(String(40), index=True, nullable=False)
    status: Mapped[UserStatus] = mapped_column(
        String(20), default=UserStatus.ACTIVE, nullable=False
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
