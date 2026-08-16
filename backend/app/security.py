import base64
import hashlib
import hmac
import json
import time
from typing import Callable

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from backend.app.config import ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY, role_label
from backend.app.database import get_connection, row_to_dict


bearer_scheme = HTTPBearer(auto_error=False)


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, password_hash: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), password_hash.encode("utf-8"))


def _b64encode(raw: bytes) -> str:
    return base64.urlsafe_b64encode(raw).rstrip(b"=").decode("ascii")


def _b64decode(value: str) -> bytes:
    padding = "=" * (-len(value) % 4)
    return base64.urlsafe_b64decode(value + padding)


def create_access_token(user_id: int, role: str) -> str:
    now = int(time.time())
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        "sub": str(user_id),
        "role": role,
        "iat": now,
        "exp": now + ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }
    encoded_header = _b64encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
    encoded_payload = _b64encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
    signing_input = f"{encoded_header}.{encoded_payload}"
    signature = hmac.new(SECRET_KEY.encode("utf-8"), signing_input.encode("ascii"), hashlib.sha256).digest()
    return f"{signing_input}.{_b64encode(signature)}"


def decode_access_token(token: str) -> dict:
    try:
        encoded_header, encoded_payload, encoded_signature = token.split(".")
        signing_input = f"{encoded_header}.{encoded_payload}"
        expected_signature = hmac.new(
            SECRET_KEY.encode("utf-8"),
            signing_input.encode("ascii"),
            hashlib.sha256,
        ).digest()
        provided_signature = _b64decode(encoded_signature)
        if not hmac.compare_digest(expected_signature, provided_signature):
            raise ValueError("Invalid token signature.")

        payload = json.loads(_b64decode(encoded_payload))
        if int(payload["exp"]) < int(time.time()):
            raise ValueError("Token has expired.")
        return payload
    except Exception as exc:
        raise ValueError("Invalid access token.") from exc


def public_user(user: dict) -> dict:
    clean = dict(user)
    clean.pop("password_hash", None)
    clean["role_label"] = role_label(clean["role"])
    return clean


def _auth_exception(message: str = "Authentication required.") -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail=message,
        headers={"WWW-Authenticate": "Bearer"},
    )


def _resolve_credentials(credentials: HTTPAuthorizationCredentials | None) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise _auth_exception()
    try:
        payload = decode_access_token(credentials.credentials)
    except ValueError as exc:
        raise _auth_exception(str(exc)) from exc

    with get_connection() as connection:
        user = connection.execute(
            "SELECT * FROM users WHERE id = ? AND status = 'active'",
            (payload["sub"],),
        ).fetchone()

    if user is None:
        raise _auth_exception("User is disabled or no longer exists.")
    return public_user(row_to_dict(user))


def get_current_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict:
    return _resolve_credentials(credentials)


def get_optional_user(credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme)) -> dict | None:
    if credentials is None:
        return None
    return _resolve_credentials(credentials)


def require_roles(*allowed_roles: str) -> Callable:
    allowed = set(allowed_roles)

    def dependency(current_user: dict = Depends(get_current_user)) -> dict:
        if current_user["role"] not in allowed:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Your role does not allow this operation.",
            )
        return current_user

    return dependency
