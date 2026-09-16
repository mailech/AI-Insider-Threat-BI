"""Tests for /api/v1/reports endpoints.

PDF and Excel generators are patched to create real (minimal) files on disk
so the FileResponse path actually exists, without requiring full report logic.
"""

from __future__ import annotations

import uuid
from pathlib import Path
from unittest.mock import patch

import pytest
from fastapi.testclient import TestClient

from app.models.investigation import Investigation


PDF_URL = "/api/v1/reports/pdf"
EXCEL_URL = "/api/v1/reports/excel"


def _write_dummy_pdf(db, output_path: Path) -> None:
    """Write a minimal valid-enough bytes blob so FileResponse can serve it."""
    output_path.write_bytes(b"%PDF-1.4 minimal dummy")


def _write_dummy_xlsx(db, output_path: Path) -> None:
    output_path.write_bytes(b"PK dummy xlsx content")


def _write_dummy_investigation_pdf(db, investigation_id: uuid.UUID, output_path: Path) -> None:
    output_path.write_bytes(b"%PDF-1.4 investigation report")


# ---------------------------------------------------------------------------
# GET /api/v1/reports/pdf
# ---------------------------------------------------------------------------

class TestPDFReport:
    @pytest.mark.parametrize("report_type", [
        "insider_threat",
        "behavioral",
        "compliance",
        "risk_assessment",
    ])
    def test_pdf_download_standard_types(
        self, client: TestClient, auth_headers: dict, report_type: str
    ):
        func_name = {
            "insider_threat": "generate_insider_threat_report",
            "behavioral": "generate_behavioral_report",
            "compliance": "generate_compliance_report",
            "risk_assessment": "generate_risk_assessment_report",
        }[report_type]

        with patch(f"app.api.v1.reports.{func_name}", side_effect=_write_dummy_pdf):
            resp = client.get(
                PDF_URL,
                params={"report_type": report_type},
                headers=auth_headers,
            )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert "attachment" in resp.headers.get("content-disposition", "")

    def test_pdf_investigation_with_id(
        self,
        client: TestClient,
        auth_headers: dict,
        sample_investigation: Investigation,
    ):
        with patch(
            "app.api.v1.reports.generate_investigation_report",
            side_effect=_write_dummy_investigation_pdf,
        ):
            resp = client.get(
                PDF_URL,
                params={
                    "report_type": "investigation",
                    "investigation_id": str(sample_investigation.id),
                },
                headers=auth_headers,
            )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"

    def test_pdf_investigation_without_id_422(
        self, client: TestClient, auth_headers: dict
    ):
        """investigation_id is required for report_type=investigation."""
        # We don't need to mock since validation happens before generator is called
        resp = client.get(
            PDF_URL,
            params={"report_type": "investigation"},
            headers=auth_headers,
        )
        assert resp.status_code == 422

    def test_pdf_default_type_is_insider_threat(
        self, client: TestClient, auth_headers: dict
    ):
        with patch(
            "app.api.v1.reports.generate_insider_threat_report",
            side_effect=_write_dummy_pdf,
        ):
            resp = client.get(PDF_URL, headers=auth_headers)
        assert resp.status_code == 200

    def test_pdf_requires_auth(self, client: TestClient):
        resp = client.get(PDF_URL)
        assert resp.status_code == 401

    def test_pdf_generator_exception_500(
        self, client: TestClient, auth_headers: dict
    ):
        def raise_error(db, path):
            raise RuntimeError("Simulated generator failure")

        with patch(
            "app.api.v1.reports.generate_insider_threat_report",
            side_effect=raise_error,
        ):
            resp = client.get(
                PDF_URL,
                params={"report_type": "insider_threat"},
                headers=auth_headers,
            )
        assert resp.status_code == 500


# ---------------------------------------------------------------------------
# GET /api/v1/reports/excel
# ---------------------------------------------------------------------------

class TestExcelReport:
    @pytest.mark.parametrize("report_type", [
        "insider_threat",
        "behavioral",
        "risk_assessment",
    ])
    def test_excel_download(
        self, client: TestClient, auth_headers: dict, report_type: str
    ):
        func_name = {
            "insider_threat": "generate_insider_threat_excel",
            "behavioral": "generate_behavioral_excel",
            "risk_assessment": "generate_risk_assessment_excel",
        }[report_type]

        with patch(f"app.api.v1.reports.{func_name}", side_effect=_write_dummy_xlsx):
            resp = client.get(
                EXCEL_URL,
                params={"report_type": report_type},
                headers=auth_headers,
            )
        assert resp.status_code == 200
        content_type = resp.headers["content-type"]
        assert "spreadsheetml" in content_type or "excel" in content_type
        assert "attachment" in resp.headers.get("content-disposition", "")

    def test_excel_default_type_is_insider_threat(
        self, client: TestClient, auth_headers: dict
    ):
        with patch(
            "app.api.v1.reports.generate_insider_threat_excel",
            side_effect=_write_dummy_xlsx,
        ):
            resp = client.get(EXCEL_URL, headers=auth_headers)
        assert resp.status_code == 200

    def test_excel_requires_auth(self, client: TestClient):
        resp = client.get(EXCEL_URL)
        assert resp.status_code == 401

    def test_excel_generator_exception_500(
        self, client: TestClient, auth_headers: dict
    ):
        def raise_error(db, path):
            raise RuntimeError("Simulated Excel generator failure")

        with patch(
            "app.api.v1.reports.generate_insider_threat_excel",
            side_effect=raise_error,
        ):
            resp = client.get(
                EXCEL_URL,
                params={"report_type": "insider_threat"},
                headers=auth_headers,
            )
        assert resp.status_code == 500
