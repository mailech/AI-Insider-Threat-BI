"""
ITBIS — Security Utilities
Covers: password hashing (bcrypt) and JWT access-token creation/verification.
"""

from __future__ import annotations

import hashlib
import hmac
import secrets
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


# ── Agent API keys ────────────────────────────────────────────────────────────
AGENT_API_KEY_PREFIX = "itbis_ag"


def generate_agent_api_key() -> str:
    """
    Issue a one-time agent credential of the form ``itbis_ag_<reference>_<secret>``.

    Only a keyed hash of the full string is stored; the plaintext is returned
    to the operator once at enrollment / rotation.
    """
    reference = secrets.token_urlsafe(10).replace("-", "").replace("_", "")[:12]
    secret = secrets.token_urlsafe(24).replace("-", "").replace("_", "")[:32]
    if len(reference) < 8 or len(secret) < 24:
        reference = secrets.token_hex(6)
        secret = secrets.token_hex(16)
    return f"{AGENT_API_KEY_PREFIX}_{reference}_{secret}"


def hash_agent_api_key(raw_key: str) -> str:
    """Return an HMAC-SHA256 hex digest of *raw_key* using the app secret."""
    return hmac.new(
        settings.SECRET_KEY.encode("utf-8"),
        raw_key.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()


def verify_agent_api_key(raw_key: str, stored_hash: str) -> bool:
    """Constant-time comparison of a presented agent key against its stored hash."""
    candidate = hash_agent_api_key(raw_key)
    return hmac.compare_digest(candidate, stored_hash)
