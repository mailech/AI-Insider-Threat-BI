from typing import Generator, Optional, List
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
import jwt

from backend.app.core.config import settings
from backend.app.core.security import decode_access_token
from backend.app.core.roles import UserRole, Permission, has_permission
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.audit import AuditLog

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)


def get_current_user(
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    payload = decode_access_token(token)
    if payload is None:
        raise credentials_exception
    
    username: Optional[str] = payload.get("sub")
    if username is None:
        raise credentials_exception
    
    user = db.query(User).filter(User.username == username).first()
    if user is None or not user.is_active:
        raise credentials_exception
    
    return user


def require_role(allowed_roles: List[UserRole]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in [r.value for r in allowed_roles] and current_user.role != UserRole.ADMINISTRATOR.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"User with role '{current_user.role}' lacks sufficient privileges for this operation."
            )
        return current_user
    return role_checker


def require_permission(permission: Permission):
    def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation requires permission: {permission.value}"
            )
        return current_user
    return permission_checker


def record_audit(
    db: Session,
    username: str,
    role: str,
    action: str,
    resource: str,
    details: dict = None,
    ip_address: str = None
):
    try:
        log_entry = AuditLog(
            username=username,
            role=role,
            action=action,
            resource=resource,
            details=details or {},
            ip_address=ip_address
        )
        db.add(log_entry)
        db.commit()
    except Exception as e:
        db.rollback()
