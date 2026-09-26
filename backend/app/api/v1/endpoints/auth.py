from datetime import timedelta
from typing import Any
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.app.core.config import settings
from backend.app.core.security import verify_password, get_password_hash, create_access_token
from backend.app.core.roles import UserRole
from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.schemas.auth import Token, LoginRequest, RegisterRequest
from backend.app.schemas.user import UserResponse
from backend.app.api.deps import get_current_user, record_audit

router = APIRouter()


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(
    request: RegisterRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    Register a new SOC analyst or user.
    """
    # Check if username or email exists
    if db.query(User).filter(User.username == request.username).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered."
        )
    if db.query(User).filter(User.email == request.email).first():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email address already registered."
        )

    # Validate role
    valid_roles = [r.value for r in UserRole]
    if request.role not in valid_roles:
        request.role = UserRole.SECURITY_ANALYST.value

    user = User(
        username=request.username,
        email=request.email,
        full_name=request.full_name,
        hashed_password=get_password_hash(request.password),
        role=request.role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    record_audit(db, user.username, user.role, "REGISTER", "/api/auth/register", {"email": user.email})
    return user


@router.post("/login", response_model=Token)
def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> Any:
    """
    JSON login endpoint returning JWT access token with role permissions.
    """
    user = db.query(User).filter(User.username == login_data.username).first()
    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated"
        )

    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        subject=user.username,
        role=user.role,
        expires_delta=access_token_expires
    )

    record_audit(db, user.username, user.role, "LOGIN", "/api/auth/login")
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role,
        "username": user.username,
        "full_name": user.full_name
    }


@router.get("/me", response_model=UserResponse)
def get_current_user_profile(
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get current logged in user details and role.
    """
    return current_user
