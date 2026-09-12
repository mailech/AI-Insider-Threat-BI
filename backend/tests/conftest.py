"""Shared pytest fixtures: an isolated SQLite database per test session."""
from __future__ import annotations

import os
import tempfile
from datetime import datetime, timedelta, timezone

import pytest

# Point the app at a throwaway database before any app module is imported.
_TMP_DB = os.path.join(tempfile.mkdtemp(prefix="itbis-tests-"), "test.db")
os.environ["DATABASE_URL"] = f"sqlite:///{_TMP_DB}"
os.environ["SECRET_KEY"] = "test-secret-key-not-for-production"
os.environ["MODEL_DIR"] = os.path.join(tempfile.mkdtemp(prefix="itbis-models-"), "models")
os.environ["ENVIRONMENT"] = "test"

from fastapi.testclient import TestClient  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models.employee import Department, Employee  # noqa: E402
from app.models.enums import ActivityType, LogSource, Role  # noqa: E402
from app.models.user import User  # noqa: E402
from app.ml import features as F  # noqa: E402
from app.models.activity import ActivityEvent  # noqa: E402

MB = 1024 * 1024


@pytest.fixture(scope="session", autouse=True)
def _database():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(scope="session")
def db():
    session = SessionLocal()
    yield session
    session.close()


@pytest.fixture(scope="session")
def users(db):
    """One account per role."""
    created = {}
    for role, email in (
        (Role.ADMINISTRATOR, "admin@test.io"),
        (Role.SECURITY_ANALYST, "analyst@test.io"),
        (Role.SOC_ENGINEER, "soc@test.io"),
        (Role.SECURITY_MANAGER, "manager@test.io"),
    ):
        user = User(
            email=email,
            full_name=f"{role.value} user",
            hashed_password=hash_password("Password@123"),
            role=role.value,
            is_verified=True,
        )
        db.add(user)
        created[role.value] = user
    db.commit()
    for user in created.values():
        db.refresh(user)
    return created


def _auth(client, email: str) -> dict:
    response = client.post("/api/v1/auth/login", json={"email": email, "password": "Password@123"})
    assert response.status_code == 200, response.text
    return {"Authorization": f"Bearer {response.json()['access_token']}"}


@pytest.fixture(scope="session")
def admin_headers(client, users):
    return _auth(client, "admin@test.io")


@pytest.fixture(scope="session")
def analyst_headers(client, users):
    return _auth(client, "analyst@test.io")


@pytest.fixture(scope="session")
def soc_headers(client, users):
    return _auth(client, "soc@test.io")


@pytest.fixture(scope="session")
def manager_headers(client, users):
    return _auth(client, "manager@test.io")


@pytest.fixture(scope="session")
def department(db):
    dept = Department(name="Test Engineering", code="TENG")
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@pytest.fixture(scope="session")
def employee(db, department):
    """An employee with 40 days of routine behaviour, then one exfiltration night."""
    person = Employee(
        employee_code="TEST0001",
        full_name="Test Subject",
        email="subject@test.io",
        department_id=department.id,
        designation="Engineer",
        access_level="standard",
    )
    db.add(person)
    db.flush()

    now = datetime.now(timezone.utc)
    events = []

    # Baseline: 40 days of a steady 09:00 working pattern.
    for day_offset in range(45, 5, -1):
        day = now - timedelta(days=day_offset)
        if day.weekday() >= 5:
            continue
        login = day.replace(hour=9, minute=15, second=0, microsecond=0)
        events.append(
            ActivityEvent(
                employee_id=person.id,
                activity_type=ActivityType.LOGIN.value,
                log_source=LogSource.ACTIVE_DIRECTORY.value,
                event_time=login,
                device_id="LAP-0001",
            )
        )
        for index in range(8):
            events.append(
                ActivityEvent(
                    employee_id=person.id,
                    activity_type=ActivityType.FILE_DOWNLOAD.value,
                    log_source=LogSource.PROXY.value,
                    event_time=login + timedelta(minutes=30 * index),
                    device_id="LAP-0001",
                    resource=f"/work/report_{index}.xlsx",
                    bytes_transferred=4 * MB,
                    file_count=1,
                )
            )

    # Attack: a night of bulk download plus copies to an unknown USB device.
    attack = (now - timedelta(days=2)).replace(hour=23, minute=30, second=0, microsecond=0)
    for index in range(40):
        events.append(
            ActivityEvent(
                employee_id=person.id,
                activity_type=ActivityType.FILE_DOWNLOAD.value,
                log_source=LogSource.PROXY.value,
                event_time=attack + timedelta(minutes=index),
                device_id="LAP-0001",
                resource="/finance/payroll_master.csv",
                bytes_transferred=45 * MB,
                sensitivity="restricted",
                file_count=5,
            )
        )
    for index in range(15):
        events.append(
            ActivityEvent(
                employee_id=person.id,
                activity_type=ActivityType.USB_FILE_COPY.value,
                log_source=LogSource.ENDPOINT_SECURITY.value,
                event_time=attack + timedelta(minutes=index * 2),
                device_id="USB-ROGUE-1",
                resource="/finance/payroll_master.csv",
                bytes_transferred=60 * MB,
                sensitivity="restricted",
                is_removable_media=True,
                file_count=8,
            )
        )

    for event in events:
        F.enrich_event_flags(event)
    db.add_all(events)
    db.commit()
    db.refresh(person)
    return person
