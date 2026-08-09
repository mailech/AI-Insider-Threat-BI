"""Shared FastAPI dependencies: current user resolution and RBAC guards."""

from collections.abc import Callable

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import ACCESS_TOKEN, decode_token
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_PREFIX}/auth/login")

CREDENTIALS_ERROR = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Could not validate credentials",
    headers={"WWW-Authenticate": "Bearer"},
)


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:
    payload = decode_token(token, ACCESS_TOKEN)
    if payload is None:
        raise CREDENTIALS_ERROR

    subject = payload.get("sub")
    if subject is None or not str(subject).isdigit():
        raise CREDENTIALS_ERROR

    user = db.get(User, int(subject))
    if user is None:
        raise CREDENTIALS_ERROR
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="User account is deactivated"
        )
    return user


def require_roles(*roles: UserRole) -> Callable[[User], User]:
    """Guard a route to an explicit set of roles.

    Roles are listed per endpoint rather than derived from a hierarchy, so
    widening access is always a visible one-line change.
    """
    allowed = set(roles)

    def guard(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your role does not permit this operation",
            )
        return current_user

    return guard


ALL_ROLES = (
    UserRole.ADMIN,
    UserRole.SECURITY_MANAGER,
    UserRole.SOC_ENGINEER,
    UserRole.SECURITY_ANALYST,
)
WRITE_ROLES = (UserRole.ADMIN, UserRole.SECURITY_MANAGER)
INGEST_ROLES = (UserRole.ADMIN, UserRole.SECURITY_MANAGER, UserRole.SOC_ENGINEER)
ADMIN_ONLY = (UserRole.ADMIN,)

any_role = require_roles(*ALL_ROLES)
manager_or_admin = require_roles(*WRITE_ROLES)
soc_or_above = require_roles(*INGEST_ROLES)
admin_only = require_roles(*ADMIN_ONLY)
