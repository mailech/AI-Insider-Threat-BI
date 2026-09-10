from typing import Optional, Dict, Any
from pydantic import BaseModel, EmailStr


class LoginRequest(BaseModel):
    email: str
    password: str


class UserRead(BaseModel):
    id: int
    email: str
    name: str
    role: str
    initials: str
    department: str
    clearance: str
    is_active: bool

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserRead


class CurrentUserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    initials: str
    department: str
    clearance: str
    activeSession: Dict[str, Any]
    metrics: Dict[str, int]

    class Config:
        from_attributes = True
