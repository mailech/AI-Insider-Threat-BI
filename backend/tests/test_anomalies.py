"""Tests for /api/v1/anomalies endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.anomaly import Anomaly, AnomalyCategory, AnomalyStatus, Severity
from app.models.employee import Employee


BASE_URL = "/api/v1/anomalies"


# ---------------------------------------------------------------------------
# GET /api/v1/anomalies
# ---------------------------------------------------------------------------

class TestListAnomalies:
    def test_list_returns_list(self, client: TestClient, auth_headers: dict):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_list_includes_sample_anomaly(
        self, client: TestClient, auth_headers: dict, sample_anomaly: Anomaly
    ):
        resp = client.get(BASE_URL, headers=auth_headers)
        assert resp.status_code == 200
        ids = [a["id"] for a in resp.json()]
        assert str(sample_anomaly.id) in ids

    def test_filter_by_employee_id(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_anomaly: Anomaly,
        sample_employee: Employee,
    ):
        resp = client.get(
            BASE_URL,
            params={"employee_id": str(sample_employee.id)},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        for anomaly in resp.json():
            assert anomaly["employee_id"] == str(sample_employee.id)

    def test_filter_by_severity(
        self, client: TestClient, auth_headers: dict, sample_anomaly: Anomaly
    ):
        resp = client.get(
            BASE_URL,
            params={"severity": "High"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        for anomaly in resp.json():
            assert anomaly["severity"] == "High"

    def test_filter_by_status(
        self, client: TestClient, auth_headers: dict, sample_anomaly: Anomaly
    ):
        resp = client.get(
            BASE_URL,
            params={"status": "New"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        for anomaly in resp.json():
            assert anomaly["status"] == "New"

    def test_filter_by_category(
        self, client: TestClient, auth_headers: dict, sample_anomaly: Anomaly
    ):
        resp = client.get(
            BASE_URL,
            params={"category": "Unusual Login Time"},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        for anomaly in resp.json():
            assert anomaly["category"] == "Unusual Login Time"

    def test_pagination(
        self, client: TestClient, auth_headers: dict, sample_anomaly: Anomaly
    ):
        resp = client.get(BASE_URL, params={"skip": 0, "limit": 1}, headers=auth_headers)
        assert resp.status_code == 200
        assert len(resp.json()) <= 1

    def test_list_requires_auth(self, client: TestClient):
        resp = client.get(BASE_URL)
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/anomalies/{anomaly_id}
# ---------------------------------------------------------------------------

class TestGetAnomaly:
    def test_get_existing(
        self, client: TestClient, auth_headers: dict, sample_anomaly: Anomaly
    ):
        resp = client.get(f"{BASE_URL}/{sample_anomaly.id}", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["id"] == str(sample_anomaly.id)
        assert data["severity"] == "High"
        assert data["category"] == "Unusual Login Time"

    def test_get_nonexistent_returns_404(self, client: TestClient, auth_headers: dict):
        resp = client.get(f"{BASE_URL}/{uuid.uuid4()}", headers=auth_headers)
        assert resp.status_code == 404

    def test_get_requires_auth(self, client: TestClient, sample_anomaly: Anomaly):
        resp = client.get(f"{BASE_URL}/{sample_anomaly.id}")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# PATCH /api/v1/anomalies/{anomaly_id}/status
# ---------------------------------------------------------------------------

class TestUpdateAnomalyStatus:
    @pytest.mark.parametrize("new_status", [
        "Under Review",
        "Confirmed",
        "Dismissed",
    ])
    def test_update_status_success(
        self,
        client: TestClient,
        auth_headers: dict,
        db: Session,
        sample_employee: Employee,
        new_status: str,
    ):
        # Create a fresh anomaly for each parametrize run
        anomaly = Anomaly(
            employee_id=sample_employee.id,
            detected_at=datetime(2026, 1, 10, 22, 0, 0, tzinfo=timezone.utc),
            category=AnomalyCategory.UNUSUAL_LOGIN_TIME,
            severity=Severity.MEDIUM,
            status=AnomalyStatus.NEW,
            description="Test anomaly",
            baseline_deviation=50.0,
            observed_value=22.0,
            baseline_value=9.0,
        )
        db.add(anomaly)
        db.commit()
        db.refresh(anomaly)

        resp = client.patch(
            f"{BASE_URL}/{anomaly.id}/status",
            json={"status": new_status},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert resp.json()["status"] == new_status

    def test_update_status_nonexistent_404(self, client: TestClient, auth_headers: dict):
        resp = client.patch(
            f"{BASE_URL}/{uuid.uuid4()}/status",
            json={"status": "Confirmed"},
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_update_status_invalid_value_422(
        self, client: TestClient, auth_headers: dict, sample_anomaly: Anomaly
    ):
        resp = client.patch(
            f"{BASE_URL}/{sample_anomaly.id}/status",
            json={"status": "BOGUS"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_update_status_requires_auth(
        self, client: TestClient, sample_anomaly: Anomaly
    ):
        resp = client.patch(
            f"{BASE_URL}/{sample_anomaly.id}/status",
            json={"status": "Confirmed"},
        )
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# POST /api/v1/anomalies/scan
# ---------------------------------------------------------------------------

class TestAnomalyScan:
    _SCAN_RESULT = {
        "created": 1,
        "alerts_created": 1,
        "notifications_created": 1,
    }

    def test_scan_specific_employee(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_employee: Employee,
    ):
        with patch(
            "app.services.anomaly_service.scan_employee",
            return_value=self._SCAN_RESULT,
        ):
            resp = client.post(
                f"{BASE_URL}/scan",
                json={"employee_id": str(sample_employee.id), "lookback_days": 30},
                headers=auth_headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["scanned_employees"] == 1
        assert "anomalies" in data

    def test_scan_all_employees(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        all_result = {**self._SCAN_RESULT, "scanned_employees": 1}
        with patch(
            "app.services.anomaly_service.scan_all_employees",
            return_value=all_result,
        ):
            resp = client.post(
                f"{BASE_URL}/scan",
                json={"lookback_days": 30},
                headers=auth_headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert "scanned_employees" in data
        assert "anomalies" in data

    def test_scan_requires_auth(
        self, client: TestClient, sample_employee: Employee
    ):
        resp = client.post(
            f"{BASE_URL}/scan",
            json={"employee_id": str(sample_employee.id)},
        )
        assert resp.status_code == 401
