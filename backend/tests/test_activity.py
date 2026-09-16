"""Tests for /api/v1/activity endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app.models.activity import ActivityLog
from app.models.employee import Employee


BASE_URL = "/api/v1/activity"


def _activity_payload(employee_id: uuid.UUID, **overrides) -> dict:
    defaults = {
        "employee_id": str(employee_id),
        "timestamp": "2026-01-15T09:00:00+00:00",
        "activity_type": "Login",
        "source": "Workstation",
        "device": "Test-Laptop",
        "ip_address": "10.0.0.1",
        "application": "OS Login",
        "data_volume_mb": 0.0,
        "details": "Morning login",
    }
    defaults.update(overrides)
    return defaults


# ---------------------------------------------------------------------------
# POST /api/v1/activity
# ---------------------------------------------------------------------------

class TestCreateActivity:
    def test_create_success(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        payload = _activity_payload(sample_employee.id)
        resp = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["employee_id"] == str(sample_employee.id)
        assert data["activity_type"] == "Login"
        assert "id" in data

    def test_create_file_download(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        payload = _activity_payload(
            sample_employee.id,
            activity_type="File Download",
            data_volume_mb=250.5,
            details="Large dataset pulled",
        )
        resp = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json()["data_volume_mb"] == 250.5

    def test_create_missing_required_fields_422(self, client: TestClient, auth_headers: dict):
        resp = client.post(BASE_URL, json={"employee_id": str(uuid.uuid4())}, headers=auth_headers)
        assert resp.status_code == 422

    def test_create_invalid_activity_type_422(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        payload = _activity_payload(sample_employee.id, activity_type="HackerAction")
        resp = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert resp.status_code == 422

    def test_create_requires_auth(self, client: TestClient, sample_employee: Employee):
        resp = client.post(BASE_URL, json=_activity_payload(sample_employee.id))
        assert resp.status_code == 401

    @pytest.mark.parametrize("activity_type", [
        "Login",
        "File Download",
        "File Upload",
        "Data Transfer",
        "Email",
        "Privilege Change",
        "Remote Access",
        "Device Usage",
    ])
    def test_all_activity_types_accepted(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_employee: Employee,
        activity_type: str,
    ):
        payload = _activity_payload(sample_employee.id, activity_type=activity_type)
        resp = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert resp.status_code == 201


# ---------------------------------------------------------------------------
# GET /api/v1/activity
# ---------------------------------------------------------------------------

class TestListActivity:
    def test_list_returns_list(self, client: TestClient, auth_headers: dict):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_includes_sample_activity(
        self, client: TestClient, auth_headers: dict, sample_activity: ActivityLog
    ):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        ids = [a["id"] for a in resp.json()]
        assert str(sample_activity.id) in ids

    def test_filter_by_employee_id(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_activity: ActivityLog,
        sample_employee: Employee,
    ):
        resp = client.get(
            BASE_URL,
            params={"employee_id": str(sample_employee.id)},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        for log in resp.json():
            assert log["employee_id"] == str(sample_employee.id)

    def test_filter_by_activity_type(
        self, client: TestClient, auth_headers: dict, sample_activity: ActivityLog
    ):
        resp = client.get(
            BASE_URL,
            params={"activity_type": "Login"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        for log in resp.json():
            assert log["activity_type"] == "Login"

    def test_filter_by_since(
        self, client: TestClient, auth_headers: dict, sample_activity: ActivityLog
    ):
        # Records after 2026-01-01
        resp = client.get(
            BASE_URL,
            params={"since": "2026-01-01T00:00:00+00:00"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        for log in resp.json():
            ts = datetime.fromisoformat(log["timestamp"])
            assert ts >= datetime(2026, 1, 1, tzinfo=timezone.utc)

    def test_filter_by_until(
        self, client: TestClient, auth_headers: dict, sample_activity: ActivityLog
    ):
        resp = client.get(
            BASE_URL,
            params={"until": "2026-12-31T23:59:59+00:00"},
            headers=auth_headers,
        )
        assert resp.status_code == 200

    def test_filter_since_and_until_range(
        self, client: TestClient, auth_headers: dict, sample_activity: ActivityLog
    ):
        resp = client.get(
            BASE_URL,
            params={
                "since": "2026-01-09T00:00:00+00:00",
                "until": "2026-01-11T00:00:00+00:00",
            },
            headers=auth_headers,
        )
        assert resp.status_code == 200
        for log in resp.json():
            ts = datetime.fromisoformat(log["timestamp"])
            assert ts >= datetime(2026, 1, 9, tzinfo=timezone.utc)

    def test_pagination_skip_limit(
        self, client: TestClient, auth_headers: dict, sample_activity: ActivityLog
    ):
        resp = client.get(BASE_URL, params={"skip": 0, "limit": 5}, headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) <= 5

    def test_limit_exceeded_422(self, client: TestClient, auth_headers: dict):
        resp = client.get(BASE_URL, params={"limit": 9999}, headers=auth_headers)
        assert resp.status_code == 422

    def test_list_requires_auth(self, client: TestClient):
        resp = client.get(BASE_URL)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/activity/{log_id}
# ---------------------------------------------------------------------------

class TestGetActivity:
    def test_get_existing(
        self, client: TestClient, auth_headers: dict, sample_activity: ActivityLog
    ):
        resp = client.get(f"{BASE_URL}/{sample_activity.id}", headers=auth_headers)
        assert resp.status_code == 200
        assert resp.json()["id"] == str(sample_activity.id)

    def test_get_nonexistent_returns_404(self, client: TestClient, auth_headers: dict):
        resp = client.get(f"{BASE_URL}/{uuid.uuid4()}", headers=auth_headers)
        assert resp.status_code == 404

    def test_get_requires_auth(self, client: TestClient, sample_activity: ActivityLog):
        resp = client.get(f"{BASE_URL}/{sample_activity.id}")
        assert resp.status_code == 401
