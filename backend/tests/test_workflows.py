"""End-to-end platform workflows: ingestion, investigation, reports (modules 3, 7, 9, 12)."""
import io
from datetime import datetime, timedelta, timezone

import pytest


@pytest.fixture(scope="module")
def onboarded(client, manager_headers, admin_headers):
    """A fresh employee created through the API."""
    department = client.post(
        "/api/v1/departments",
        headers=manager_headers,
        json={"name": "Workflow Dept", "code": "WFD"},
    )
    assert department.status_code == 201
    response = client.post(
        "/api/v1/employees",
        headers=manager_headers,
        json={
            "employee_code": "WF0001",
            "full_name": "Workflow Person",
            "email": "workflow@test.io",
            "department_id": department.json()["id"],
            "designation": "Analyst",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_employee_onboarding_and_lookup(client, analyst_headers, onboarded):
    detail = client.get(f"/api/v1/employees/{onboarded['id']}", headers=analyst_headers)
    assert detail.status_code == 200
    body = detail.json()
    assert body["employee_code"] == "WF0001"
    assert body["department_name"] == "Workflow Dept"


def test_duplicate_employee_code_is_rejected(client, manager_headers, onboarded):
    response = client.post(
        "/api/v1/employees",
        headers=manager_headers,
        json={"employee_code": "WF0001", "full_name": "Clone", "email": "clone@test.io"},
    )
    assert response.status_code == 409


def test_analyst_cannot_onboard_employees(client, analyst_headers):
    response = client.post(
        "/api/v1/employees",
        headers=analyst_headers,
        json={"employee_code": "NOPE1", "full_name": "Nope", "email": "nope@test.io"},
    )
    assert response.status_code == 403


def test_batch_ingestion_enriches_derived_flags(client, soc_headers, onboarded):
    midnight = (datetime.now(timezone.utc) - timedelta(days=1)).replace(hour=2, minute=0, second=0)
    response = client.post(
        "/api/v1/activity/ingest",
        headers=soc_headers,
        json={
            "run_detection": False,
            "events": [
                {
                    "employee_id": onboarded["id"],
                    "activity_type": "file_download",
                    "log_source": "proxy",
                    "event_time": midnight.isoformat(),
                    "resource": "/data/export.csv",
                    "bytes_transferred": 1048576,
                    "device_id": "LAP-WF01",
                }
            ],
        },
    )
    assert response.status_code == 200, response.text
    assert response.json()["ingested"] == 1

    events = client.get(
        f"/api/v1/activity/events?employee_id={onboarded['id']}", headers=soc_headers
    ).json()
    assert events["total"] >= 1
    # 02:00 is outside the 08:00-19:00 working window.
    assert events["items"][0]["is_after_hours"] is True


def test_ingestion_reports_unknown_employees(client, soc_headers):
    response = client.post(
        "/api/v1/activity/ingest",
        headers=soc_headers,
        json={
            "run_detection": False,
            "events": [
                {
                    "employee_code": "DOES-NOT-EXIST",
                    "activity_type": "login",
                    "event_time": datetime.now(timezone.utc).isoformat(),
                }
            ],
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["ingested"] == 0 and body["skipped"] == 1
    assert body["errors"]


def test_csv_upload_maps_foreign_column_names(client, soc_headers, onboarded):
    csv = (
        "user,activity,date,pc,filename,size\n"
        f"WF0001,logon,2026-08-01 09:00:00,PC-1,,0\n"
        f"WF0001,file_copy,2026-08-01 22:30:00,PC-1,/secret/data.xlsx,52428800\n"
    )
    response = client.post(
        "/api/v1/activity/upload?run_detection=false",
        headers=soc_headers,
        files={"file": ("cert_export.csv", io.BytesIO(csv.encode()), "text/csv")},
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["ingested"] == 2, body


def test_csv_upload_rejects_non_csv(client, soc_headers):
    response = client.post(
        "/api/v1/activity/upload",
        headers=soc_headers,
        files={"file": ("notes.txt", io.BytesIO(b"nope"), "text/plain")},
    )
    assert response.status_code == 400


# ------------------------------------------------- investigation workflow
@pytest.fixture(scope="module")
def incident(client, analyst_headers, onboarded):
    response = client.post(
        "/api/v1/investigations",
        headers=analyst_headers,
        json={
            "employee_id": onboarded["id"],
            "title": "Suspected data staging",
            "summary": "Large off-hours export followed by removable media use.",
            "severity": "high",
            "auto_build_timeline": True,
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_incident_is_created_with_a_reference_and_timeline(incident):
    assert incident["reference"].startswith("INC-")
    assert incident["status"] == "open"
    assert incident["severity"] == "high"
    # Creation always records at least the opening entry.
    assert len(incident["timeline"]) >= 1


def test_investigation_workflow_transitions(client, analyst_headers, incident):
    incident_id = incident["id"]

    started = client.patch(
        f"/api/v1/investigations/{incident_id}",
        headers=analyst_headers,
        json={"status": "investigating"},
    )
    assert started.status_code == 200
    assert started.json()["status"] == "investigating"
    # First response time is stamped on the first move away from open.
    assert started.json()["first_response_at"] is not None

    resolved = client.patch(
        f"/api/v1/investigations/{incident_id}",
        headers=analyst_headers,
        json={"status": "resolved", "resolution": "Confirmed and contained", "outcome": "confirmed_threat"},
    )
    assert resolved.status_code == 200
    assert resolved.json()["resolved_at"] is not None


def test_invalid_workflow_transition_is_refused(client, analyst_headers, incident):
    """A resolved incident cannot jump straight back to contained."""
    response = client.patch(
        f"/api/v1/investigations/{incident['id']}",
        headers=analyst_headers,
        json={"status": "contained"},
    )
    assert response.status_code == 409


def test_notes_and_evidence_are_recorded(client, analyst_headers, incident):
    incident_id = incident["id"]

    note = client.post(
        f"/api/v1/investigations/{incident_id}/notes",
        headers=analyst_headers,
        json={"body": "Verified the export against the change ticket."},
    )
    assert note.status_code == 201

    evidence = client.post(
        f"/api/v1/investigations/{incident_id}/evidence",
        headers=analyst_headers,
        json={"title": "Proxy log extract", "evidence_type": "log", "payload": "raw log line"},
    )
    assert evidence.status_code == 201
    # Evidence is hashed so its integrity can be demonstrated later.
    assert len(evidence.json()["hash_value"]) == 64

    detail = client.get(f"/api/v1/investigations/{incident_id}", headers=analyst_headers).json()
    assert len(detail["notes"]) >= 1
    assert len(detail["evidence"]) >= 1


def test_escalation_notifies_the_target(client, analyst_headers, manager_headers, users, incident):
    manager_id = users["security_manager"].id
    response = client.post(
        f"/api/v1/investigations/{incident['id']}/escalate",
        headers=analyst_headers,
        json={"escalated_to_id": manager_id, "reason": "Requires HR and legal involvement"},
    )
    assert response.status_code == 200
    assert response.json()["escalated"] is True

    inbox = client.get("/api/v1/notifications", headers=manager_headers).json()
    assert any("escalated" in item["title"].lower() for item in inbox["items"])


# --------------------------------------------------------------- reports
@pytest.mark.parametrize(
    "report_type",
    ["insider_threat", "behavioral_analytics", "investigation", "compliance", "risk_assessment"],
)
def test_report_preview_returns_summary_and_tables(client, analyst_headers, report_type):
    response = client.get(f"/api/v1/reports/{report_type}?days=90", headers=analyst_headers)
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["meta"]["report_type"] == report_type
    assert "summary" in body and "tables" in body


def test_unknown_report_type_is_rejected(client, analyst_headers):
    assert client.get("/api/v1/reports/not_a_report", headers=analyst_headers).status_code == 400


def test_pdf_export_returns_a_pdf(client, analyst_headers):
    response = client.get(
        "/api/v1/reports/insider_threat/export?format=pdf&days=90", headers=analyst_headers
    )
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF-")
    assert "attachment" in response.headers["content-disposition"]


def test_excel_export_returns_a_workbook(client, analyst_headers):
    response = client.get(
        "/api/v1/reports/risk_assessment/export?format=excel", headers=analyst_headers
    )
    assert response.status_code == 200
    assert response.content.startswith(b"PK")


def test_dashboards_render_for_each_role(client, analyst_headers, soc_headers, manager_headers, admin_headers):
    assert client.get("/api/v1/dashboards/analyst", headers=analyst_headers).json()["kpis"]
    assert client.get("/api/v1/dashboards/soc", headers=soc_headers).json()["kpis"]
    assert client.get("/api/v1/dashboards/manager", headers=manager_headers).json()["kpis"]
    assert client.get("/api/v1/dashboards/admin", headers=admin_headers).json()["kpis"]


def test_health_endpoint(client):
    body = client.get("/health").json()
    assert body["status"] == "healthy"
    assert body["database"] == "connected"
