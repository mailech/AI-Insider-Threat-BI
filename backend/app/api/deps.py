"""
ITBIS — Shared FastAPI Dependencies
Provides reusable Depends() callables for:
  - Database session injection
  - Current-user resolution via JWT
  - RBAC role enforcement
"""

from __future__ import annotations

from typing import List

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_access_token
from app.db.session import SessionLocal
from app.models.domain import RoleEnum, User

# OAuth2 scheme — points to the login endpoint that issues tokens
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")


# ─────────────────────────────────────────────────────────────
# Database session
# ─────────────────────────────────────────────────────────────

def get_db() -> Session:
    """
    Yield a PostgreSQL session and close it when the request is complete.

    Usage:
        def endpoint(db: Session = Depends(get_db)): ...
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─────────────────────────────────────────────────────────────
# Current-user resolution
# ─────────────────────────────────────────────────────────────

_CREDENTIALS_EXCEPTION = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials.",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """
    Decode the Bearer JWT and return the matching User row.

    Raises 401 if the token is invalid, expired, or the user no longer exists.
    """
    try:
        payload = decode_access_token(token)
        email: str | None = payload.get("sub")
        if email is None:
            raise _CREDENTIALS_EXCEPTION
    except JWTError:
        raise _CREDENTIALS_EXCEPTION

    user: User | None = db.query(User).filter(User.email == email).first()
    if user is None:
        raise _CREDENTIALS_EXCEPTION
    return user


def get_current_active_user(
    current_user: User = Depends(get_current_user),
) -> User:
    """
    Extends get_current_user by additionally verifying the account is active.

    Raises 403 if the account has been deactivated.
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated.",
        )
    return current_user


# ─────────────────────────────────────────────────────────────
# RBAC role enforcement
# ─────────────────────────────────────────────────────────────

def require_roles(allowed_roles: List[RoleEnum]):
    """
    Factory that returns a FastAPI dependency enforcing role-based access.

    Usage:
        @router.get(
            "/admin-only",
            dependencies=[Depends(require_roles([RoleEnum.ADMINISTRATOR]))],
        )
        def admin_endpoint(): ...

    Or inject the verified user at the same time:
        def endpoint(
            user: User = Depends(require_roles([RoleEnum.ADMINISTRATOR,
                                                RoleEnum.SECURITY_MANAGER]))
        ): ...
    """
    def _check(current_user: User = Depends(get_current_active_user)) -> User:
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Access denied. Required role(s): "
                    f"{[r.value for r in allowed_roles]}. "
                    f"Your role: {current_user.role.value}."
                ),
            )
        return current_user

    return _check
