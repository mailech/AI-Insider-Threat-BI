"""Shared FastAPI dependencies: DB session, current user and RBAC guards."""
from __future__ import annotations

from typing import Callable, Iterable, List, Optional

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import ACCESS, decode_token
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login", auto_error=False)

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise CREDENTIALS_ERROR
    payload = decode_token(token)
    if not payload or payload.get("type") != ACCESS:
        raise CREDENTIALS_ERROR
    try:
        user_id = int(payload.get("sub", ""))
    except (TypeError, ValueError):
        raise CREDENTIALS_ERROR
    user = db.execute(select(User).where(User.id == user_id)).scalar_one_or_none()
    if user is None:
        raise CREDENTIALS_ERROR
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")
    return user


def get_optional_user(
    token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> Optional[User]:
    try:
        return get_current_user(token=token, db=db)
    except HTTPException:
        return None


class RequireRoles:
    """Role-based access control guard (module 1).

    Usage: ``Depends(RequireRoles(Role.ADMINISTRATOR, Role.SECURITY_MANAGER))``
    """

    def __init__(self, *roles: Role) -> None:
        self.roles = {r.value if isinstance(r, Role) else str(r) for r in roles}

    def __call__(self, user: User = Depends(get_current_user)) -> User:
        # Administrators retain full platform access by design.
        if user.role == Role.ADMINISTRATOR.value or not self.roles:
            return user
        if user.role not in self.roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{user.role}' is not permitted to perform this action",
            )
        return user


# Convenience guards used across the routers.
require_admin = RequireRoles(Role.ADMINISTRATOR)
require_manager = RequireRoles(Role.SECURITY_MANAGER, Role.ADMINISTRATOR)
require_soc = RequireRoles(Role.SOC_ENGINEER, Role.SECURITY_MANAGER, Role.ADMINISTRATOR)
require_analyst = RequireRoles(
    Role.SECURITY_ANALYST, Role.SOC_ENGINEER, Role.SECURITY_MANAGER, Role.ADMINISTRATOR
)


def client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
