import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

@pytest.fixture
def auth_headers():
    res = client.post(
        "/api/v1/auth/login",
        json={"email": "analyst@soc.corp", "password": "analyst123"}
    )
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_activity_ingestion_and_list(auth_headers):
    # Ingest new activity
    post_res = client.post(
        "/api/v1/activities",
        headers=auth_headers,
        json={
            "employee_id": "EMP-001",
            "activity_type": "file_access",
            "action": "confidential_file_read",
            "resource": "api_keys_2026.env",
            "severity": "Medium",
            "is_anomalous": True,
            "anomaly_reason": "Out of hours access"
        }
    )
    assert post_res.status_code == 200
    created = post_res.json()
    assert created["employee_id"] == "EMP-001"
    assert created["action"] == "confidential_file_read"
    
    # List activities
    get_res = client.get("/api/v1/activities?employee_id=EMP-001", headers=auth_headers)
    assert get_res.status_code == 200
    assert len(get_res.json()) >= 1

def test_incident_and_investigation_lifecycle(auth_headers):
    # Create incident
    inc_res = client.post(
        "/api/v1/incidents",
        headers=auth_headers,
        json={
            "title": "Suspected Credential Dumping on Workstation",
            "description": "Alert triggered from endpoint detection.",
            "severity": "High",
            "employee_id": "EMP-003",
            "assigned_analyst": "Alex Chen",
            "containment_actions": ["Isolate Host"]
        }
    )
    assert inc_res.status_code == 200
    inc_data = inc_res.json()
    inc_id = inc_data["incident_id"]
    
    # Check investigation
    inv_list = client.get("/api/v1/investigations", headers=auth_headers)
    assert inv_list.status_code == 200
    
    # Add note to investigation
    invs = inv_list.json()
    assert len(invs) > 0
    inv_id = invs[0]["investigation_id"]
    
    note_res = client.post(
        f"/api/v1/investigations/{inv_id}/notes",
        headers=auth_headers,
        json={"text": "Investigated lateral movement. No additional hosts compromised."}
    )
    assert note_res.status_code == 200

def test_export_reports(auth_headers):
    # CSV
    res_csv = client.get("/api/v1/reports/threat/csv", headers=auth_headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.headers["content-type"]
    
    # Excel
    res_excel = client.get("/api/v1/reports/threat/excel", headers=auth_headers)
    assert res_excel.status_code == 200
    assert len(res_excel.content) > 1000
    
    # PDF
    res_pdf = client.get("/api/v1/reports/threat/pdf", headers=auth_headers)
    assert res_pdf.status_code == 200
    assert len(res_pdf.content) > 1000
    assert res_pdf.content[:4] == b"%PDF"
