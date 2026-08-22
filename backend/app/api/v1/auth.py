"""
ITBIS — Authentication & RBAC Endpoints  (Module 1)
Routes:
  POST /api/v1/auth/register  — create a new platform user
  POST /api/v1/auth/login     — exchange credentials for a JWT
  GET  /api/v1/auth/me        — return the current user profile
"""

from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.core.security import create_access_token, get_password_hash, verify_password
from app.models.domain import User
from app.schemas.schemas import TokenResponse, UserCreate, UserRead

router = APIRouter(prefix="/auth", tags=["Authentication"])


# ─────────────────────────────────────────────────────────────
# POST /api/v1/auth/register
# ─────────────────────────────────────────────────────────────

@router.post(
    "/register",
    response_model=UserRead,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new platform user",
    description=(
        "Creates a new ITBIS user account. "
        "The *role* field defaults to `SECURITY_ANALYST` if omitted. "
        "Only an `ADMINISTRATOR` should expose this endpoint to the public; "
        "consider adding `require_roles([RoleEnum.ADMINISTRATOR])` in production."
    ),
)
def register(payload: UserCreate, db: Session = Depends(get_db)) -> UserRead:
    # Prevent duplicate accounts
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{payload.email}' already exists.",
        )

    user = User(
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=True,
        created_at=datetime.now(tz=timezone.utc),
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


# ─────────────────────────────────────────────────────────────
# POST /api/v1/auth/login
# ─────────────────────────────────────────────────────────────

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Authenticate and receive a JWT access token",
    description=(
        "Accepts `application/x-www-form-urlencoded` credentials "
        "(compatible with the OAuth2 password flow). "
        "Returns an 8-hour JWT together with the authenticated user details and role."
    ),
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
) -> TokenResponse:
    # Resolve user by email (OAuth2 spec uses the `username` field)
    user: User | None = (
        db.query(User).filter(User.email == form_data.username).first()
    )

    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact your administrator.",
        )

    access_token = create_access_token(
        subject=user.email,
        extra_claims={
            "role":    user.role.value,
            "user_id": user.id,
        },
    )

    return TokenResponse(access_token=access_token, token_type="bearer")


# ─────────────────────────────────────────────────────────────
# GET /api/v1/auth/me
# ─────────────────────────────────────────────────────────────

@router.get(
    "/me",
    response_model=UserRead,
    summary="Get current authenticated user profile",
    description=(
        "Returns the profile of the user identified by the Bearer JWT "
        "in the `Authorization` header. Raises 401 if the token is missing "
        "or invalid, and 403 if the account is inactive."
    ),
)
def get_me(current_user: User = Depends(get_current_active_user)) -> UserRead:
    return current_user
