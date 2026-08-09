"""Test harness.

The database URL is set before any application module is imported, because the
engine is created at import time from settings.
"""

import os
import tempfile
from pathlib import Path

import pytest

DB_FILE = Path(tempfile.gettempdir()) / "insider_threat_test.db"
if DB_FILE.exists():
    DB_FILE.unlink()

os.environ["DATABASE_URL"] = f"sqlite:///{DB_FILE.as_posix()}"
os.environ["SEED_ON_STARTUP"] = "false"
os.environ["SECRET_KEY"] = "test-secret-key"

from fastapi.testclient import TestClient  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db.session import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Department, Employee, User, UserRole  # noqa: E402

PASSWORD = "TestPass123!"


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def make_user():
    def _make_user(role: UserRole, email: str | None = None) -> User:
        with SessionLocal() as session:
            user = User(
                email=email or f"{role.value.lower()}@test.io",
                full_name=f"{role.value} User",
                hashed_password=hash_password(PASSWORD),
                role=role,
            )
            session.add(user)
            session.commit()
            session.refresh(user)
            session.expunge(user)
            return user

    return _make_user


@pytest.fixture
def auth_headers(client, make_user):
    def _auth_headers(role: UserRole) -> dict[str, str]:
        user = make_user(role)
        response = client.post(
            "/api/v1/auth/login/json", json={"email": user.email, "password": PASSWORD}
        )
        assert response.status_code == 200, response.text
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    return _auth_headers


@pytest.fixture
def seed_org():
    """A department and two employees, one managing the other."""

    def _seed_org() -> dict[str, int]:
        with SessionLocal() as session:
            department = Department(name="Engineering", code="ENG")
            session.add(department)
            session.flush()

            manager = Employee(
                employee_code="EMP001",
                full_name="Manager One",
                email="manager.one@test.io",
                designation="Engineering Manager",
                department_id=department.id,
            )
            session.add(manager)
            session.flush()

            report = Employee(
                employee_code="EMP002",
                full_name="Report Two",
                email="report.two@test.io",
                designation="Software Engineer",
                department_id=department.id,
                manager_id=manager.id,
            )
            session.add(report)
            session.commit()
            return {
                "department_id": department.id,
                "manager_id": manager.id,
                "report_id": report.id,
            }

    return _seed_org
