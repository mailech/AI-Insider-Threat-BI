"""Password hashing and JWT token helpers."""
from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto", bcrypt__rounds=10)

ACCESS = "access"
REFRESH = "refresh"


def hash_password(password: str) -> str:
    # bcrypt has a hard 72-byte limit
    return pwd_context.hash(password[:72])


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return pwd_context.verify(plain[:72], hashed)
    except Exception:
        return False


def _create_token(subject: str, token_type: str, expires: timedelta, extra: Optional[Dict[str, Any]] = None) -> str:
    now = datetime.now(timezone.utc)
    payload: Dict[str, Any] = {
        "sub": str(subject),
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires).timestamp()),
        "jti": uuid.uuid4().hex,
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(subject: str, role: str, **extra: Any) -> str:
    return _create_token(
        subject,
        ACCESS,
        timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        {"role": role, **extra},
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(subject, REFRESH, timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None
