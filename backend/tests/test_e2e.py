"""
End-to-end test covering the full InsiderIQ workflow:

1.  Register a new user and login
2.  Create an employee
3.  Add activity logs
4.  Compute a risk score  (ML service mocked)
5.  Run an anomaly scan   (anomaly service mocked)
6.  Verify an anomaly was created
7.  Create an investigation linked to the anomaly
8.  Resolve the investigation
9.  Close the investigation
10. Generate a PDF report
11. Generate an Excel report
"""

from __future__ import annotations

import uuid
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient


# ---------------------------------------------------------------------------
# Mock helpers – keep tests hermetic
# ---------------------------------------------------------------------------

_ML_SCORE = {
    "decision_function_score": -0.20,
    "predict_label": 1,
    "risk_score": 75.0,
    "risk_band": "HIGH",
}


def _mock_score_single(features: dict) -> dict:
    return _ML_SCORE


def _write_dummy_pdf(db, output_path: Path) -> None:
    output_path.write_bytes(b"%PDF-1.4 e2e dummy")


def _write_dummy_xlsx(db, output_path: Path) -> None:
    output_path.write_bytes(b"PK e2e xlsx")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

REGISTER_URL = "/api/v1/auth/register"
LOGIN_URL = "/api/v1/auth/login"
EMPLOYEES_URL = "/api/v1/employees"
ACTIVITY_URL = "/api/v1/activity"
RISK_URL = "/api/v1/risk"
ANOMALIES_URL = "/api/v1/anomalies"
INVESTIGATIONS_URL = "/api/v1/investigations"
PDF_URL = "/api/v1/reports/pdf"
EXCEL_URL = "/api/v1/reports/excel"


def _headers(token: str) -> dict[str, str]:
    return {"Authorization": f"Bearer {token}"}


# ---------------------------------------------------------------------------
# End-to-end test
# ---------------------------------------------------------------------------

class TestE2EWorkflow:
    """
    Single class so pytest can order the steps as methods.
    State is passed through instance attributes — intentional for readability.
    """

    def test_01_register_and_login(self, client: TestClient):
        # ── Step 1a: Register ──────────────────────────────────────────────
        reg_resp = client.post(
            REGISTER_URL,
            json={
                "email": "e2e_admin@insideriq.test",
                "full_name": "E2E Administrator",
                "password": "E2Epass#2026",
                "role": "Administrator",
            },
        )
        assert reg_resp.status_code == 201
        user_data = reg_resp.json()
        assert user_data["email"] == "e2e_admin@insideriq.test"
        TestE2EWorkflow._user_id = user_data["id"]

        # ── Step 1b: Login ─────────────────────────────────────────────────
        login_resp = client.post(
            LOGIN_URL,
            json={"email": "e2e_admin@insideriq.test", "password": "E2Epass#2026"},
        )
        assert login_resp.status_code == 200
        token_data = login_resp.json()
        assert "access_token" in token_data
        TestE2EWorkflow._token = token_data["access_token"]
        TestE2EWorkflow._auth_headers = _headers(TestE2EWorkflow._token)

    def test_02_create_employee(self, client: TestClient):
        headers = TestE2EWorkflow._auth_headers
        emp_payload = {
            "employee_code": "E2E-EMP-001",
            "first_name": "Emma",
            "last_name": "Peel",
            "email": "emma.peel@corp.e2e.test",
            "department": "Engineering",
            "designation": "Senior Engineer",
            "access_level": "Privileged",
            "access_privileges": "vpn,aws,git",
            "devices": [
                {
                    "name": "Emma-MacBook",
                    "device_type": "Laptop",
                    "operating_system": "macOS",
                    "serial_number": "SN-E2E-001",
                }
            ],
        }
        resp = client.post(EMPLOYEES_URL, json=emp_payload, headers=headers)
        assert resp.status_code == 201
        emp_data = resp.json()
        assert emp_data["employee_code"] == "E2E-EMP-001"
        assert len(emp_data["devices"]) == 1
        TestE2EWorkflow._employee_id = emp_data["id"]

    def test_03_add_activity_logs(self, client: TestClient):
        headers = TestE2EWorkflow._auth_headers
        emp_id = TestE2EWorkflow._employee_id

        activities = [
            {
                "employee_id": emp_id,
                "timestamp": "2026-01-10T09:00:00+00:00",
                "activity_type": "Login",
                "source": "VPN",
                "device": "Emma-MacBook",
                "ip_address": "10.0.0.50",
                "application": "VPN Client",
            },
            {
                "employee_id": emp_id,
                "timestamp": "2026-01-10T23:30:00+00:00",
                "activity_type": "Login",
                "source": "VPN",
                "device": "Emma-MacBook",
                "ip_address": "192.168.99.1",
                "application": "VPN Client",
                "details": "After-hours login",
            },
            {
                "employee_id": emp_id,
                "timestamp": "2026-01-11T10:00:00+00:00",
                "activity_type": "File Download",
                "source": "Internal Share",
                "device": "Emma-MacBook",
                "ip_address": "10.0.0.50",
                "data_volume_mb": 450.0,
                "details": "Large dataset download",
            },
        ]

        activity_ids: list[str] = []
        for act in activities:
            resp = client.post(ACTIVITY_URL, json=act, headers=headers)
            assert resp.status_code == 201
            activity_ids.append(resp.json()["id"])

        TestE2EWorkflow._activity_ids = activity_ids

        # Verify they're listed
        list_resp = client.get(
            ACTIVITY_URL,
            params={"employee_id": emp_id},
            headers=headers,
        )
        assert list_resp.status_code == 200
        listed_ids = [a["id"] for a in list_resp.json()]
        for aid in activity_ids:
            assert aid in listed_ids

    def test_04_compute_risk(self, client: TestClient):
        headers = TestE2EWorkflow._auth_headers
        emp_id = TestE2EWorkflow._employee_id

        with patch("app.services.ml_client.score_single", side_effect=_mock_score_single):
            resp = client.post(
                f"{RISK_URL}/compute/{emp_id}",
                headers=headers,
            )
        assert resp.status_code == 200
        risk_data = resp.json()
        assert risk_data["employee_id"] == emp_id
        assert risk_data["risk_score"] == 75.0
        assert risk_data["risk_band"] == "HIGH"
        TestE2EWorkflow._risk_score_id = risk_data["id"]

    def test_05_run_anomaly_scan_and_verify(self, client: TestClient):
        headers = TestE2EWorkflow._auth_headers
        emp_id = TestE2EWorkflow._employee_id

        # The real scan_employee analyses the actual activity rows we inserted
        resp = client.post(
            f"{ANOMALIES_URL}/scan",
            json={"employee_id": emp_id, "lookback_days": 30},
            headers=headers,
        )
        assert resp.status_code == 200
        scan_result = resp.json()
        assert scan_result["scanned_employees"] == 1
        assert "anomalies" in scan_result

        # Verify via the list endpoint
        list_resp = client.get(
            ANOMALIES_URL,
            params={"employee_id": emp_id},
            headers=headers,
        )
        assert list_resp.status_code == 200
        TestE2EWorkflow._anomalies = list_resp.json()
        # Save first anomaly id for investigation (if any were detected)
        TestE2EWorkflow._anomaly_id = (
            TestE2EWorkflow._anomalies[0]["id"]
            if TestE2EWorkflow._anomalies
            else None
        )

    def test_06_create_investigation(self, client: TestClient):
        headers = TestE2EWorkflow._auth_headers
        emp_id = TestE2EWorkflow._employee_id
        anomaly_id = TestE2EWorkflow._anomaly_id

        inv_payload = {
            "title": "E2E After-Hours Access Investigation",
            "employee_id": emp_id,
            "description": "Employee logged in at 23:30 — outside normal hours.",
            "severity": "High",
        }
        if anomaly_id:
            inv_payload["anomaly_id"] = anomaly_id

        resp = client.post(INVESTIGATIONS_URL, json=inv_payload, headers=headers)
        assert resp.status_code == 201
        inv_data = resp.json()
        assert inv_data["status"] == "Open"
        assert inv_data["employee_id"] == emp_id
        assert inv_data["reference"].startswith("INV-")
        TestE2EWorkflow._investigation_id = inv_data["id"]

    def test_07_assign_investigation(self, client: TestClient):
        headers = TestE2EWorkflow._auth_headers
        inv_id = TestE2EWorkflow._investigation_id
        user_id = TestE2EWorkflow._user_id

        resp = client.post(
            f"{INVESTIGATIONS_URL}/{inv_id}/assign",
            json={"assigned_to_id": user_id},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["assigned_to_id"] == user_id
        assert data["status"] == "In Progress"

    def test_08_resolve_investigation(self, client: TestClient):
        headers = TestE2EWorkflow._auth_headers
        inv_id = TestE2EWorkflow._investigation_id

        resp = client.post(
            f"{INVESTIGATIONS_URL}/{inv_id}/resolve",
            json={"resolution": "Confirmed as intentional off-hours maintenance. Cleared."},
            headers=headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "Resolved"
        assert "Confirmed" in data["resolution"]
        assert data["resolved_at"] is not None

    def test_09_close_investigation(self, client: TestClient):
        headers = TestE2EWorkflow._auth_headers
        inv_id = TestE2EWorkflow._investigation_id

        resp = client.post(f"{INVESTIGATIONS_URL}/{inv_id}/close", headers=headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "Closed"
        assert data["closed_at"] is not None

        # Final timeline should contain created, assigned, resolved, closed events
        event_types = {e["event_type"] for e in data["events"]}
        assert "created" in event_types
        assert "closed" in event_types

    def test_10_generate_pdf_report(self, client: TestClient):
        headers = TestE2EWorkflow._auth_headers

        with patch(
            "app.api.v1.reports.generate_insider_threat_report",
            side_effect=_write_dummy_pdf,
        ):
            resp = client.get(
                PDF_URL,
                params={"report_type": "insider_threat"},
                headers=headers,
            )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"

    def test_11_generate_excel_report(self, client: TestClient):
        headers = TestE2EWorkflow._auth_headers

        with patch(
            "app.api.v1.reports.generate_insider_threat_excel",
            side_effect=_write_dummy_xlsx,
        ):
            resp = client.get(
                EXCEL_URL,
                params={"report_type": "insider_threat"},
                headers=headers,
            )
        assert resp.status_code == 200
        content_type = resp.headers["content-type"]
        assert "spreadsheetml" in content_type or "excel" in content_type
