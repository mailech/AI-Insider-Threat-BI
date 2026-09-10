"""Authentication, OAuth2 and profile endpoints (module 1)."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Dict
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import client_ip, get_current_user
from app.core.config import settings
from app.core.security import (
    REFRESH,
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.schemas.common import Message
from app.schemas.user import (
    LoginRequest,
    PasswordChange,
    RefreshRequest,
    Token,
    UserOut,
    UserRegister,
    UserUpdate,
)
from app.services import audit

router = APIRouter(prefix="/auth", tags=["Authentication"])


def _token_response(user: User) -> Dict[str, Any]:
    return {
        "access_token": create_access_token(str(user.id), user.role, email=user.email),
        "refresh_token": create_refresh_token(str(user.id)),
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": UserOut.model_validate(user),
    }


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserRegister, request: Request, db: Session = Depends(get_db)) -> Any:
    """Self-service registration. The first account created becomes administrator."""
    existing = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email is already registered")

    is_first_user = db.execute(select(User.id).limit(1)).scalar_one_or_none() is None
    user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        hashed_password=hash_password(payload.password),
        role=Role.ADMINISTRATOR.value if is_first_user else payload.role.value,
        is_verified=is_first_user,
    )
    db.add(user)
    db.flush()
    audit.record(db, "user.register", user, "user", user.id, f"role={user.role}", client_ip(request))
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, request: Request, db: Session = Depends(get_db)) -> Any:
    user = db.execute(select(User).where(User.email == payload.email.lower())).scalar_one_or_none()
    if not user or not user.hashed_password or not verify_password(payload.password, user.hashed_password):
        if user:
            user.failed_login_count += 1
            db.commit()
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    user.last_login_at = datetime.now(timezone.utc)
    user.failed_login_count = 0
    audit.record(db, "user.login", user, "user", user.id, None, client_ip(request))
    db.commit()
    db.refresh(user)
    return _token_response(user)


@router.post("/token", response_model=Token, include_in_schema=False)
def login_form(
    form: OAuth2PasswordRequestForm = Depends(),
    request: Request = None,
    db: Session = Depends(get_db),
) -> Any:
    """OAuth2 password-flow endpoint so the Swagger UI Authorize button works."""
    return login(LoginRequest(email=form.username, password=form.password), request, db)


@router.post("/refresh", response_model=Token)
def refresh_token(payload: RefreshRequest, db: Session = Depends(get_db)) -> Any:
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != REFRESH:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    user = db.execute(select(User).where(User.id == int(data["sub"]))).scalar_one_or_none()
    if not user or not user.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    return _token_response(user)


@router.get("/me", response_model=UserOut)
def read_me(user: User = Depends(get_current_user)) -> Any:
    return user


@router.patch("/me", response_model=UserOut)
def update_me(
    payload: UserUpdate,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    audit.record(db, "user.profile_update", user, "user", user.id, None, client_ip(request))
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password", response_model=Message)
def change_password(
    payload: PasswordChange,
    request: Request,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Any:
    if not user.hashed_password or not verify_password(payload.current_password, user.hashed_password):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect")
    user.hashed_password = hash_password(payload.new_password)
    audit.record(db, "user.password_change", user, "user", user.id, None, client_ip(request))
    db.commit()
    return {"detail": "Password updated successfully"}


# ------------------------------------------------------------ OAuth2 (Google)
GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth"
GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token"
GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo"


@router.get("/oauth/google/authorize")
def google_authorize() -> Any:
    """Start the Google OAuth2 authorisation-code flow."""
    if not settings.GOOGLE_CLIENT_ID:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="Google OAuth is not configured. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.",
        )
    params = {
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.OAUTH_REDIRECT_URL,
        "response_type": "code",
        "scope": "openid email profile",
        "access_type": "offline",
        "prompt": "consent",
    }
    return {"authorization_url": f"{GOOGLE_AUTH_URL}?{urlencode(params)}"}


@router.get("/oauth/google/callback")
async def google_callback(code: str, request: Request, db: Session = Depends(get_db)) -> Any:
    """Exchange the authorisation code, provision the user and hand back tokens."""
    if not settings.GOOGLE_CLIENT_ID or not settings.GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Google OAuth is not configured")

    async with httpx.AsyncClient(timeout=15.0) as client:
        token_response = await client.post(
            GOOGLE_TOKEN_URL,
            data={
                "code": code,
                "client_id": settings.GOOGLE_CLIENT_ID,
                "client_secret": settings.GOOGLE_CLIENT_SECRET,
                "redirect_uri": settings.OAUTH_REDIRECT_URL,
                "grant_type": "authorization_code",
            },
        )
        if token_response.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="OAuth token exchange failed")
        access_token = token_response.json().get("access_token")
        profile_response = await client.get(
            GOOGLE_USERINFO_URL, headers={"Authorization": f"Bearer {access_token}"}
        )
        if profile_response.status_code != 200:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Could not fetch Google profile")
        profile = profile_response.json()

    email = (profile.get("email") or "").lower()
    if not email:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Google account has no email address")

    user = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
    if user is None:
        user = User(
            email=email,
            full_name=profile.get("name") or email.split("@")[0],
            role=Role.SECURITY_ANALYST.value,
            auth_provider="google",
            is_verified=True,
            avatar_url=profile.get("picture"),
        )
        db.add(user)
        db.flush()
    user.last_login_at = datetime.now(timezone.utc)
    audit.record(db, "user.login_oauth", user, "user", user.id, "provider=google", client_ip(request))
    db.commit()
    db.refresh(user)

    tokens = _token_response(user)
    redirect = f"{settings.FRONTEND_URL}/oauth/callback?access_token={tokens['access_token']}&refresh_token={tokens['refresh_token']}"
    return RedirectResponse(url=redirect, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
