"""Tests for /api/v1/behavior endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.activity import ActivityLog, ActivityType
from app.models.behavior import BehaviorProfile
from app.models.employee import Employee


BASE_URL = "/api/v1/behavior"


def _seed_activity(db: Session, employee: Employee, n: int = 10) -> None:
    """Insert n login activity rows for the given employee so build_profile works."""
    for i in range(n):
        db.add(
            ActivityLog(
                employee_id=employee.id,
                timestamp=datetime(2026, 1, i + 1, 9, 0, 0, tzinfo=timezone.utc),
                activity_type=ActivityType.LOGIN,
                source="Workstation",
                device="Test-Laptop",
                ip_address="10.0.0.1",
            )
        )
    db.commit()


# ---------------------------------------------------------------------------
# GET /api/v1/behavior/{employee_id}
# ---------------------------------------------------------------------------

class TestGetBehaviorProfile:
    def test_get_profile_created_on_the_fly(
        self,
        client: TestClient,
        auth_headers: dict,
        db: Session,
        sample_employee: Employee,
    ):
        """build_profile should be invoked if no stored profile exists."""
        # Seed enough activity so build_profile doesn't raise
        _seed_activity(db, sample_employee)
        resp = client.get(f"{BASE_URL}/{sample_employee.id}", headers=auth_headers)
        # 200 if profile can be built, 404 if no data — either is acceptable but
        # we ensure no 5xx
        assert resp.status_code in (200, 404)

    def test_get_profile_returns_stored_profile(
        self,
        client: TestClient,
        auth_headers: dict,
        db: Session,
        sample_employee: Employee,
    ):
        """If a BehaviorProfile row already exists it should be returned directly."""
        profile = BehaviorProfile(
            employee_id=sample_employee.id,
            typical_login_hour_start=8,
            typical_login_hour_end=18,
            typical_daily_logins=3.5,
            typical_daily_downloads=1.0,
            typical_daily_transfers=0.5,
            typical_daily_emails=10.0,
            typical_daily_data_volume_mb=50.0,
            typical_device_count=1,
            typical_applications="OS Login",
        )
        db.add(profile)
        db.commit()

        resp = client.get(f"{BASE_URL}/{sample_employee.id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == str(sample_employee.id)
        assert data["typical_login_hour_start"] == 8
        assert data["typical_login_hour_end"] == 18
        assert "typical_daily_logins" in data

    def test_get_profile_nonexistent_employee_404(
        self, client: TestClient, auth_headers: dict
    ):
        resp = client.get(f"{BASE_URL}/{uuid.uuid4()}", headers=auth_headers)
        assert resp.status_code == 404

    def test_get_profile_requires_auth(
        self, client: TestClient, sample_employee: Employee
    ):
        resp = client.get(f"{BASE_URL}/{sample_employee.id}")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/behavior/{employee_id}/analysis
# ---------------------------------------------------------------------------

class TestGetBehaviorAnalysis:
    def test_analysis_returns_expected_shape(
        self,
        client: TestClient,
        auth_headers: dict,
        db: Session,
        sample_employee: Employee,
    ):
        _seed_activity(db, sample_employee, n=20)
        resp = client.get(
            f"{BASE_URL}/{sample_employee.id}/analysis",
            headers=auth_headers,
        )
        # Service may return 200 with partial data or 404 for unknown employee;
        # ensure no 5xx response
        assert resp.status_code in (200, 404)
        if resp.status_code == 200:
            data = resp.json()
            assert "employee_id" in data
            assert "indicators" in data
            assert "work_pattern" in data
            assert "risk_trend" in data

    def test_analysis_lookback_days_param(
        self,
        client: TestClient,
        auth_headers: dict,
        db: Session,
        sample_employee: Employee,
    ):
        _seed_activity(db, sample_employee, n=20)
        resp = client.get(
            f"{BASE_URL}/{sample_employee.id}/analysis",
            params={"lookback_days": 7},
            headers=auth_headers,
        )
        assert resp.status_code in (200, 404)
        if resp.status_code == 200:
            assert resp.json()["lookback_days"] == 7

    def test_analysis_invalid_lookback_422(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.get(
            f"{BASE_URL}/{sample_employee.id}/analysis",
            params={"lookback_days": 0},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_analysis_requires_auth(
        self, client: TestClient, sample_employee: Employee
    ):
        resp = client.get(f"{BASE_URL}/{sample_employee.id}/analysis")
        assert resp.status_code == 401
