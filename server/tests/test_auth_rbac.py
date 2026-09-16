# test_auth_rbac.py - covers the actual security fix this project is built around:
# does every sensitive endpoint really enforce the caller's role, server-side?
# Run with: pytest (from the server/ directory)

from tests.conftest import login, auth_headers


def test_health_is_public(client):
    r = client.get("/api/health")
    assert r.status_code == 200


def test_login_success(client):
    r = login(client, "admin@activity.local", "admin123")
    assert r.status_code == 200
    assert "token" in r.get_json()


def test_login_wrong_password(client):
    r = login(client, "admin@activity.local", "wrong-password")
    assert r.status_code == 401


def test_employees_requires_auth(client):
    r = client.get("/api/employees")
    assert r.status_code == 401


def test_employees_accessible_to_admin(client):
    headers = auth_headers(client, "admin@activity.local", "admin123")
    r = client.get("/api/employees", headers=headers)
    assert r.status_code == 200
    assert len(r.get_json()) >= 15  # 5 named + at least 15 generated in the test fixture


def test_employee_role_only_sees_own_record(client):
    headers = auth_headers(client, "ravi@company.com", "employee123")
    r = client.get("/api/employees", headers=headers)
    assert r.status_code == 200
    data = r.get_json()
    assert len(data) == 1
    assert data[0]["id"] == "EMP-1042"


def test_analyst_cannot_add_employee(client):
    headers = auth_headers(client, "analyst@activity.local", "analyst123")
    r = client.post("/api/employees", headers=headers, json={"name": "X", "email": "x@company.com"})
    assert r.status_code == 403


def test_admin_can_add_employee(client):
    headers = auth_headers(client, "admin@activity.local", "admin123")
    r = client.post("/api/employees", headers=headers, json={"name": "Test User", "email": "testuser@company.com"})
    assert r.status_code == 200
    assert "temp_password" in r.get_json()


def test_analyst_cannot_resolve_alert(client):
    headers = auth_headers(client, "analyst@activity.local", "analyst123")
    r = client.post("/api/alerts/INC-2048/resolve", headers=headers)
    assert r.status_code == 403


def test_security_manager_can_resolve_alert(client):
    headers = auth_headers(client, "manager@activity.local", "manager123")
    r = client.post("/api/alerts/INC-2048/resolve", headers=headers)
    assert r.status_code == 200


def test_analyst_cannot_ingest_activity(client):
    headers = auth_headers(client, "analyst@activity.local", "analyst123")
    r = client.post("/api/activity/ingest", headers=headers, json={"employee_id": "EMP-1042", "logon_count": 900})
    assert r.status_code == 403


def test_admin_can_ingest_activity(client):
    headers = auth_headers(client, "admin@activity.local", "admin123")
    r = client.post("/api/activity/ingest", headers=headers, json={
        "employee_id": "EMP-1042", "logon_count": 1026, "after_hours_logon_count": 1113,
        "usb_connect_count": 8108, "file_copy_count": 11140, "email_count": 263,
    })
    assert r.status_code == 200
    assert "risk_score" in r.get_json()


def test_containment_blocks_login(client):
    admin_headers = auth_headers(client, "admin@activity.local", "admin123")
    r = client.post("/api/employees/EMP-1042/contain", headers=admin_headers)
    assert r.status_code == 200

    r = login(client, "ravi@company.com", "employee123")
    assert r.status_code == 403


def test_login_lockout_after_repeated_failures(client):
    for _ in range(5):
        r = login(client, "priya@company.com", "wrong-password")
    assert r.status_code == 403
    # correct password should now also be rejected while locked
    r = login(client, "priya@company.com", "employee123")
    assert r.status_code == 403


def test_audit_log_is_admin_only(client):
    analyst_headers = auth_headers(client, "analyst@activity.local", "analyst123")
    r = client.get("/api/audit-log", headers=analyst_headers)
    assert r.status_code == 403

    admin_headers = auth_headers(client, "admin@activity.local", "admin123")
    r = client.get("/api/audit-log", headers=admin_headers)
    assert r.status_code == 200
    assert len(r.get_json()) > 0


def test_report_export_requires_staff_role(client):
    r = client.get("/api/reports/high_risk_users")
    assert r.status_code == 401
    headers = auth_headers(client, "analyst@activity.local", "analyst123")
    r = client.get("/api/reports/high_risk_users", headers=headers)
    assert r.status_code == 200
    assert r.headers["Content-Type"].startswith("text/csv")
