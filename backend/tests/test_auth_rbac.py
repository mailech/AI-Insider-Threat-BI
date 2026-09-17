"""Module 1 — Auth, JWT, and RBAC integration tests.

Covers:
  * user registration, login, and JWT claims
  * the four platform roles
  * HTTP 403 on restricted endpoints for unauthorized roles
"""

from __future__ import annotations

from datetime import timedelta
from typing import Any, Iterator

import pytest
from fastapi import Depends, FastAPI
from fastapi.testclient import TestClient
from jose import JWTError
from pydantic import ValidationError
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

from app.api.deps import get_db, require_roles
from app.api.v1 import agents as agents_router
from app.api.v1 import auth as auth_router
from app.api.v1 import employees as employees_router
from app.core.security import (
    create_access_token,
    decode_access_token,
    get_password_hash,
    verify_password,
)
from app.db.session import Base
from app.models.domain import RoleEnum, User
from app.schemas.schemas import UserCreate

ALL_ROLES: tuple[RoleEnum, ...] = (
    RoleEnum.SECURITY_ANALYST,
    RoleEnum.SOC_ENGINEER,
    RoleEnum.SECURITY_MANAGER,
    RoleEnum.ADMINISTRATOR,
)

ROLE_CREDENTIALS: dict[RoleEnum, tuple[str, str]] = {
    RoleEnum.SECURITY_ANALYST: ("analyst.rbac@corp.internal", "Analyst123!"),
    RoleEnum.SOC_ENGINEER: ("soc.rbac@corp.internal", "SocEng123!"),
    RoleEnum.SECURITY_MANAGER: ("manager.rbac@corp.internal", "Manager123!"),
    RoleEnum.ADMINISTRATOR: ("admin.rbac@corp.internal", "Admin1234!"),
}

EMPLOYEE_PAYLOAD: dict[str, str] = {
    "emp_id": "emp_9001",
    "first_name": "Grace",
    "last_name": "Hopper",
    "department": "Engineering",
    "designation": "Engineer",
}


def _build_app(session_factory: sessionmaker[Session]) -> FastAPI:
    def override_get_db() -> Iterator[Session]:
        db = session_factory()
        try:
            yield db
        finally:
            db.close()

    app = FastAPI(title="ITBIS Auth RBAC tests")
    app.include_router(auth_router.router, prefix="/api/v1")
    app.include_router(employees_router.router, prefix="/api/v1")
    app.include_router(agents_router.router, prefix="/api/v1")

    @app.get("/api/v1/settings/admin")
    def admin_settings(
        _: User = Depends(require_roles([RoleEnum.ADMINISTRATOR])),
    ) -> dict[str, bool]:
        """Mirrors administrator-only settings gates used by the dashboard."""
        return {"ok": True}

    @app.get("/api/v1/system/status")
    def system_status(
        _: User = Depends(
            require_roles([RoleEnum.ADMINISTRATOR, RoleEnum.SECURITY_MANAGER])
        ),
    ) -> dict[str, dict[str, str]]:
        """Mirrors GET /system/status role policy without importing ML deps."""
        return {"services": {"api": "online"}, "counters": {"platform_users": "4"}}

    app.dependency_overrides[get_db] = override_get_db
    return app


@pytest.fixture()
def session_factory() -> Iterator[sessionmaker[Session]]:
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    factory = sessionmaker(bind=engine, autocommit=False, autoflush=False)
    Base.metadata.create_all(bind=engine)
    try:
        yield factory
    finally:
        engine.dispose()


@pytest.fixture()
def client(session_factory: sessionmaker[Session]) -> Iterator[TestClient]:
    app = _build_app(session_factory)
    with TestClient(app) as test_client:
        yield test_client


def _register(
    client: TestClient,
    email: str,
    password: str,
    role: RoleEnum | None = None,
) -> Any:
    payload: dict[str, str] = {"email": email, "password": password}
    if role is not None:
        payload["role"] = role.value
    return client.post("/api/v1/auth/register", json=payload)


def _login(client: TestClient, email: str, password: str) -> Any:
    return client.post(
        "/api/v1/auth/login",
        data={"username": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )


def _auth_header(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


def _seed_all_roles(client: TestClient) -> dict[RoleEnum, str]:
    tokens: dict[RoleEnum, str] = {}
    for role, (email, password) in ROLE_CREDENTIALS.items():
        created = _register(client, email, password, role)
        assert created.status_code == 201, created.text
        logged_in = _login(client, email, password)
        assert logged_in.status_code == 200, logged_in.text
        tokens[role] = logged_in.json()["access_token"]
    return tokens


# ── Unit: password hashing & JWT helpers ──────────────────────────────────────


def test_password_hash_is_not_plaintext_and_verifies() -> None:
    plain = "S3cur3P@ss!"
    hashed = get_password_hash(plain)
    assert hashed != plain
    assert verify_password(plain, hashed)
    assert not verify_password("WrongPass1", hashed)


def test_create_access_token_embeds_subject_role_and_expiry() -> None:
    token = create_access_token(
        subject="admin@corp.internal",
        extra_claims={"role": RoleEnum.ADMINISTRATOR.value, "user_id": 42},
        expires_delta=timedelta(hours=8),
    )
    payload = decode_access_token(token)
    assert payload["sub"] == "admin@corp.internal"
    assert payload["role"] == "ADMINISTRATOR"
    assert payload["user_id"] == 42
    assert "exp" in payload
    assert "iat" in payload


def test_decode_access_token_rejects_tampered_signature() -> None:
    token = create_access_token(subject="analyst@corp.internal")
    with pytest.raises(JWTError):
        decode_access_token(token + "tampered")


def test_user_create_enforces_password_strength() -> None:
    with pytest.raises(ValidationError):
        UserCreate(email="weak@corp.internal", password="short")
    with pytest.raises(ValidationError):
        UserCreate(email="weak@corp.internal", password="nouppercase1")
    with pytest.raises(ValidationError):
        UserCreate(email="weak@corp.internal", password="NoDigitsHere")
    parsed = UserCreate(email="ok@corp.internal", password="ValidPass1")
    assert parsed.role == RoleEnum.SECURITY_ANALYST


# ── Integration: register / login / JWT ───────────────────────────────────────


def test_register_returns_201_without_password_hash(client: TestClient) -> None:
    response = _register(
        client,
        "new.analyst@corp.internal",
        "Analyst123!",
        RoleEnum.SECURITY_ANALYST,
    )
    assert response.status_code == 201
    body = response.json()
    assert body["email"] == "new.analyst@corp.internal"
    assert body["role"] == "SECURITY_ANALYST"
    assert body["is_active"] is True
    assert "hashed_password" not in body
    assert "password" not in body
    assert "id" in body


def test_register_defaults_role_to_security_analyst(client: TestClient) -> None:
    response = _register(client, "default.role@corp.internal", "Default123!")
    assert response.status_code == 201
    assert response.json()["role"] == "SECURITY_ANALYST"


def test_register_duplicate_email_returns_409(client: TestClient) -> None:
    first = _register(client, "dup@corp.internal", "DupPass12!")
    assert first.status_code == 201
    second = _register(client, "dup@corp.internal", "DupPass12!")
    assert second.status_code == 409


def test_login_issues_bearer_jwt_with_role_claim(client: TestClient) -> None:
    email = "jwt.user@corp.internal"
    password = "JwtUser123!"
    created = _register(client, email, password, RoleEnum.SOC_ENGINEER)
    assert created.status_code == 201
    user_id = created.json()["id"]

    response = _login(client, email, password)
    assert response.status_code == 200
    body = response.json()
    assert body["token_type"] == "bearer"
    token = body["access_token"]
    assert token.count(".") == 2

    claims = decode_access_token(token)
    assert claims["sub"] == email
    assert claims["role"] == "SOC_ENGINEER"
    assert claims["user_id"] == user_id


def test_login_rejects_bad_password_with_401(client: TestClient) -> None:
    _register(client, "bad.login@corp.internal", "GoodPass1!")
    response = _login(client, "bad.login@corp.internal", "WrongPass1!")
    assert response.status_code == 401


def test_me_requires_valid_jwt_and_returns_profile(client: TestClient) -> None:
    email = "me.user@corp.internal"
    password = "MeUser123!"
    _register(client, email, password, RoleEnum.SECURITY_MANAGER)
    token = _login(client, email, password).json()["access_token"]

    unauthenticated = client.get("/api/v1/auth/me")
    assert unauthenticated.status_code == 401

    authenticated = client.get("/api/v1/auth/me", headers=_auth_header(token))
    assert authenticated.status_code == 200
    profile = authenticated.json()
    assert profile["email"] == email
    assert profile["role"] == "SECURITY_MANAGER"


def test_inactive_account_cannot_login(
    client: TestClient,
    session_factory: sessionmaker[Session],
) -> None:
    email = "inactive@corp.internal"
    password = "Inactive1!"
    _register(client, email, password, RoleEnum.SECURITY_ANALYST)

    db = session_factory()
    try:
        user = db.query(User).filter(User.email == email).one()
        user.is_active = False
        db.commit()
    finally:
        db.close()

    response = _login(client, email, password)
    assert response.status_code == 403


# ── Integration: four-role RBAC + 403 on restricted endpoints ─────────────────


def test_all_four_roles_can_authenticate_and_read_me(client: TestClient) -> None:
    tokens = _seed_all_roles(client)
    assert set(tokens) == set(ALL_ROLES)

    for role, token in tokens.items():
        response = client.get("/api/v1/auth/me", headers=_auth_header(token))
        assert response.status_code == 200
        assert response.json()["role"] == role.value


def test_all_authenticated_roles_can_list_employees(client: TestClient) -> None:
    tokens = _seed_all_roles(client)
    for role, token in tokens.items():
        response = client.get("/api/v1/employees/", headers=_auth_header(token))
        assert response.status_code == 200, f"{role.value} should list employees"
        assert isinstance(response.json(), list)


def test_create_employee_forbidden_for_analyst_and_soc_engineer(
    client: TestClient,
) -> None:
    tokens = _seed_all_roles(client)

    for role in (RoleEnum.SECURITY_ANALYST, RoleEnum.SOC_ENGINEER):
        response = client.post(
            "/api/v1/employees/",
            json=EMPLOYEE_PAYLOAD,
            headers=_auth_header(tokens[role]),
        )
        assert response.status_code == 403, f"{role.value} must be rejected"
        detail = str(response.json().get("detail", "")).lower()
        assert "access denied" in detail or "required role" in detail

    for role in (RoleEnum.SECURITY_MANAGER, RoleEnum.ADMINISTRATOR):
        payload = dict(EMPLOYEE_PAYLOAD)
        payload["emp_id"] = f"emp_{9000 + list(ALL_ROLES).index(role)}"
        response = client.post(
            "/api/v1/employees/",
            json=payload,
            headers=_auth_header(tokens[role]),
        )
        assert response.status_code == 201, f"{role.value} should create employees"


def test_admin_settings_forbidden_for_non_administrators(client: TestClient) -> None:
    tokens = _seed_all_roles(client)

    for role in (
        RoleEnum.SECURITY_ANALYST,
        RoleEnum.SOC_ENGINEER,
        RoleEnum.SECURITY_MANAGER,
    ):
        response = client.get(
            "/api/v1/settings/admin",
            headers=_auth_header(tokens[role]),
        )
        assert response.status_code == 403, f"{role.value} must not access admin settings"

    allowed = client.get(
        "/api/v1/settings/admin",
        headers=_auth_header(tokens[RoleEnum.ADMINISTRATOR]),
    )
    assert allowed.status_code == 200


def test_system_status_forbidden_for_non_admin_non_manager(client: TestClient) -> None:
    tokens = _seed_all_roles(client)

    for role in (RoleEnum.SECURITY_ANALYST, RoleEnum.SOC_ENGINEER):
        response = client.get(
            "/api/v1/system/status",
            headers=_auth_header(tokens[role]),
        )
        assert response.status_code == 403, f"{role.value} must not read system status"

    for role in (RoleEnum.SECURITY_MANAGER, RoleEnum.ADMINISTRATOR):
        response = client.get(
            "/api/v1/system/status",
            headers=_auth_header(tokens[role]),
        )
        assert response.status_code == 200, f"{role.value} should read system status"
        body = response.json()
        assert "services" in body
        assert "counters" in body


def test_agent_enrollment_admin_only(client: TestClient) -> None:
    tokens = _seed_all_roles(client)
    enroll_body = {"device_id": "WS-RBAC-001", "device_name": "RBAC Workstation"}

    for role in (
        RoleEnum.SECURITY_ANALYST,
        RoleEnum.SOC_ENGINEER,
        RoleEnum.SECURITY_MANAGER,
    ):
        response = client.post(
            "/api/v1/agents/enroll",
            json=enroll_body,
            headers=_auth_header(tokens[role]),
        )
        assert response.status_code == 403, f"{role.value} must not enroll agents"

    admin_response = client.post(
        "/api/v1/agents/enroll",
        json=enroll_body,
        headers=_auth_header(tokens[RoleEnum.ADMINISTRATOR]),
    )
    assert admin_response.status_code == 201
    assert admin_response.json()["api_key"].startswith("itbis_ag_")


def test_expired_token_is_rejected(client: TestClient) -> None:
    email = "expired@corp.internal"
    password = "Expired12!"
    _register(client, email, password, RoleEnum.ADMINISTRATOR)
    expired = create_access_token(
        subject=email,
        extra_claims={"role": "ADMINISTRATOR", "user_id": 1},
        expires_delta=timedelta(seconds=-1),
    )
    response = client.get("/api/v1/auth/me", headers=_auth_header(expired))
    assert response.status_code == 401
