"""Tests for /api/v1/auth endpoints."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.core.security import create_access_token
from app.models.user import Role, User, UserStatus


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------

class TestRegister:
    URL = "/api/v1/auth/register"

    def test_register_success(self, client: TestClient):
        payload = {
            "email": "newuser@test.example",
            "full_name": "New User",
            "password": "SecurePass#99",
            "role": "Security Analyst",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 201
        data = resp.json()
        assert data["email"] == payload["email"]
        assert data["full_name"] == payload["full_name"]
        assert data["role"] == "Security Analyst"
        assert data["status"] == "Active"
        assert "id" in data
        # password must NOT be returned
        assert "password" not in data
        assert "password_hash" not in data

    def test_register_duplicate_email(self, client: TestClient):
        payload = {
            "email": "dupe@test.example",
            "full_name": "Dupe User",
            "password": "SecurePass#99",
        }
        resp1 = client.post(self.URL, json=payload)
        assert resp1.status_code == 201
        resp2 = client.post(self.URL, json=payload)
        assert resp2.status_code == 409

    def test_register_missing_fields(self, client: TestClient):
        resp = client.post(self.URL, json={"email": "incomplete@x.com"})
        assert resp.status_code == 422

    def test_register_invalid_email(self, client: TestClient):
        resp = client.post(
            self.URL,
            json={"email": "not-an-email", "full_name": "Someone", "password": "Pass#1234"},
        )
        assert resp.status_code == 422

    def test_register_short_password(self, client: TestClient):
        resp = client.post(
            self.URL,
            json={"email": "x@y.com", "full_name": "Short", "password": "abc"},
        )
        assert resp.status_code == 422

    def test_register_default_role_is_analyst(self, client: TestClient):
        payload = {
            "email": "defaultrole@test.example",
            "full_name": "Default Role User",
            "password": "SecurePass#99",
        }
        resp = client.post(self.URL, json=payload)
        assert resp.status_code == 201
        assert resp.json()["role"] == "Security Analyst"


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------

class TestLogin:
    URL = "/api/v1/auth/login"
    REGISTER_URL = "/api/v1/auth/register"

    def _create_user(self, client: TestClient, email: str = "login_test@example.com") -> dict:
        resp = client.post(
            self.REGISTER_URL,
            json={"email": email, "full_name": "Login Tester", "password": "LoginPass#1"},
        )
        assert resp.status_code == 201
        return {"email": email, "password": "LoginPass#1"}

    def test_login_success(self, client: TestClient):
        creds = self._create_user(client)
        resp = client.post(self.URL, json=creds)
        assert resp.status_code == 200
        data = resp.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert "expires_in" in data
        assert "user" in data
        assert data["user"]["email"] == creds["email"]

    def test_login_wrong_password(self, client: TestClient):
        creds = self._create_user(client, "wrongpwd@example.com")
        resp = client.post(self.URL, json={"email": creds["email"], "password": "WrongPass#1"})
        assert resp.status_code == 401

    def test_login_unknown_email(self, client: TestClient):
        resp = client.post(self.URL, json={"email": "nobody@example.com", "password": "Pass#1234"})
        assert resp.status_code == 401

    def test_login_disabled_account(self, client: TestClient, db: Session):
        creds = self._create_user(client, "disabled@example.com")
        # Disable the user directly in DB
        from sqlalchemy import select
        from app.models.user import User
        user = db.scalars(select(User).where(User.email == creds["email"])).first()
        user.status = UserStatus.DISABLED
        db.commit()

        resp = client.post(self.URL, json=creds)
        assert resp.status_code == 403

    def test_login_updates_last_login_at(self, client: TestClient, db: Session):
        creds = self._create_user(client, "lastlogin@example.com")
        resp = client.post(self.URL, json=creds)
        assert resp.status_code == 200
        from sqlalchemy import select
        user = db.scalars(select(User).where(User.email == creds["email"])).first()
        assert user.last_login_at is not None


# ---------------------------------------------------------------------------
# GET /api/v1/auth/me
# ---------------------------------------------------------------------------

class TestGetMe:
    URL = "/api/v1/auth/me"

    def test_get_me_authenticated(self, client: TestClient, auth_headers: dict):
        resp = client.get(self.URL, headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "id" in data
        assert "email" in data
        assert "role" in data

    def test_get_me_unauthenticated(self, client: TestClient):
        resp = client.get(self.URL)
        assert resp.status_code == 401

    def test_get_me_invalid_token(self, client: TestClient):
        resp = client.get(self.URL, headers={"Authorization": "Bearer invalid.token.here"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Token validation
# ---------------------------------------------------------------------------

class TestTokenValidation:
    def test_expired_token_rejected(self, client: TestClient, admin_user):
        # Create a token that expired 1 second after issuance
        expired_token = create_access_token(
            subject=str(admin_user.id),
            role=admin_user.role,
            expires_minutes=-1,  # already expired
        )
        resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {expired_token}"})
        assert resp.status_code == 401

    def test_malformed_token_rejected(self, client: TestClient):
        resp = client.get("/api/v1/auth/me", headers={"Authorization": "Bearer not.a.real.jwt"})
        assert resp.status_code == 401

    def test_missing_bearer_prefix(self, client: TestClient):
        resp = client.get("/api/v1/auth/me", headers={"Authorization": "just-a-random-string"})
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# Protected endpoint — general behaviour
# ---------------------------------------------------------------------------

class TestProtectedEndpoints:
    """Any protected endpoint should return 401 when the token is absent."""

    PROTECTED = [
        ("GET", "/api/v1/employees"),
        ("GET", "/api/v1/activity"),
        ("GET", "/api/v1/anomalies"),
        ("GET", "/api/v1/alerts"),
        ("GET", "/api/v1/notifications"),
        ("GET", "/api/v1/investigations"),
    ]

    @pytest.mark.parametrize("method,url", PROTECTED)
    def test_unauthenticated_returns_401(self, client: TestClient, method: str, url: str):
        resp = client.request(method, url)
        assert resp.status_code == 401
