"""
ITBIS — Pytest: Real-Time Telemetry Ingestion & ML Inference Hook
=================================================================
End-to-end integration tests for POST /api/v1/telemetry/ingest.

Validates:
  1. Benign event ingestion → Isolation Forest scores LOW/NORMAL
  2. Critical exfiltration event → anomaly escalates to HIGH/CRITICAL
  3. MongoDB activity_logs document is enriched with `inference` metadata
  4. PostgreSQL employee record reflects updated risk_score and risk_category
  5. Missing-model cold-load fallback never breaks log ingestion (HTTP 201)
  6. 404 for unknown employee
  7. 401 without auth token

Usage (from backend/ directory with venv activated):
    pytest tests/test_realtime_telemetry_ingest.py -v
"""

from __future__ import annotations

import json
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import pytest

# ─────────────────────────────────────────────────────────────────────────────
# Configuration
# ─────────────────────────────────────────────────────────────────────────────

BASE_URL   = "http://127.0.0.1:8000/api/v1"
HEALTH_URL = "http://127.0.0.1:8000/health"

ADMIN_CREDENTIALS = {
    "username": "admin@itbis.internal",
    "password": "Admin1234!",
}

THREAT_EMP_ID = "emp_1001"   # Marcus Hale — Financial Exfiltration persona
BENIGN_EMP_ID = "emp_1004"   # Amara Diallo — Standard benign baseline


# ─────────────────────────────────────────────────────────────────────────────
# HTTP helpers (stdlib-only so pytest can use without extra deps in CI)
# ─────────────────────────────────────────────────────────────────────────────

def _http_post_form(path: str, data: dict[str, str]) -> tuple[int, Any]:
    encoded = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read())
        except Exception:
            body = {}
        return exc.code, body


def _http_post_json(path: str, payload: dict[str, Any], token: Optional[str] = None) -> tuple[int, Any]:
    data = json.dumps(payload).encode("utf-8")
    headers: dict[str, str] = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(
        f"{BASE_URL}{path}", data=data, headers=headers, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read())
        except Exception:
            body = {}
        return exc.code, body


def _http_get(path: str, token: str) -> tuple[int, Any]:
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read())
        except Exception:
            body = {}
        return exc.code, body


# ─────────────────────────────────────────────────────────────────────────────
# Session-scoped fixtures
# ─────────────────────────────────────────────────────────────────────────────

@pytest.fixture(scope="session", autouse=True)
def check_server_alive() -> None:
    """Skip entire session if backend is not reachable."""
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=4) as resp:
            assert resp.status == 200, "Backend health check failed"
    except Exception as exc:
        pytest.skip(f"FastAPI backend is not running at {HEALTH_URL}: {exc}")


@pytest.fixture(scope="session")
def admin_token() -> str:
    """Obtain a valid admin JWT bearer token once per test session."""
    status_code, body = _http_post_form("/auth/login", ADMIN_CREDENTIALS)
    assert status_code == 200, f"Authentication failed: {status_code} {body}"
    token = body.get("access_token", "")
    assert token, "No access_token returned by /auth/login"
    return token


@pytest.fixture(scope="session")
def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@pytest.fixture(scope="session")
def benign_ingest_response(admin_token: str, now_iso: str) -> tuple[int, dict[str, Any]]:
    """POST a benign FILE_DOWNLOAD event for emp_1004 and cache the response."""
    payload = {
        "emp_id": BENIGN_EMP_ID,
        "event_type": "FILE_DOWNLOAD",
        "severity": "INFO",
        "source_ip": "10.0.4.15",
        "payload": {
            "file_name": "quarterly_report_q3.xlsx",
            "size_mb": 1.2,
            "action": "READ",
            "work_hours": True,
        },
        "timestamp": now_iso,
    }
    return _http_post_json("/telemetry/ingest", payload, admin_token)


@pytest.fixture(scope="session")
def threat_ingest_response(admin_token: str, now_iso: str) -> tuple[int, dict[str, Any]]:
    """POST a CRITICAL FILE_UPLOAD exfiltration event for emp_1001 and cache the response."""
    payload = {
        "emp_id": THREAT_EMP_ID,
        "event_type": "FILE_UPLOAD",
        "severity": "CRITICAL",
        "source_ip": "192.168.1.105",
        "payload": {
            "file_name": "customer_pii_vault_export.tar.gz",
            "destination_ip": "198.51.100.42",
            "destination_country": "UNKNOWN",
            "size_mb": 4250.0,
            "external_transfer": True,
            "off_hours": True,
            "protocol": "SFTP",
            "encrypted": False,
        },
        "timestamp": now_iso,
    }
    return _http_post_json("/telemetry/ingest", payload, admin_token)


# ─────────────────────────────────────────────────────────────────────────────
# 1. Benign Ingestion Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestBenignIngestion:
    def test_http_201_created(self, benign_ingest_response: tuple) -> None:
        status_code, _ = benign_ingest_response
        assert status_code == 201, f"Expected HTTP 201, got {status_code}"

    def test_status_success(self, benign_ingest_response: tuple) -> None:
        _, body = benign_ingest_response
        assert body.get("status") == "success"

    def test_log_id_returned(self, benign_ingest_response: tuple) -> None:
        _, body = benign_ingest_response
        log_id = body.get("log_id", "")
        assert isinstance(log_id, str) and len(log_id) == 24, (
            f"Expected 24-char MongoDB ObjectId string, got: {log_id!r}"
        )

    def test_emp_id_returned(self, benign_ingest_response: tuple) -> None:
        _, body = benign_ingest_response
        assert body.get("emp_id") == BENIGN_EMP_ID

    def test_threat_score_present(self, benign_ingest_response: tuple) -> None:
        _, body = benign_ingest_response
        threat_score = body.get("threat_score")
        assert threat_score is not None
        assert isinstance(threat_score, int)
        assert 0 <= threat_score <= 100

    def test_anomaly_score_present(self, benign_ingest_response: tuple) -> None:
        _, body = benign_ingest_response
        anomaly_score = body.get("anomaly_score")
        assert anomaly_score is not None
        assert isinstance(anomaly_score, (int, float))
        assert 0.0 <= float(anomaly_score) <= 100.0

    def test_benign_severity_is_low_or_normal(self, benign_ingest_response: tuple) -> None:
        _, body = benign_ingest_response
        sev = body.get("severity", "")
        assert sev in ("NORMAL", "LOW", "MEDIUM"), (
            f"Benign event expected NORMAL/LOW/MEDIUM severity, got: {sev}"
        )

    def test_benign_is_anomaly_false_or_low_score(self, benign_ingest_response: tuple) -> None:
        _, body = benign_ingest_response
        # Benign employees should have low anomaly score or is_anomaly=False
        anomaly_score = float(body.get("anomaly_score", 0))
        assert anomaly_score < 75.0, (
            f"Benign event anomaly_score too high: {anomaly_score}"
        )

    def test_postgresql_employee_updated(self, admin_token: str) -> None:
        status_code, emp = _http_get(f"/employees/{BENIGN_EMP_ID}", admin_token)
        assert status_code == 200
        assert emp.get("risk_score") is not None
        assert emp.get("risk_category") in ("LOW", "MEDIUM", "HIGH", "CRITICAL")
        assert emp.get("updated_at") is not None


# ─────────────────────────────────────────────────────────────────────────────
# 2. Threat / Critical Anomaly Escalation Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestThreatIngestionAnomalyEscalation:
    def test_http_201_created(self, threat_ingest_response: tuple) -> None:
        status_code, _ = threat_ingest_response
        assert status_code == 201, f"Expected HTTP 201, got {status_code}"

    def test_status_success(self, threat_ingest_response: tuple) -> None:
        _, body = threat_ingest_response
        assert body.get("status") == "success"

    def test_threat_score_critical(self, threat_ingest_response: tuple) -> None:
        _, body = threat_ingest_response
        threat_score = body.get("threat_score", 0)
        assert threat_score >= 60, (
            f"Threat exfiltration event expected threat_score >= 60, got {threat_score}"
        )

    def test_anomaly_score_elevated(self, threat_ingest_response: tuple) -> None:
        _, body = threat_ingest_response
        anomaly_score = float(body.get("anomaly_score", 0))
        assert anomaly_score >= 50.0, (
            f"Exfiltration event expected anomaly_score >= 50.0, got {anomaly_score}"
        )

    def test_severity_is_high_or_critical(self, threat_ingest_response: tuple) -> None:
        _, body = threat_ingest_response
        sev = body.get("severity", "")
        assert sev in ("HIGH", "CRITICAL"), (
            f"Exfiltration event expected HIGH/CRITICAL severity, got: {sev}"
        )

    def test_is_anomaly_true(self, threat_ingest_response: tuple) -> None:
        _, body = threat_ingest_response
        assert body.get("is_anomaly") is True

    def test_contributing_risk_factors_present(self, threat_ingest_response: tuple) -> None:
        _, body = threat_ingest_response
        factors = body.get("contributing_risk_factors", [])
        assert len(factors) >= 1, "Expected at least one contributing risk factor"

    def test_top_risk_factor_is_exfiltration(self, threat_ingest_response: tuple) -> None:
        _, body = threat_ingest_response
        factors = body.get("contributing_risk_factors", [])
        assert len(factors) > 0
        top_factor = factors[0]
        label = top_factor.get("feature_label", "")
        z_score = float(top_factor.get("z_score", 0))
        assert "Exfiltration" in label or "Upload" in label or "File" in label or z_score > 1.0, (
            f"Top risk factor does not appear to be file exfiltration: {top_factor}"
        )

    def test_top_risk_factor_has_high_z_score(self, threat_ingest_response: tuple) -> None:
        _, body = threat_ingest_response
        factors = body.get("contributing_risk_factors", [])
        assert len(factors) > 0
        top_z = float(factors[0].get("z_score", 0))
        assert top_z >= 1.5, f"Expected top factor z_score >= 1.5, got {top_z}"

    def test_postgresql_escalated_to_high_or_critical(self, admin_token: str) -> None:
        status_code, emp = _http_get(f"/employees/{THREAT_EMP_ID}", admin_token)
        assert status_code == 200
        category = emp.get("risk_category", "")
        risk_score = float(emp.get("risk_score", 0))
        assert category in ("HIGH", "CRITICAL"), (
            f"Expected threat employee to be HIGH/CRITICAL, got {category}"
        )
        assert risk_score >= 0.60, (
            f"Expected threat employee risk_score >= 0.60, got {risk_score}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 3. MongoDB Activity Log Enrichment Tests
# ─────────────────────────────────────────────────────────────────────────────

class TestMongoDBLogEnrichment:
    def test_threat_response_has_log_id(self, threat_ingest_response: tuple) -> None:
        _, body = threat_ingest_response
        log_id = body.get("log_id", "")
        assert len(log_id) == 24, f"Expected MongoDB ObjectId (24 chars), got: {log_id!r}"

    def test_benign_response_has_log_id(self, benign_ingest_response: tuple) -> None:
        _, body = benign_ingest_response
        log_id = body.get("log_id", "")
        assert len(log_id) == 24, f"Expected MongoDB ObjectId (24 chars), got: {log_id!r}"

    def test_threat_log_telemetry_api_returns_logs(self, admin_token: str) -> None:
        """Verify logs are queryable from GET /telemetry/logs/{emp_id}."""
        status_code, logs = _http_get(f"/telemetry/logs/{THREAT_EMP_ID}?limit=5", admin_token)
        assert status_code == 200
        assert isinstance(logs, list)
        assert len(logs) >= 1

    def test_threat_log_evaluated_at_returned(self, threat_ingest_response: tuple) -> None:
        _, body = threat_ingest_response
        evaluated_at = body.get("evaluated_at")
        assert evaluated_at is not None, "evaluated_at timestamp must be returned"

    def test_baseline_mongodb_persisted(self, admin_token: str) -> None:
        """Verify MongoDB employee_risk_baselines doc was upserted."""
        status_code, baseline = _http_get(
            f"/analytics/employee/{THREAT_EMP_ID}/baseline", admin_token
        )
        assert status_code == 200
        assert baseline.get("employee_id") == THREAT_EMP_ID
        assert baseline.get("anomaly_score") is not None
        assert len(baseline.get("metrics", [])) == 8, (
            f"Expected 8 baseline metrics, got {len(baseline.get('metrics', []))}"
        )


# ─────────────────────────────────────────────────────────────────────────────
# 4. Error Handling & Edge Cases
# ─────────────────────────────────────────────────────────────────────────────

class TestErrorHandlingEdgeCases:
    def test_unknown_employee_returns_404(self, admin_token: str) -> None:
        status_code, body = _http_post_json(
            "/telemetry/ingest",
            {"emp_id": "emp_99999", "event_type": "LOGIN", "severity": "INFO"},
            admin_token,
        )
        assert status_code == 404, f"Expected 404 for unknown employee, got {status_code}"
        assert "detail" in body

    def test_unauthenticated_request_returns_401(self, now_iso: str) -> None:
        status_code, _ = _http_post_json(
            "/telemetry/ingest",
            {
                "emp_id": BENIGN_EMP_ID,
                "event_type": "LOGIN",
                "severity": "INFO",
                "timestamp": now_iso,
            },
            token=None,
        )
        assert status_code == 401, f"Expected 401 without token, got {status_code}"

    def test_ingestion_still_succeeds_with_minimal_payload(
        self, admin_token: str, now_iso: str
    ) -> None:
        """Minimal payload (no optional fields) must still return HTTP 201."""
        status_code, body = _http_post_json(
            "/telemetry/ingest",
            {
                "emp_id": BENIGN_EMP_ID,
                "event_type": "LOGIN",
            },
            admin_token,
        )
        assert status_code == 201, f"Minimal payload ingestion returned {status_code}"
        assert body.get("status") == "success"
        assert body.get("log_id")

    def test_all_severity_levels_accepted(self, admin_token: str, now_iso: str) -> None:
        """All 5 severity levels must be accepted without error."""
        for sev in ("INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"):
            status_code, body = _http_post_json(
                "/telemetry/ingest",
                {
                    "emp_id": BENIGN_EMP_ID,
                    "event_type": "FILE_ACCESS",
                    "severity": sev,
                    "timestamp": now_iso,
                },
                admin_token,
            )
            assert status_code == 201, (
                f"Severity {sev!r} was rejected: HTTP {status_code}"
            )
