import pytest
import io
import openpyxl
from fastapi.testclient import TestClient
from backend.app.main import app
from backend.app.core.security import create_access_token
from backend.app.services.report_generator import ReportGeneratorService
from backend.app.db.session import SessionLocal
from backend.app.models.report import Report


@pytest.fixture
def auth_headers():
    token = create_access_token(subject="admin", role="Administrator")
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture
def client():
    return TestClient(app)


def test_report_service_data_collection():
    db = SessionLocal()
    try:
        data = ReportGeneratorService.collect_data(
            db=db,
            report_type="Executive Security Summary",
            department="Engineering"
        )
        assert data["report_title"] == "Executive Security Summary"
        assert "metrics" in data
        assert "total_employees" in data["metrics"]
        assert "top_risky_employees" in data
        assert isinstance(data["top_risky_employees"], list)
    finally:
        db.close()


def test_pdf_generation_validity():
    db = SessionLocal()
    try:
        data = ReportGeneratorService.collect_data(db=db, report_type="Insider Threat Report")
        pdf_bytes = ReportGeneratorService.generate_pdf(data)
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 500
        # Check PDF magic bytes '%PDF-'
        assert pdf_bytes.startswith(b"%PDF-")
    finally:
        db.close()


def test_excel_generation_validity():
    db = SessionLocal()
    try:
        data = ReportGeneratorService.collect_data(db=db, report_type="Risk Assessment Report")
        excel_bytes = ReportGeneratorService.generate_excel(data)
        assert isinstance(excel_bytes, bytes)
        assert len(excel_bytes) > 1000

        # Verify sheets using openpyxl
        wb = openpyxl.load_workbook(io.BytesIO(excel_bytes))
        sheet_names = wb.sheetnames
        assert "Executive Summary" in sheet_names
        assert "Employees Risk Matrix" in sheet_names
        assert "Security Alerts Log" in sheet_names
        assert "Investigation Cases" in sheet_names
    finally:
        db.close()


def test_report_api_generate_preview(client, auth_headers):
    payload = {
        "report_type": "Executive Security Summary",
        "department": "ALL",
        "severity": "ALL"
    }
    response = client.post("/api/reports/generate", json=payload, headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "report_title" in data
    assert data["metrics"]["total_employees"] > 0


def test_report_api_save_and_manage_lifecycle(client, auth_headers):
    # 1. Save a new report
    save_payload = {
        "name": "Q1 2026 Executive Security Threat Briefing",
        "report_type": "Executive Security Summary",
        "date_from": "2026-01-01",
        "date_to": "2026-01-31",
        "filters": {"department": "ALL", "severity": "CRITICAL"}
    }
    create_res = client.post("/api/reports/save", json=save_payload, headers=auth_headers)
    assert create_res.status_code == 200
    report = create_res.json()
    report_id = report["report_id"]
    assert report_id.startswith("RPT-2026-")
    assert report["name"] == save_payload["name"]

    # 2. List saved reports
    list_res = client.get("/api/reports", headers=auth_headers)
    assert list_res.status_code == 200
    list_data = list_res.json()
    assert list_data["total"] >= 1
    assert any(r["report_id"] == report_id for r in list_data["reports"])

    # 3. Get single saved report
    get_res = client.get(f"/api/reports/{report_id}", headers=auth_headers)
    assert get_res.status_code == 200
    assert get_res.json()["report_id"] == report_id

    # 4. Download saved PDF
    pdf_res = client.get(f"/api/reports/{report_id}/pdf", headers=auth_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")

    # 5. Download saved Excel
    excel_res = client.get(f"/api/reports/{report_id}/excel", headers=auth_headers)
    assert excel_res.status_code == 200
    assert "spreadsheet" in excel_res.headers["content-type"]
    assert len(excel_res.content) > 1000

    # 6. Delete saved report
    del_res = client.delete(f"/api/reports/{report_id}", headers=auth_headers)
    assert del_res.status_code == 200
    assert del_res.json()["status"] == "SUCCESS"

    # 7. Verify deletion
    verify_res = client.get(f"/api/reports/{report_id}", headers=auth_headers)
    assert verify_res.status_code == 404


def test_direct_export_endpoints(client, auth_headers):
    payload = {
        "report_type": "Insider Threat Report",
        "severity": "CRITICAL"
    }

    # Direct PDF Stream
    pdf_res = client.post("/api/reports/export/pdf", json=payload, headers=auth_headers)
    assert pdf_res.status_code == 200
    assert pdf_res.headers["content-type"] == "application/pdf"
    assert pdf_res.content.startswith(b"%PDF-")

    # Direct Excel Stream
    excel_res = client.post("/api/reports/export/excel", json=payload, headers=auth_headers)
    assert excel_res.status_code == 200
    assert "spreadsheet" in excel_res.headers["content-type"]
    assert len(excel_res.content) > 1000
