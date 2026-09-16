"""Tests for /api/v1/risk endpoints.

The ML service (ml_client) is mocked so tests never make real HTTP calls.
"""

from __future__ import annotations

import uuid
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.risk import RiskBand, RiskScore


BASE_URL = "/api/v1/risk"

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_ML_RESPONSE_SINGLE = {
    "decision_function_score": -0.12,
    "predict_label": 1,
    "risk_score": 65.0,
    "risk_band": "HIGH",
}

_ML_RESPONSE_BATCH = [_ML_RESPONSE_SINGLE]


def _mock_score_single(features: dict) -> dict:
    return _ML_RESPONSE_SINGLE


def _mock_score_batch(feature_rows: list) -> list:
    return [_ML_RESPONSE_SINGLE for _ in feature_rows]


# ---------------------------------------------------------------------------
# POST /api/v1/risk/compute/{employee_id}
# ---------------------------------------------------------------------------

class TestComputeRisk:
    def test_compute_risk_success(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        with patch("app.services.ml_client.score_single", side_effect=_mock_score_single):
            resp = client.post(
                f"{BASE_URL}/compute/{sample_employee.id}",
                headers=auth_headers,
            )
        assert resp.status_code == 200
        data = resp.json()
        assert data["employee_id"] == str(sample_employee.id)
        assert data["risk_score"] == 65.0
        assert data["risk_band"] == "HIGH"
        assert "id" in data
        assert "computed_at" in data

    def test_compute_risk_nonexistent_employee_404(
        self, client: TestClient, auth_headers: dict
    ):
        with patch("app.services.ml_client.score_single", side_effect=_mock_score_single):
            resp = client.post(
                f"{BASE_URL}/compute/{uuid.uuid4()}",
                headers=auth_headers,
            )
        assert resp.status_code == 404

    def test_compute_risk_ml_unavailable_503(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        def raise_error(features):
            raise ConnectionError("ML service is down")

        with patch("app.services.ml_client.score_single", side_effect=raise_error):
            resp = client.post(
                f"{BASE_URL}/compute/{sample_employee.id}",
                headers=auth_headers,
            )
        assert resp.status_code == 503

    def test_compute_risk_requires_auth(
        self, client: TestClient, sample_employee: Employee
    ):
        resp = client.post(f"{BASE_URL}/compute/{sample_employee.id}")
        assert resp.status_code == 401

    def test_compute_risk_stores_in_database(
        self, client: TestClient, auth_headers: dict, db: Session, sample_employee: Employee
    ):
        with patch("app.services.ml_client.score_single", side_effect=_mock_score_single):
            resp = client.post(
                f"{BASE_URL}/compute/{sample_employee.id}",
                headers=auth_headers,
            )
        assert resp.status_code == 200
        score_id = uuid.UUID(resp.json()["id"])
        score = db.get(RiskScore, score_id)
        assert score is not None
        assert score.employee_id == sample_employee.id


# ---------------------------------------------------------------------------
# POST /api/v1/risk/compute-fleet
# ---------------------------------------------------------------------------

class TestComputeFleet:
    def test_compute_fleet_empty(self, client: TestClient, auth_headers: dict):
        """No employees → empty list (not an error)."""
        with patch("app.services.ml_client.score_batch", side_effect=_mock_score_batch):
            resp = client.post(f"{BASE_URL}/compute-fleet", headers=auth_headers)
        assert resp.status_code == 200
        assert isinstance(resp.json(), list)

    def test_compute_fleet_with_employee(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        with patch("app.services.ml_client.score_batch", side_effect=_mock_score_batch):
            resp = client.post(f"{BASE_URL}/compute-fleet", headers=auth_headers)
        assert resp.status_code == 200
        results = resp.json()
        assert len(results) >= 1
        emp_ids = [r["employee_id"] for r in results]
        assert str(sample_employee.id) in emp_ids

    def test_compute_fleet_ml_unavailable_503(
        self, client: TestClient, auth_headers: dict, sample_employee: Employee
    ):
        def raise_error(rows):
            raise ConnectionError("ML service is down")

        with patch("app.services.ml_client.score_batch", side_effect=raise_error):
            resp = client.post(f"{BASE_URL}/compute-fleet", headers=auth_headers)
        assert resp.status_code == 503

    def test_compute_fleet_requires_auth(self, client: TestClient):
        resp = client.post(f"{BASE_URL}/compute-fleet")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/risk/fleet-summary
# ---------------------------------------------------------------------------

class TestFleetSummary:
    def test_fleet_summary_shape(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_risk_score: RiskScore,
    ):
        resp = client.get(f"{BASE_URL}/fleet-summary", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert "total_scored" in data
        assert "fleet_average_score" in data
        assert "band_distribution" in data
        assert "results" in data
        assert "service_available" in data

    def test_fleet_summary_includes_scored_employee(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_employee: Employee,
        sample_risk_score: RiskScore,
    ):
        resp = client.get(f"{BASE_URL}/fleet-summary", headers=auth_headers)
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_scored"] >= 1
        result_ids = [r["employee_id"] for r in data["results"]]
        assert str(sample_employee.id) in result_ids

    def test_fleet_summary_sorted_by_risk_desc(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_risk_score: RiskScore,
    ):
        resp = client.get(f"{BASE_URL}/fleet-summary", headers=auth_headers)
        assert resp.status_code == 200
        scores = [r["risk_score"] for r in resp.json()["results"]]
        assert scores == sorted(scores, reverse=True)

    def test_fleet_summary_requires_auth(self, client: TestClient):
        resp = client.get(f"{BASE_URL}/fleet-summary")
        assert resp.status_code == 401


# ---------------------------------------------------------------------------
# GET /api/v1/risk/employee/{employee_id}/history
# ---------------------------------------------------------------------------

class TestRiskHistory:
    def test_history_returns_list(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_employee: Employee,
        sample_risk_score: RiskScore,
    ):
        resp = client.get(
            f"{BASE_URL}/employee/{sample_employee.id}/history",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) >= 1

    def test_history_contains_score_fields(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_employee: Employee,
        sample_risk_score: RiskScore,
    ):
        resp = client.get(
            f"{BASE_URL}/employee/{sample_employee.id}/history",
            headers=auth_headers,
        )
        assert resp.status_code == 200
        entry = resp.json()[0]
        assert "risk_score" in entry
        assert "risk_band" in entry
        assert "computed_at" in entry

    def test_history_nonexistent_employee_404(
        self, client: TestClient, auth_headers: dict
    ):
        resp = client.get(
            f"{BASE_URL}/employee/{uuid.uuid4()}/history",
            headers=auth_headers,
        )
        assert resp.status_code == 404

    def test_history_limit_param(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_employee: Employee,
        sample_risk_score: RiskScore,
    ):
        resp = client.get(
            f"{BASE_URL}/employee/{sample_employee.id}/history",
            params={"limit": 1},
            headers=auth_headers,
        )
        assert resp.status_code == 200
        assert len(resp.json()) <= 1

    def test_history_requires_auth(
        self, client: TestClient, sample_employee: Employee
    ):
        resp = client.get(f"{BASE_URL}/employee/{sample_employee.id}/history")
        assert resp.status_code == 401
