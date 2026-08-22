"""
ITBIS — Security Utilities
Covers: password hashing (bcrypt) and JWT access-token creation/verification.
"""

from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Any

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

# ── bcrypt context ────────────────────────────────────────────────────────────
_pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Return True if *plain_password* matches the stored *hashed_password*."""
    return _pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    """Return a bcrypt hash of *password* suitable for database storage."""
    return _pwd_context.hash(password)


# ── JWT helpers ───────────────────────────────────────────────────────────────
_TOKEN_EXPIRE_HOURS = 8


def create_access_token(
    subject: str | Any,
    *,
    expires_delta: timedelta | None = None,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """
    Create a signed JWT access token.

    Parameters
    ----------
    subject:
        The principal this token represents (typically the user''s email or ID).
    expires_delta:
        Override the default 8-hour expiry.
    extra_claims:
        Additional claims merged into the payload (e.g. ``{"role": "ADMIN"}``).

    Returns
    -------
    str
        A compact, URL-safe JWT string.
    """
    now    = datetime.now(tz=timezone.utc)
    expire = now + (expires_delta or timedelta(hours=_TOKEN_EXPIRE_HOURS))

    payload: dict[str, Any] = {
        "sub": str(subject),
        "iat": now,
        "exp": expire,
    }
    if extra_claims:
        payload.update(extra_claims)

    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    """
    Decode and verify a JWT access token.

    Raises
    ------
    jose.JWTError
        If the token is expired, malformed, or has an invalid signature.
    """
    return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
