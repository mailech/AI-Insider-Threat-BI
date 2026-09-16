"""Tests for /api/v1/alerts endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.alert import Alert, AlertStatus
from app.models.anomaly import Anomaly, AnomalyCategory, AnomalyStatus, Severity
from app.models.employee import Employee


BASE_URL = "/api/v1/alerts"


# ---------------------------------------------------------------------------
# GET /api/v1/alerts
# ---------------------------------------------------------------------------

class TestListAlerts:
    def test_list_returns_list(self, client: TestClient, auth_headers: dict):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_includes_sample_alert(
        self, client: TestClient, auth_headers: dict, sample_alert: Alert
    ):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        ids = [a["id"] for a in resp.json()]
        assert str(sample_alert.id) in ids

    def test_filter_by_employee_id(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_alert: Alert,
        sample_employee: Employee,
    ):
        resp = client.get(
            BASE_URL,
            params={"employee_id": str(sample_employee.id)},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        for alert in resp.json():
            assert alert["employee_id"] == str(sample_employee.id)

    def test_filter_by_severity(
        self, client: TestClient, auth_headers: dict, sample_alert: Alert
    ):
        resp = client.get(
            BASE_URL, params={"severity": "High"}, headers=auth_headers
        )
        assert resp.status_code == 200
        for alert in resp.json():
            assert alert["severity"] == "High"

    def test_filter_by_status(
        self, client: TestClient, auth_headers: dict, sample_alert: Alert
    ):
        resp = client.get(
            BASE_URL, params={"status": "Open"}, headers=auth_headers
        )
        assert resp.status_code == 200
        for alert in resp.json():
            assert alert["status"] == "Open"

    def test_pagination(
        self, client: TestClient, auth_headers: dict, sample_alert: Alert
    ):
        resp = client.get(BASE_URL, params={"skip": 0, "limit": 1}, headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) <= 1

    def test_list_requires_auth(self, client: TestClient):
        resp = client.get(BASE_URL)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/alerts/{alert_id}
# ---------------------------------------------------------------------------

class TestGetAlert:
    def test_get_existing(
        self, client: TestClient, auth_headers: dict, sample_alert: Alert
    ):
        resp = client.get(f"{BASE_URL}/{sample_alert.id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(sample_alert.id)
        assert data["title"] == sample_alert.title
        assert "raised_at" in data

    def test_get_nonexistent_returns_404(self, client: TestClient, auth_headers: dict):
        resp = client.get(f"{BASE_URL}/{uuid.uuid4()}", headers=auth_headers)
        assert resp.status_code == 404

    def test_get_requires_auth(self, client: TestClient, sample_alert: Alert):
        resp = client.get(f"{BASE_URL}/{sample_alert.id}")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/v1/alerts/{alert_id}/status
# ---------------------------------------------------------------------------

class TestUpdateAlertStatus:
    @pytest.mark.parametrize("new_status", ["Acknowledged", "Closed"])
    def test_update_status_success(
        self,
        client: TestClient,
        auth_headers: dict,
        db: Session,
        sample_employee: Employee,
        sample_anomaly: Anomaly,
        new_status: str,
    ):
        alert = Alert(
            employee_id=sample_employee.id,
            anomaly_id=sample_anomaly.id,
            raised_at=datetime(2026, 1, 10, 10, 0, 0, tzinfo=timezone.utc),
            title="Parametrized test alert",
            description="Test.",
            severity=Severity.MEDIUM,
            status=AlertStatus.OPEN,
        )
        db.add(alert)
        db.commit()
        db.refresh(alert)

        resp = client.patch(
            f"{BASE_URL}/{alert.id}/status",
            json={"status": new_status},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == new_status

    def test_update_status_nonexistent_404(self, client: TestClient, auth_headers: dict):
        resp = client.patch(
            f"{BASE_URL}/{uuid.uuid4()}/status",
            json={"status": "Closed"},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_update_status_invalid_value_422(
        self, client: TestClient, auth_headers: dict, sample_alert: Alert
    ):
        resp = client.patch(
            f"{BASE_URL}/{sample_alert.id}/status",
            json={"status": "INVALID_STATUS"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_update_status_requires_auth(
        self, client: TestClient, sample_alert: Alert
    ):
        resp = client.patch(
            f"{BASE_URL}/{sample_alert.id}/status",
            json={"status": "Acknowledged"},
        )
        assert resp.status_code == 401

    def test_update_persisted_in_database(
        self,
        client: TestClient,
        auth_headers: dict,
        db: Session,
        sample_alert: Alert,
    ):
        resp = client.patch(
            f"{BASE_URL}/{sample_alert.id}/status",
            json={"status": "Acknowledged"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        db.refresh(sample_alert)
        assert sample_alert.status == AlertStatus.ACKNOWLEDGED
