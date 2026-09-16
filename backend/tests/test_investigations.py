"""Tests for /api/v1/investigations endpoints."""

from __future__ import annotations

import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.anomaly import Severity
from app.models.employee import Employee
from app.models.investigation import Investigation, InvestigationStatus
from app.models.user import User


BASE_URL = "/api/v1/investigations"


def _create_investigation_payload(employee_id: uuid.UUID, **overrides) -> dict:
    defaults = {
        "title": "Suspicious Activity Investigation",
        "employee_id": str(employee_id),
        "description": "Employee exhibited unusual behavior.",
        "severity": "High",
    }
    defaults.update(overrides)
    return defaults


# ---------------------------------------------------------------------------
# GET /api/v1/investigations
# ---------------------------------------------------------------------------

class TestListInvestigations:
    def test_list_returns_list(self, client: TestClient, auth_headers: dict):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_includes_sample_investigation(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
    ):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        ids = [inv["id"] for inv in resp.json()]
        assert str(sample_investigation.id) in ids

    def test_filter_by_employee_id(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
        sample_employee: Employee,
    ):
        resp = client.get(
            BASE_URL,
            params={"employee_id": str(sample_employee.id)},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        for inv in resp.json():
            assert inv["employee_id"] == str(sample_employee.id)

    def test_filter_by_status(
        self, client: TestClient, auth_headers: dict, sample_investigation: Investigation
    ):
        resp = client.get(
            BASE_URL, params={"status": "Open"}, headers=auth_headers
        )
        assert resp.status_code == 200
        for inv in resp.json():
            assert inv["status"] == "Open"

    def test_filter_by_severity(
        self, client: TestClient, auth_headers: dict, sample_investigation: Investigation
    ):
        resp = client.get(
            BASE_URL, params={"severity": "High"}, headers=auth_headers
        )
        assert resp.status_code == 200
        for inv in resp.json():
            assert inv["severity"] == "High"

    def test_list_requires_auth(self, client: TestClient):
        resp = client.get(BASE_URL)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/investigations
# ---------------------------------------------------------------------------

class TestCreateInvestigation:
    def test_create_success(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_employee: Employee,
    ):
        payload = _create_investigation_payload(sample_employee.id)
        resp = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert resp.status_code == 201
        data = resp.json()
        assert data["employee_id"] == str(sample_employee.id)
        assert data["title"] == payload["title"]
        assert data["status"] == "Open"
        assert data["reference"].startswith("INV-")
        assert "events" in data

    def test_create_includes_created_event(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_employee: Employee,
    ):
        payload = _create_investigation_payload(sample_employee.id)
        resp = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert resp.status_code == 201
        events = resp.json()["events"]
        assert len(events) >= 1
        assert events[0]["event_type"] == "created"

    def test_create_missing_title_422(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        resp = client.post(
            BASE_URL,
            json={"employee_id": str(sample_employee.id)},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_create_requires_auth(
        self, client: TestClient, sample_employee: Employee
    ):
        resp = client.post(
            BASE_URL,
            json=_create_investigation_payload(sample_employee.id),
        )
        assert resp.status_code == 401

    def test_create_with_anomaly_reference(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_employee: Employee,
        sample_anomaly,
    ):
        payload = _create_investigation_payload(
            sample_employee.id, anomaly_id=str(sample_anomaly.id)
        )
        resp = client.post(BASE_URL, json=payload, headers=auth_headers)
        assert resp.status_code == 201
        assert resp.json()["anomaly_id"] == str(sample_anomaly.id)


# ---------------------------------------------------------------------------
# GET /api/v1/investigations/{investigation_id}
# ---------------------------------------------------------------------------

class TestGetInvestigation:
    def test_get_existing(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
    ):
        resp = client.get(f"{BASE_URL}/{sample_investigation.id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(sample_investigation.id)
        assert "events" in data

    def test_get_nonexistent_returns_404(self, client: TestClient, auth_headers: dict):
        resp = client.get(f"{BASE_URL}/{uuid.uuid4()}", headers=auth_headers)
        assert resp.status_code == 404

    def test_get_requires_auth(
        self, client: TestClient, sample_investigation: Investigation
    ):
        resp = client.get(f"{BASE_URL}/{sample_investigation.id}")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/investigations/{id}/assign
# ---------------------------------------------------------------------------

class TestAssignInvestigation:
    def test_assign_success(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
        analyst_user: User,
    ):
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/assign",
            json={"assigned_to_id": str(analyst_user.id)},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["assigned_to_id"] == str(analyst_user.id)
        # Status should progress from Open → In Progress
        assert data["status"] == "In Progress"

    def test_assign_creates_timeline_event(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
        analyst_user: User,
    ):
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/assign",
            json={"assigned_to_id": str(analyst_user.id)},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        event_types = [e["event_type"] for e in resp.json()["events"]]
        assert "assigned" in event_types

    def test_assign_nonexistent_investigation_404(
        self, client: TestClient, auth_headers: dict, analyst_user: User
    ):
        resp = client.post(
            f"{BASE_URL}/{uuid.uuid4()}/assign",
            json={"assigned_to_id": str(analyst_user.id)},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_assign_nonexistent_user_404(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
    ):
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/assign",
            json={"assigned_to_id": str(uuid.uuid4())},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_assign_requires_auth(
        self,
        client: TestClient,
        sample_investigation: Investigation,
        analyst_user: User,
    ):
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/assign",
            json={"assigned_to_id": str(analyst_user.id)},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/investigations/{id}/escalate
# ---------------------------------------------------------------------------

class TestEscalateInvestigation:
    def test_escalate_success(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
    ):
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/escalate",
            json={"reason": "Severity upgraded due to new evidence.", "severity": "Critical"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "Escalated"
        assert data["severity"] == "Critical"

    def test_escalate_creates_event(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
    ):
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/escalate",
            json={"reason": "New indicators found.", "severity": "Critical"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        event_types = [e["event_type"] for e in resp.json()["events"]]
        assert "escalated" in event_types

    def test_escalate_nonexistent_404(self, client: TestClient, auth_headers: dict):
        resp = client.post(
            f"{BASE_URL}/{uuid.uuid4()}/escalate",
            json={"reason": "Reason.", "severity": "Critical"},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_escalate_requires_auth(
        self, client: TestClient, sample_investigation: Investigation
    ):
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/escalate",
            json={"reason": "Reason.", "severity": "Critical"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/investigations/{id}/resolve
# ---------------------------------------------------------------------------

class TestResolveInvestigation:
    def test_resolve_success(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
    ):
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/resolve",
            json={"resolution": "Confirmed as false positive after review."},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "Resolved"
        assert data["resolution"] == "Confirmed as false positive after review."
        assert data["resolved_at"] is not None

    def test_resolve_creates_event(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
    ):
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/resolve",
            json={"resolution": "Resolved after investigation."},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        event_types = [e["event_type"] for e in resp.json()["events"]]
        assert "resolved" in event_types

    def test_resolve_short_resolution_422(
        self, client: TestClient, auth_headers: dict, sample_investigation: Investigation
    ):
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/resolve",
            json={"resolution": "No"},  # too short (< 3 chars requires at least 3)
            headers=auth_headers,
        )
        # "No" is 2 chars which fails min_length=3 validation
        assert resp.status_code == 422

    def test_resolve_nonexistent_404(self, client: TestClient, auth_headers: dict):
        resp = client.post(
            f"{BASE_URL}/{uuid.uuid4()}/resolve",
            json={"resolution": "Nothing to resolve here."},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_resolve_requires_auth(
        self, client: TestClient, sample_investigation: Investigation
    ):
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/resolve",
            json={"resolution": "Resolved without auth."},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/investigations/{id}/close
# ---------------------------------------------------------------------------

class TestCloseInvestigation:
    def _resolve_first(
        self, client: TestClient, headers: dict, investigation_id: uuid.UUID
    ) -> None:
        """Helper: resolve an investigation before closing."""
        client.post(
            f"{BASE_URL}/{investigation_id}/resolve",
            json={"resolution": "Pre-close resolution step."},
            headers=headers,
        )

    def test_close_success(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
    ):
        self._resolve_first(client, auth_headers, sample_investigation.id)
        resp = client.post(
            f"{BASE_URL}/{sample_investigation.id}/close",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "Closed"
        assert data["closed_at"] is not None

    def test_close_creates_event(
        self,
        client: TestClient,
        auth_headers: dict,
        db: Session,
        sample_employee: Employee,
        admin_user: User,
    ):
        """Create a fresh investigation, resolve then close it."""
        from app.services import investigation_service
        inv = investigation_service.create_investigation(
            db,
            title="Close event test",
            employee_id=sample_employee.id,
            created_by_id=admin_user.id,
            actor_name=admin_user.full_name,
        )
        client.post(
            f"{BASE_URL}/{inv.id}/resolve",
            json={"resolution": "Resolved for close test."},
            headers=auth_headers,
        )
        resp = client.post(f"{BASE_URL}/{inv.id}/close", headers=auth_headers)
        assert resp.status_code == 200
        event_types = [e["event_type"] for e in resp.json()["events"]]
        assert "closed" in event_types

    def test_close_nonexistent_404(self, client: TestClient, auth_headers: dict):
        resp = client.post(f"{BASE_URL}/{uuid.uuid4()}/close", headers=auth_headers)
        assert resp.status_code == 404

    def test_close_requires_auth(
        self, client: TestClient, sample_investigation: Investigation
    ):
        resp = client.post(f"{BASE_URL}/{sample_investigation.id}/close")
        assert resp.status_code == 401
