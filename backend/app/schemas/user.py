"""Auth and user schemas (module 1)."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import Role


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    role: Role = Role.SECURITY_ANALYST
    phone: Optional[str] = None
    job_title: Optional[str] = None


class UserCreate(UserBase):
    password: str = Field(min_length=8, max_length=128)


class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=255)
    password: str = Field(min_length=8, max_length=128)
    role: Role = Role.SECURITY_ANALYST


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    job_title: Optional[str] = None
    avatar_url: Optional[str] = None


class UserAdminUpdate(UserUpdate):
    role: Optional[Role] = None
    is_active: Optional[bool] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    is_active: bool
    is_verified: bool
    auth_provider: str
    avatar_url: Optional[str] = None
    last_login_at: Optional[datetime] = None
    created_at: datetime


class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserOut


class RefreshRequest(BaseModel):
    refresh_token: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str
