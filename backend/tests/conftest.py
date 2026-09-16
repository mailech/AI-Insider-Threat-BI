"""
Pytest configuration and shared fixtures for the InsiderIQ backend test suite.

Uses an in-memory SQLite database so tests are fully self-contained and
require no external services (Postgres, ML service, etc.).
"""

from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event
from sqlalchemy.orm import Session, sessionmaker

# Set TESTING environment variable before importing app modules
os.environ["TESTING"] = "1"

from app.core.security import create_access_token, hash_password
from app.db.base import Base
from app.db.session import get_db
from app.main import app
from app.models.activity import ActivityLog, ActivityType
from app.models.alert import Alert, AlertStatus
from app.models.anomaly import Anomaly, AnomalyCategory, AnomalyStatus, Severity
from app.models.employee import Device, Employee
from app.models.investigation import Investigation, InvestigationStatus
from app.models.risk import RiskBand, RiskScore
from app.models.user import Role, User, UserStatus

# ---------------------------------------------------------------------------
# In-memory SQLite engine / session
# ---------------------------------------------------------------------------

SQLITE_URL = "sqlite://"  # pure in-memory, not shared across processes


@pytest.fixture(scope="session")
def engine():
    """Create a single SQLite engine for the whole test session."""
    _engine = create_engine(
        SQLITE_URL,
        connect_args={"check_same_thread": False},
    )
    # Enable FK enforcement on SQLite
    @event.listens_for(_engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    Base.metadata.create_all(_engine)
    yield _engine
    Base.metadata.drop_all(_engine)
    _engine.dispose()


@pytest.fixture(scope="session")
def session_factory(engine):
    """Return a session factory bound to the test engine."""
    return sessionmaker(bind=engine, autoflush=False, autocommit=False)


@pytest.fixture()
def db(engine, session_factory) -> Generator[Session, None, None]:
    """
    Per-test transactional fixture.

    Each test runs inside a SAVEPOINT so that the outer transaction can
    be rolled back after the test, leaving the database clean for the
    next test.
    """
    connection = engine.connect()
    trans = connection.begin()
    session = session_factory(bind=connection)

    # Nested (SAVEPOINT-based) transaction so rollback doesn't destroy schema
    nested = connection.begin_nested()

    @event.listens_for(session, "after_transaction_end")
    def restart_savepoint(sess, transaction):
        nonlocal nested
        if not nested.is_active:
            nested = connection.begin_nested()

    yield session

    session.close()
    trans.rollback()
    connection.close()


@pytest.fixture()
def client(db) -> Generator[TestClient, None, None]:
    """
    FastAPI TestClient with the database dependency overridden to use the
    per-test transactional session.
    """

    def override_get_db():
        try:
            yield db
        finally:
            pass  # session lifecycle managed by `db` fixture

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app, raise_server_exceptions=True) as c:
        yield c
    app.dependency_overrides.clear()


# ---------------------------------------------------------------------------
# User / auth fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def admin_user(db: Session) -> User:
    """Create and persist an admin user."""
    user = User(
        email="admin@test.insideriq.dev",
        full_name="Test Administrator",
        password_hash=hash_password("AdminPass#1"),
        role=Role.ADMINISTRATOR,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def analyst_user(db: Session) -> User:
    """Create and persist an analyst user."""
    user = User(
        email="analyst@test.insideriq.dev",
        full_name="Test Analyst",
        password_hash=hash_password("AnalystPass#1"),
        role=Role.SECURITY_ANALYST,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@pytest.fixture()
def admin_token(admin_user: User) -> str:
    return create_access_token(subject=str(admin_user.id), role=admin_user.role)


@pytest.fixture()
def analyst_token(analyst_user: User) -> str:
    return create_access_token(subject=str(analyst_user.id), role=analyst_user.role)


@pytest.fixture()
def auth_headers(admin_token: str) -> dict[str, str]:
    """Authorization headers for the admin user (used as the default test actor)."""
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture()
def analyst_headers(analyst_token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {analyst_token}"}


# ---------------------------------------------------------------------------
# Domain data fixtures
# ---------------------------------------------------------------------------

@pytest.fixture()
def sample_employee(db: Session) -> Employee:
    """A minimal employee with one device."""
    emp = Employee(
        employee_code="TEST-001",
        first_name="Alice",
        last_name="Smith",
        email="alice.smith@corp.example",
        department="Engineering",
        designation="Software Engineer",
        access_level="Standard",
        access_privileges="git,jira,confluence",
    )
    db.add(emp)
    db.flush()

    device = Device(
        employee_id=emp.id,
        name="Alice-Laptop",
        device_type="Laptop",
        operating_system="Linux",
        serial_number="SN-ALICE-001",
    )
    db.add(device)
    db.commit()
    db.refresh(emp)
    return emp


@pytest.fixture()
def second_employee(db: Session) -> Employee:
    """A second employee used for multi-employee tests."""
    emp = Employee(
        employee_code="TEST-002",
        first_name="Bob",
        last_name="Jones",
        email="bob.jones@corp.example",
        department="Finance",
        designation="Financial Analyst",
        access_level="Standard",
        access_privileges="sap,excel",
    )
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@pytest.fixture()
def sample_activity(db: Session, sample_employee: Employee) -> ActivityLog:
    """A single activity log entry linked to sample_employee."""
    log = ActivityLog(
        employee_id=sample_employee.id,
        timestamp=datetime(2026, 1, 10, 9, 0, 0, tzinfo=timezone.utc),
        activity_type=ActivityType.LOGIN,
        source="Workstation",
        device="Alice-Laptop",
        ip_address="192.168.1.101",
        application="OS Login",
        data_volume_mb=0.0,
        details="Normal morning login",
    )
    db.add(log)
    db.commit()
    db.refresh(log)
    return log


@pytest.fixture()
def sample_anomaly(db: Session, sample_employee: Employee) -> Anomaly:
    """An open anomaly for sample_employee."""
    anomaly = Anomaly(
        employee_id=sample_employee.id,
        detected_at=datetime(2026, 1, 10, 23, 30, 0, tzinfo=timezone.utc),
        category=AnomalyCategory.UNUSUAL_LOGIN_TIME,
        severity=Severity.HIGH,
        status=AnomalyStatus.NEW,
        description="Login at 23:30 — outside baseline window 08:00-18:00",
        baseline_deviation=155.0,
        observed_value=23.5,
        baseline_value=9.2,
    )
    db.add(anomaly)
    db.commit()
    db.refresh(anomaly)
    return anomaly


@pytest.fixture()
def sample_alert(db: Session, sample_employee: Employee, sample_anomaly: Anomaly) -> Alert:
    """A high-severity alert linked to sample_anomaly."""
    alert = Alert(
        employee_id=sample_employee.id,
        anomaly_id=sample_anomaly.id,
        raised_at=datetime(2026, 1, 10, 23, 31, 0, tzinfo=timezone.utc),
        title="After-hours login detected",
        description="Employee logged in at an unusual time.",
        severity=Severity.HIGH,
        status=AlertStatus.OPEN,
    )
    db.add(alert)
    db.commit()
    db.refresh(alert)
    return alert


@pytest.fixture()
def sample_risk_score(db: Session, sample_employee: Employee) -> RiskScore:
    """A risk score record for sample_employee."""
    score = RiskScore(
        employee_id=sample_employee.id,
        computed_at=datetime(2026, 1, 10, 12, 0, 0, tzinfo=timezone.utc),
        lookback_days=30,
        logon_count=22.0,
        after_hours_logon_count=5.0,
        usb_connect_count=2.0,
        file_copy_count=10.0,
        email_count=50.0,
        decision_function_score=-0.15,
        predict_label=1,
        risk_score=72.0,
        risk_band=RiskBand.HIGH,
    )
    db.add(score)
    db.commit()
    db.refresh(score)
    return score


@pytest.fixture()
def sample_investigation(
    db: Session,
    sample_employee: Employee,
    admin_user: User,
) -> Investigation:
    """An open investigation for sample_employee."""
    inv = Investigation(
        reference="INV-TEST-001",
        title="Test Investigation",
        description="Suspicious after-hours activity detected.",
        status=InvestigationStatus.OPEN,
        severity=Severity.HIGH,
        employee_id=sample_employee.id,
        created_by_id=admin_user.id,
    )
    db.add(inv)
    db.commit()
    db.refresh(inv)
    return inv
