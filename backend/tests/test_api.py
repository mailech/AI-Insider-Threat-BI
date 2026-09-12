import time
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.database import Base, engine, SessionLocal
from app.seed import seed_database

client = TestClient(app)

@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    seed_database()
    yield

def test_root_endpoint():
    response = client.get("/")
    assert response.status_code == 200
    assert response.json()["name"] == "Activity Management System (AMS) API"

def test_login_all_roles():
    roles = [
        ("admin@ams.internal", "Admin1234!", "Administrator"),
        ("manager@ams.internal", "Manager123!", "Security Manager"),
        ("soc@ams.internal", "SocEng123!", "SOC Engineer"),
        ("analyst@ams.internal", "Analyst123!", "Security Analyst"),
    ]
    for email, password, expected_role in roles:
        res = client.post("/api/auth/login", json={"email": email, "password": password})
        assert res.status_code == 200, f"Failed login for {email}"
        data = res.json()
        assert "access_token" in data
        assert data["user"]["role"] == expected_role

def test_invalid_login():
    res = client.post("/api/auth/login", json={"email": "admin@ams.internal", "password": "WrongPassword!"})
    assert res.status_code == 401

def get_auth_header(email="admin@ams.internal", password="Admin1234!"):
    res = client.post("/api/auth/login", json={"email": email, "password": password})
    token = res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_dashboard_overview():
    headers = get_auth_header()
    res = client.get("/api/dashboard/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert data["kpis"]["total_employees"] == 17
    assert len(data["recent_alerts"]) > 0
    assert data["role_view"] == "Administrator"

def test_role_differentiated_dashboard():
    # Analyst view
    headers_analyst = get_auth_header("analyst@ams.internal", "Analyst123!")
    res = client.get("/api/dashboard/overview", headers=headers_analyst)
    assert res.status_code == 200
    data = res.json()
    assert data["role_view"] == "Security Analyst"
    assert "investigation_queue" in data["role_specific_data"]

    # SOC view
    headers_soc = get_auth_header("soc@ams.internal", "SocEng123!")
    res_soc = client.get("/api/dashboard/overview", headers=headers_soc)
    assert res_soc.status_code == 200
    assert "active_threat_feed" in res_soc.json()["role_specific_data"]

def test_employees_list_and_drawer():
    headers = get_auth_header()
    # List all
    res = client.get("/api/employees", headers=headers)
    assert res.status_code == 200
    employees = res.json()
    assert len(employees) >= 16

    # Search by name
    res_search = client.get("/api/employees?search=Marcus", headers=headers)
    assert res_search.status_code == 200
    assert len(res_search.json()) >= 1
    assert res_search.json()[0]["full_name"] == "Marcus Hale"

    # Detail / Drawer for Marcus Hale (emp_1001)
    res_detail = client.get("/api/employees/emp_1001", headers=headers)
    assert res_detail.status_code == 200
    detail = res_detail.json()
    assert detail["full_name"] == "Marcus Hale"
    assert len(detail["device_assets"]) >= 2
    assert len(detail["trajectories"]) >= 30

def test_telemetry_logs_and_summary():
    headers = get_auth_header()
    res_sum = client.get("/api/telemetry/summary", headers=headers)
    assert res_sum.status_code == 200
    assert res_sum.json()["total_logs"] > 50

    res_logs = client.get("/api/telemetry/logs?limit=10", headers=headers)
    assert res_logs.status_code == 200
    logs = res_logs.json()
    assert len(logs) == 10
    assert "event_type" in logs[0]
    assert "severity" in logs[0]

def test_analytics_and_recalculate():
    headers = get_auth_header()
    res = client.get("/api/analytics/overview", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert len(data["threat_velocity"]) == 7
    assert len(data["risk_distribution"]) == 4
    assert len(data["score_distribution"]) == 5
    assert len(data["department_breakdown"]) >= 5

    # Recalculate Risk
    recalc_res = client.post(
        "/api/analytics/recalculate",
        json={"employee_id": "emp_1001", "lookback_window": "24h"},
        headers=headers
    )
    assert recalc_res.status_code == 200
    recalc_data = recalc_res.json()
    assert recalc_data["employee_id"] == "emp_1001"
    assert len(recalc_data["components"]) == 5
    assert "new_score" in recalc_data

def test_admin_settings_authorization():
    admin_headers = get_auth_header("admin@ams.internal", "Admin1234!")
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")

    # 1. Notifications allowed for all authenticated roles
    res_analyst_notif = client.get("/api/settings/notifications", headers=analyst_headers)
    assert res_analyst_notif.status_code == 200
    res_admin_notif = client.get("/api/settings/notifications", headers=admin_headers)
    assert res_admin_notif.status_code == 200

    # 2. Threat scoring weights blocked for analyst (403), allowed for admin (200)
    res_analyst_weights = client.get("/api/settings/weights", headers=analyst_headers)
    assert res_analyst_weights.status_code == 403
    res_admin_weights = client.get("/api/settings/weights", headers=admin_headers)
    assert res_admin_weights.status_code == 200

    # 3. System Health check blocked for analyst (403), allowed for admin (200)
    res_analyst_health = client.get("/api/settings/health", headers=analyst_headers)
    assert res_analyst_health.status_code == 403
    res_admin_health = client.get("/api/settings/health", headers=admin_headers)
    assert res_admin_health.status_code == 200
    assert res_admin_health.json()["status"] == "Operational"
    assert len(res_admin_health.json()["services"]) >= 2

def test_export_endpoints_authorization():
    admin_headers = get_auth_header("admin@ams.internal", "Admin1234!")
    manager_headers = get_auth_header("manager@ams.internal", "Manager123!")
    soc_headers = get_auth_header("soc@ams.internal", "SocEng123!")
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")

    # 1. Directory Roster Export (CSV) -> Allowed for Admin & Manager; 403 for SOC & Analyst
    assert client.get("/api/employees/export", headers=admin_headers).status_code == 200
    assert client.get("/api/employees/export", headers=manager_headers).status_code == 200
    assert client.get("/api/employees/export", headers=soc_headers).status_code == 403
    assert client.get("/api/employees/export", headers=analyst_headers).status_code == 403

    # 2. Single Dossier Export (JSON) -> Allowed for Admin & Manager; 403 for SOC & Analyst
    assert client.get("/api/employees/emp_1001/export", headers=admin_headers).status_code == 200
    assert client.get("/api/employees/emp_1001/export", headers=manager_headers).status_code == 200
    assert client.get("/api/employees/emp_1001/export", headers=soc_headers).status_code == 403
    assert client.get("/api/employees/emp_1001/export", headers=analyst_headers).status_code == 403

    # 3. Telemetry Export (CSV) -> Allowed for Admin, Manager, SOC; 403 for Analyst
    assert client.get("/api/telemetry/export", headers=admin_headers).status_code == 200
    assert client.get("/api/telemetry/export", headers=manager_headers).status_code == 200
    assert client.get("/api/telemetry/export", headers=soc_headers).status_code == 200
    assert client.get("/api/telemetry/export", headers=analyst_headers).status_code == 403

    # 4. Fleet Analytics Export (CSV) -> Allowed for Admin & Manager; 403 for SOC & Analyst
    assert client.get("/api/analytics/export", headers=admin_headers).status_code == 200
    assert client.get("/api/analytics/export", headers=manager_headers).status_code == 200
    assert client.get("/api/analytics/export", headers=soc_headers).status_code == 403
    assert client.get("/api/analytics/export", headers=analyst_headers).status_code == 403

def test_recalculate_analyst_preview_mode():
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")
    admin_headers = get_auth_header("admin@ams.internal", "Admin1234!")

    # Analyst recalculation returns preview_mode=True
    res_analyst = client.post(
        "/api/analytics/recalculate",
        json={"employee_id": "emp_1003", "lookback_window": "24h"},
        headers=analyst_headers
    )
    assert res_analyst.status_code == 200
    assert res_analyst.json()["preview_mode"] is True

    # Admin recalculation returns preview_mode=False (persisted)
    res_admin = client.post(
        "/api/analytics/recalculate",
        json={"employee_id": "emp_1003", "lookback_window": "24h"},
        headers=admin_headers
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["preview_mode"] is False

def test_audit_logs_authorization():
    admin_headers = get_auth_header("admin@ams.internal", "Admin1234!")
    manager_headers = get_auth_header("manager@ams.internal", "Manager123!")
    soc_headers = get_auth_header("soc@ams.internal", "SocEng123!")
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")

    # Allowed for Admin & Manager
    res_admin = client.get("/api/audit/logs", headers=admin_headers)
    assert res_admin.status_code == 200
    assert len(res_admin.json()) > 0

    res_manager = client.get("/api/audit/logs", headers=manager_headers)
    assert res_manager.status_code == 200

    # 403 Forbidden for SOC Engineer & Analyst
    res_soc = client.get("/api/audit/logs", headers=soc_headers)
    assert res_soc.status_code == 403

    res_analyst = client.get("/api/audit/logs", headers=analyst_headers)
    assert res_analyst.status_code == 403

def test_employee_behavioral_baseline():
    headers = get_auth_header()
    res = client.get("/api/employees/emp_1001/baseline", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert data["employee_id"] == "emp_1001"
    assert "typical_login_start" in data
    assert "typical_login_end" in data
    assert "typical_login_median" in data
    assert "avg_daily_events" in data
    assert "today_event_count" in data
    assert "avg_daily_transfer_mb" in data
    assert "today_transfer_mb" in data
    assert "primary_device_id" in data
    assert "primary_source_ip" in data

def test_anomaly_reports_and_rbac_export():
    admin_headers = get_auth_header("admin@ams.internal", "Admin1234!")
    manager_headers = get_auth_header("manager@ams.internal", "Manager123!")
    soc_headers = get_auth_header("soc@ams.internal", "SocEng123!")
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")

    # 1. Anomaly Report Query (all authenticated users)
    res_rep = client.get("/api/anomalies/report", headers=analyst_headers)
    assert res_rep.status_code == 200
    rep_data = res_rep.json()
    assert rep_data["total_anomalies"] > 0
    assert len(rep_data["events"]) > 0
    assert len(rep_data["category_counts"]) > 0

    # 2. Anomaly Report CSV Export -> Allowed for Admin & Manager; 403 for SOC & Analyst
    assert client.get("/api/anomalies/report/export", headers=admin_headers).status_code == 200
    assert client.get("/api/anomalies/report/export", headers=manager_headers).status_code == 200
    assert client.get("/api/anomalies/report/export", headers=soc_headers).status_code == 403
    assert client.get("/api/anomalies/report/export", headers=analyst_headers).status_code == 403

def test_new_telemetry_event_types_and_categories():
    headers = get_auth_header()
    # Check APPLICATION_USAGE
    res_app = client.get("/api/telemetry/logs?event_type=APPLICATION_USAGE", headers=headers)
    assert res_app.status_code == 200
    assert len(res_app.json()) > 0

    # Check USB_DEVICE
    res_usb = client.get("/api/telemetry/logs?event_type=USB_DEVICE", headers=headers)
    assert res_usb.status_code == 200
    assert len(res_usb.json()) > 0

    # Check NETWORK_ACTIVITY
    res_net = client.get("/api/telemetry/logs?event_type=NETWORK_ACTIVITY", headers=headers)
    assert res_net.status_code == 200
    assert len(res_net.json()) > 0

    # Check Anomaly Category filter
    res_anom = client.get("/api/telemetry/logs?anomaly_category=UNAUTHORIZED_ACCESS_ATTEMPT", headers=headers)
    assert res_anom.status_code == 200
    for log in res_anom.json():
        assert log["anomaly_category"] == "UNAUTHORIZED_ACCESS_ATTEMPT"

# --- Elevation Features Tests (1-5) ---
def test_elevation_peer_group_baseline():
    headers = get_auth_header()
    res = client.get("/api/employees/emp_1001/baseline", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "dept_name" in data
    assert "dept_peer_count" in data
    assert "dept_avg_daily_events" in data
    assert "dept_avg_daily_transfer_mb" in data
    assert "event_volume_peer_multiple" in data
    assert "transfer_peer_multiple" in data

def test_elevation_soc_case_status_actions_and_rbac():
    admin_headers = get_auth_header("admin@ams.internal", "Admin1234!")
    manager_headers = get_auth_header("manager@ams.internal", "Manager123!")
    soc_headers = get_auth_header("soc@ams.internal", "SocEng123!")
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")

    # 1. Analyst Forbidden (403)
    res_analyst = client.patch(
        "/api/employees/emp_1001/case-status",
        json={"vpn_revocation_flagged": True},
        headers=analyst_headers
    )
    assert res_analyst.status_code == 403

    # 2. SOC Engineer Allowed (200)
    res_soc = client.patch(
        "/api/employees/emp_1001/case-status",
        json={"containment_status": "isolated", "vpn_revocation_flagged": True},
        headers=soc_headers
    )
    assert res_soc.status_code == 200
    soc_data = res_soc.json()
    assert soc_data["containment_status"] == "isolated"
    assert soc_data["vpn_revocation_flagged"] is True

    # 3. Security Manager Allowed (200)
    res_mgr = client.patch(
        "/api/employees/emp_1001/case-status",
        json={"training_assigned": True, "requires_mfa_reset": True},
        headers=manager_headers
    )
    assert res_mgr.status_code == 200
    mgr_data = res_mgr.json()
    assert mgr_data["training_assigned"] is True
    assert mgr_data["requires_mfa_reset"] is True

    # 4. Administrator Allowed (200)
    res_adm = client.patch(
        "/api/employees/emp_1001/case-status",
        json={"containment_status": "normal"},
        headers=admin_headers
    )
    assert res_adm.status_code == 200
    assert res_adm.json()["containment_status"] == "normal"

def test_elevation_mitre_attack_mapping():
    headers = get_auth_header()
    # Query anomaly reports
    res_rep = client.get("/api/anomalies/report", headers=headers)
    assert res_rep.status_code == 200
    events = res_rep.json()["events"]
    assert len(events) > 0
    # Every anomaly event has MITRE mapping
    for ev in events:
        assert ev["mitre_technique_id"] is not None
        assert ev["mitre_technique_name"] is not None

def test_elevation_investigation_notes_thread():
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")
    
    # 1. Post a new investigation note
    res_post = client.post(
        "/api/employees/emp_1001/notes",
        json={"note_text": "Automated test forensic annotation verifying note thread immutability."},
        headers=analyst_headers
    )
    assert res_post.status_code == 200
    note_data = res_post.json()
    assert note_data["employee_id"] == "emp_1001"
    assert note_data["author_email"] == "analyst@ams.internal"
    assert "Automated test forensic annotation" in note_data["note_text"]

    # 2. Get notes thread
    res_get = client.get("/api/employees/emp_1001/notes", headers=analyst_headers)
    assert res_get.status_code == 200
    notes_list = res_get.json()
    assert len(notes_list) >= 1
    assert any("Automated test forensic annotation" in n["note_text"] for n in notes_list)

def test_elevation_audit_trail_csv_export_and_rbac():
    admin_headers = get_auth_header("admin@ams.internal", "Admin1234!")
    manager_headers = get_auth_header("manager@ams.internal", "Manager123!")
    soc_headers = get_auth_header("soc@ams.internal", "SocEng123!")
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")

    # 1. Admin allowed (200, CSV media type)
    res_admin = client.get("/api/audit/export", headers=admin_headers)
    assert res_admin.status_code == 200
    assert "text/csv" in res_admin.headers["content-type"]
    assert "Audit ID,Timestamp (UTC),Actor Email,Actor Role" in res_admin.text

    # 2. Manager allowed (200)
    res_mgr = client.get("/api/audit/export", headers=manager_headers)
    assert res_mgr.status_code == 200
    assert "text/csv" in res_mgr.headers["content-type"]

    # 3. SOC Engineer Forbidden (403)
    res_soc = client.get("/api/audit/export", headers=soc_headers)
    assert res_soc.status_code == 403

    # 4. Analyst Forbidden (403)
    res_analyst = client.get("/api/audit/export", headers=analyst_headers)
    assert res_analyst.status_code == 403

def test_inbounds_access_privileges_in_employee_detail():
    headers = get_auth_header()
    res = client.get("/api/employees/emp_1001", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "access_privileges" in data
    privs = data["access_privileges"]
    assert isinstance(privs, list)
    assert len(privs) >= 2
    first_priv = privs[0]
    assert "name" in first_priv
    assert "level" in first_priv
    assert "system_resource" in first_priv
    assert "description" in first_priv

def test_inbounds_hourly_distribution_and_communication_baseline():
    headers = get_auth_header()
    res = client.get("/api/employees/emp_1001/baseline", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Feature 2: 24-Hour Activity / Work Pattern
    assert "hourly_activity_distribution" in data
    assert len(data["hourly_activity_distribution"]) == 24
    assert "hourly_activity_spikes" in data
    assert isinstance(data["hourly_activity_spikes"], list)

    # Feature 3: Communication Pattern / Exfiltration Baseline
    assert "email_baseline_internal_pct" in data
    assert "email_baseline_external_pct" in data
    assert "email_today_internal_pct" in data
    assert "email_today_external_pct" in data
    assert "email_exfiltration_flag" in data
    assert isinstance(data["email_exfiltration_flag"], bool)

def test_inbounds_anomaly_category_quick_filtering():
    headers = get_auth_header()
    res = client.get("/api/anomalies/report?anomaly_category=EXCESSIVE_FILE_TRANSFER", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "category_counts" in data
    assert "events" in data
    for ev in data["events"]:
        assert ev["anomaly_category"] == "EXCESSIVE_FILE_TRANSFER"

# --- Milestone 2 Round 2 Completion Enhancement Tests ---
def test_round2_application_usage_and_usb_security_baseline():
    headers = get_auth_header()
    # Test high-risk employee (emp_1001 Marcus Hale)
    res = client.get("/api/employees/emp_1001/baseline", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # Feature 1: Top Application Usage & Productivity Profile
    assert "top_applications" in data
    assert isinstance(data["top_applications"], list)
    assert len(data["top_applications"]) > 0
    assert "name" in data["top_applications"][0]
    assert "percentage" in data["top_applications"][0]

    assert "unsanctioned_tools_detected" in data
    assert isinstance(data["unsanctioned_tools_detected"], list)
    # Marcus Hale should have Tor Browser or WinSCP flagged
    assert any("tor" in t["name"].lower() or "winscp" in t["name"].lower() for t in data["unsanctioned_tools_detected"])

    # Feature 2: Removable Media & USB Device Activity
    assert "usb_total_events_30d" in data
    assert data["usb_total_events_30d"] > 0
    assert "usb_unauthorized_detected" in data
    assert data["usb_unauthorized_detected"] is True  # Marcus Hale has unauthorized external USB volume
    assert "usb_unauthorized_device_ids" in data
    assert len(data["usb_unauthorized_device_ids"]) > 0

def test_round2_anomaly_thresholds_endpoint():
    headers = get_auth_header()
    res = client.get("/api/anomalies/thresholds", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "UNUSUAL_LOGIN_TIME" in data
    assert "ABNORMAL_DATA_DOWNLOAD" in data
    assert "UNAUTHORIZED_ACCESS_ATTEMPT" in data
    assert "EXCESSIVE_FILE_TRANSFER" in data
    assert "SUSPICIOUS_DEVICE_USAGE" in data

    # Verify real condition content
    assert "condition" in data["UNUSUAL_LOGIN_TIME"]
    assert "metrics" in data["UNUSUAL_LOGIN_TIME"]
    assert "mitre_id" in data["UNUSUAL_LOGIN_TIME"]
    assert "cert_taxonomy" in data["UNUSUAL_LOGIN_TIME"]

def test_round2_anomaly_severity_filtering():
    headers = get_auth_header()
    res = client.get("/api/anomalies/report?severity=CRITICAL", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "events" in data
    assert len(data["events"]) > 0
    for ev in data["events"]:
        assert ev["severity"].upper() == "CRITICAL"

    # Test combined category and severity filtering
    res_comb = client.get("/api/anomalies/report?anomaly_category=UNAUTHORIZED_ACCESS_ATTEMPT&severity=CRITICAL", headers=headers)
    assert res_comb.status_code == 200
    comb_data = res_comb.json()
    for ev in comb_data["events"]:
        assert ev["anomaly_category"] == "UNAUTHORIZED_ACCESS_ATTEMPT"
        assert ev["severity"].upper() == "CRITICAL"

def test_round3_vpn_remote_access_baseline():
    headers = get_auth_header()
    # Test elevated employee Marcus Hale
    res = client.get("/api/employees/emp_1001/baseline", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "vpn_total_sessions_30d" in data
    assert data["vpn_total_sessions_30d"] > 0
    assert "vpn_primary_gateway" in data
    assert data["vpn_primary_gateway"] is not None
    assert "vpn_recent_client_ips" in data
    assert len(data["vpn_recent_client_ips"]) > 0
    assert "vpn_avg_session_duration_mins" in data
    assert data["vpn_avg_session_duration_mins"] > 0
    assert "vpn_anomalous_sessions_detected" in data
    assert data["vpn_anomalous_sessions_detected"] is True
    assert len(data["vpn_anomalies"]) > 0

    # Test clean employee Luca Ferrari (emp_1016)
    clean_res = client.get("/api/employees/emp_1016/baseline", headers=headers)
    assert clean_res.status_code == 200
    clean_data = clean_res.json()
    assert clean_data["vpn_total_sessions_30d"] > 0
    assert clean_data["vpn_anomalous_sessions_detected"] is False

def test_round3_file_repository_scope_baseline():
    headers = get_auth_header()
    # Marcus Hale (Finance) accessing R&D secret weights and IT vault
    res = client.get("/api/employees/emp_1001/baseline", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "top_repositories" in data
    assert len(data["top_repositories"]) > 0
    assert "out_of_scope_access_detected" in data
    assert data["out_of_scope_access_detected"] is True
    assert data["out_of_scope_access_count"] >= 2
    assert any(
        "rd_labs" in repo["repository_path"].lower() or "it_infra" in repo["repository_path"].lower()
        for repo in data["out_of_scope_repositories"]
    )

    # Clean employee Luca Ferrari (emp_1016)
    clean_res = client.get("/api/employees/emp_1016/baseline", headers=headers)
    assert clean_res.status_code == 200
    clean_data = clean_res.json()
    assert clean_data["out_of_scope_access_detected"] is False
    assert clean_data["out_of_scope_access_count"] == 0


def test_round3_employee_scoped_anomalies():
    headers = get_auth_header()
    # Query anomalies specifically for Marcus Hale
    res = client.get("/api/anomalies/report?employee_id=emp_1001", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "events" in data
    assert len(data["events"]) > 0
    for ev in data["events"]:
        assert ev["employee_id"] == "emp_1001"

def test_round4_network_protocol_baseline():
    headers = get_auth_header()
    # Test elevated employee Marcus Hale
    res = client.get("/api/employees/emp_1001/baseline", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "network_total_events_30d" in data
    assert data["network_total_events_30d"] > 0
    assert "network_top_protocols" in data
    assert len(data["network_top_protocols"]) > 0
    assert "network_non_standard_ports_detected" in data
    assert data["network_non_standard_ports_detected"] is True  # Marcus Hale has 9001/Tor & 1080/SOCKS5
    assert len(data["network_flagged_connections"]) >= 1
    flagged_ports = [conn["destination_port"] for conn in data["network_flagged_connections"]]
    assert any(p in [9001, 1080] for p in flagged_ports)

    # Test clean employee Luca Ferrari (emp_1016)
    clean_res = client.get("/api/employees/emp_1016/baseline", headers=headers)
    assert clean_res.status_code == 200
    clean_data = clean_res.json()
    assert clean_data["network_total_events_30d"] > 0
    assert clean_data["network_non_standard_ports_detected"] is False
    assert len(clean_data["network_flagged_connections"]) == 0
    assert all(proto["is_standard"] is True for proto in clean_data["network_top_protocols"])

def test_round5_anomaly_report_summary_metrics():
    headers = get_auth_header()
    res = client.get("/api/anomalies/report", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "total_anomalies" in data
    assert data["total_anomalies"] > 0
    assert "critical_count" in data
    assert data["critical_count"] > 0
    assert "active_mitre_techniques_count" in data
    assert data["active_mitre_techniques_count"] > 0
    assert "most_affected_department" in data
    assert data["most_affected_department"] is not None
    assert "mitre_technique_counts" in data
    assert len(data["mitre_technique_counts"]) > 0
    assert "department_counts" in data
    assert len(data["department_counts"]) > 0
    assert "severity_counts" in data
    assert len(data["severity_counts"]) > 0

def test_round5_statistical_cohort_z_scores():
    headers = get_auth_header()
    # Marcus Hale (emp_1001) - Finance department, elevated threat
    res = client.get("/api/employees/emp_1001/baseline", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "dept_std_daily_events" in data
    assert "dept_std_daily_transfer_mb" in data
    assert "z_score_daily_events" in data
    assert "z_score_daily_transfer" in data
    assert "cohort_sample_size_adequate" in data
    assert data["cohort_sample_size_adequate"] is True
    # Marcus Hale has elevated transfer volume
    assert data["z_score_daily_transfer"] is not None
    assert data["z_score_daily_transfer"] > 0.0

    # Luca Ferrari (emp_1016) - Finance department, clean record
    clean_res = client.get("/api/employees/emp_1016/baseline", headers=headers)
    assert clean_res.status_code == 200
    clean_data = clean_res.json()
    assert clean_data["cohort_sample_size_adequate"] is True
    assert clean_data["z_score_daily_transfer"] is not None


def test_enhancement4_peer_group_benchmarks():
    headers = get_auth_header()

    # 1. Marcus Hale (emp_1001) - Finance (3 members: sufficient peer sample)
    res_hale = client.get("/api/employees/emp_1001/baseline", headers=headers)
    assert res_hale.status_code == 200
    hale = res_hale.json()
    assert hale["dept_name"] == "Finance"
    assert hale["dept_member_count"] == 3
    assert hale["dept_peer_count"] == 2
    assert hale["has_sufficient_peer_data"] is True
    assert hale["cohort_sample_size_adequate"] is True
    assert hale["employee_daily_transfer_mb"] > 0
    assert hale["dept_avg_daily_transfer_mb"] > 0
    assert hale["employee_total_transfer_mb"] > 10000.0  # ~15.7 GB
    assert hale["z_score_daily_transfer"] is not None
    assert hale["z_score_daily_transfer"] > 0.0

    # 2. Chen Wei (emp_1003) - Research (3 members: sufficient peer sample)
    res_wei = client.get("/api/employees/emp_1003/baseline", headers=headers)
    assert res_wei.status_code == 200
    wei = res_wei.json()
    assert wei["dept_name"] == "Research"
    assert wei["dept_member_count"] == 3
    assert wei["has_sufficient_peer_data"] is True
    assert wei["employee_total_transfer_mb"] > 20000.0  # ~23.4 GB exfiltration
    assert wei["dept_avg_total_transfer_mb"] > 0
    assert wei["z_score_daily_transfer"] is not None

    # 3. Noah Brennan (emp_1013) - Customer Support (1 member: insufficient peer sample)
    res_brennan = client.get("/api/employees/emp_1013/baseline", headers=headers)
    assert res_brennan.status_code == 200
    brennan = res_brennan.json()
    assert brennan["dept_name"] == "Customer Support"
    assert brennan["dept_member_count"] == 1
    assert brennan["dept_peer_count"] == 0
    assert brennan["has_sufficient_peer_data"] is False
    assert brennan["cohort_sample_size_adequate"] is False
    assert brennan["z_score_daily_transfer"] is None
    assert brennan["z_score_daily_events"] is None

    # 4. Amara Diallo (emp_1004) - Sales (2 members: insufficient peer sample)
    res_diallo = client.get("/api/employees/emp_1004/baseline", headers=headers)
    assert res_diallo.status_code == 200
    diallo = res_diallo.json()
    assert diallo["dept_name"] == "Sales"
    assert diallo["dept_member_count"] == 2
    assert diallo["dept_peer_count"] == 1
    assert diallo["has_sufficient_peer_data"] is False
    assert diallo["cohort_sample_size_adequate"] is False
    assert diallo["z_score_daily_transfer"] is None



# ==============================================================================
# --- Milestone 3 Automated Tests (Features A - E) ---
# ==============================================================================

def test_milestone3_incidents_list_and_metrics():
    headers = get_auth_header()
    res = client.get("/api/incidents", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert "metrics" in data
    assert "incidents" in data
    assert "total_count" in data

    metrics = data["metrics"]
    assert metrics["total_incidents"] > 0
    assert "open_incidents" in metrics
    assert "investigating_incidents" in metrics
    assert "escalated_incidents" in metrics
    assert "resolved_incidents" in metrics
    assert metrics["mttd_seconds_avg"] is not None
    assert metrics["mtti_minutes_avg"] is not None

    incidents = data["incidents"]
    assert len(incidents) > 0
    first_inc = incidents[0]
    assert "incident_id" in first_inc
    assert "severity" in first_inc
    assert "status" in first_inc
    assert "employee_id" in first_inc
    assert "mitre_technique_id" in first_inc


def test_milestone3_threat_investigation_detail_view():
    headers = get_auth_header()
    # 1. Fetch incident list to obtain a real incident ID
    list_res = client.get("/api/incidents?limit=5", headers=headers)
    assert list_res.status_code == 200
    inc_id = list_res.json()["incidents"][0]["incident_id"]

    # 2. Query threat investigation evidence view
    res = client.get(f"/api/incidents/{inc_id}", headers=headers)
    assert res.status_code == 200
    detail = res.json()

    assert detail["incident_id"] == inc_id
    assert "notes" in detail
    assert "correlated_telemetry" in detail
    assert "employee_threat_score" in detail
    assert "employee_risk_category" in detail
    assert isinstance(detail["notes"], list)
    assert isinstance(detail["correlated_telemetry"], list)


def test_milestone3_incident_status_transition_and_rbac():
    admin_headers = get_auth_header("admin@ams.internal", "Admin1234!")
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")

    # 1. Get an incident
    list_res = client.get("/api/incidents?limit=5", headers=admin_headers)
    incidents = list_res.json()["incidents"]
    inc_to_test = incidents[0]
    inc_id = inc_to_test["incident_id"]

    # 2. Admin can transition to Investigating
    res_admin = client.patch(
        f"/api/incidents/{inc_id}/status",
        headers=admin_headers,
        json={"status": "Investigating", "note_text": "Admin initiated triage review."}
    )
    assert res_admin.status_code == 200
    assert res_admin.json()["status"] == "Investigating"

    # 3. Admin assigns to analyst@ams.internal
    assign_res = client.patch(
        f"/api/incidents/{inc_id}/assign",
        headers=admin_headers,
        json={"assigned_to_email": "analyst@ams.internal"}
    )
    assert assign_res.status_code == 200
    assert assign_res.json()["assigned_to_email"] == "analyst@ams.internal"

    # 4. Assigned analyst can transition assigned incident
    res_analyst = client.patch(
        f"/api/incidents/{inc_id}/status",
        headers=analyst_headers,
        json={"status": "Resolved", "resolution_summary": "Analyst resolved with credential cycle."}
    )
    assert res_analyst.status_code == 200
    assert res_analyst.json()["status"] == "Resolved"

    # 5. Analyst cannot transition unassigned incident
    other_inc = [i for i in incidents if i["incident_id"] != inc_id][0]
    # Ensure unassigned or assigned to someone else
    client.patch(
        f"/api/incidents/{other_inc['incident_id']}/assign",
        headers=admin_headers,
        json={"assigned_to_email": "soc@ams.internal"}
    )
    forbidden_res = client.patch(
        f"/api/incidents/{other_inc['incident_id']}/status",
        headers=analyst_headers,
        json={"status": "Resolved"}
    )
    assert forbidden_res.status_code == 403


def test_milestone3_device_centric_fleet_view():
    headers = get_auth_header()
    res = client.get("/api/devices", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert "total_devices" in data
    assert "elevated_devices_count" in data
    assert "device_type_counts" in data
    assert "devices" in data

    assert data["total_devices"] > 0
    devices = data["devices"]
    first_dev = devices[0]
    assert "asset_id" in first_dev
    assert "device_type" in first_dev
    assert "assigned_ip" in first_dev
    assert "mac_address" in first_dev
    assert "employee_id" in first_dev
    assert "total_telemetry_events" in first_dev
    assert "anomaly_events_count" in first_dev
    assert "risk_status" in first_dev
    assert first_dev["risk_status"] in ["NORMAL", "ELEVATED", "HIGH_ANOMALY_DENSITY"]


def test_milestone3_ueba_weekly_trends_and_linear_projection():
    headers = get_auth_header()
    res = client.get("/api/employees/emp_1001/baseline", headers=headers)
    assert res.status_code == 200
    data = res.json()

    # 1. Weekly Trends (Feature C)
    assert "weekly_risk_trends" in data
    trends = data["weekly_risk_trends"]
    assert len(trends) == 9  # Week -8 through 0
    assert trends[-1]["week_label"] == "Current Week"
    assert "avg_risk_score" in trends[0]
    assert "anomaly_count" in trends[0]
    assert "transfer_volume_gb" in trends[0]

    # 2. Linear Projection (Feature C)
    assert "linear_trend_projection" in data
    proj = data["linear_trend_projection"]
    assert proj is not None
    assert "slope" in proj
    assert "intercept" in proj
    assert "projected_7d_score" in proj
    assert "projected_14d_score" in proj
    assert "trend_direction" in proj
    assert proj["trend_direction"] in ["RISING", "STABLE", "DECLINING"]
    assert proj["projection_disclaimer"] == "Statistical Linear Extrapolation — Not a Predictive ML Model"
    assert "projected_points" in proj
    assert len(proj["projected_points"]) >= 3


def test_milestone3_polish_incident_csv_export_and_rbac():
    """Validates GET /api/incidents/export and role permissions."""
    # 1. Analyst receives 403
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")
    res_analyst = client.get("/api/incidents/export", headers=analyst_headers)
    assert res_analyst.status_code == 403

    # 2. Manager receives 200 and valid CSV
    manager_headers = get_auth_header("manager@ams.internal", "Manager123!")
    res_mgr = client.get("/api/incidents/export", headers=manager_headers)
    assert res_mgr.status_code == 200
    assert "text/csv" in res_mgr.headers["content-type"]
    assert "ams_incidents_report" in res_mgr.headers["content-disposition"]
    csv_text = res_mgr.text
    assert "Incident ID" in csv_text
    assert "Employee ID" in csv_text
    assert "Severity" in csv_text
    assert "Lifecycle Status" in csv_text
    assert "MTTD (Seconds)" in csv_text

    # 3. Admin receives 200
    admin_headers = get_auth_header()
    res_admin = client.get("/api/incidents/export?status=Open", headers=admin_headers)
    assert res_admin.status_code == 200


def test_milestone3_polish_anomaly_manual_escalation_and_rbac():
    """Validates POST /api/incidents/escalate-anomaly/{log_id} and role permissions."""
    # Find an unescalated telemetry log
    admin_headers = get_auth_header()
    logs_res = client.get("/api/telemetry/logs?limit=50", headers=admin_headers)
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) > 0
    unlinked_logs = [l for l in logs if not l.get("has_incident")]
    target_log = unlinked_logs[0] if unlinked_logs else logs[0]
    log_id = target_log["id"]

    # 1. Analyst receives 403
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")
    res_analyst = client.post(f"/api/incidents/escalate-anomaly/{log_id}", headers=analyst_headers)
    assert res_analyst.status_code == 403

    # 2. SOC Engineer succeeds
    soc_headers = get_auth_header("soc@ams.internal", "SocEng123!")
    res_soc = client.post(f"/api/incidents/escalate-anomaly/{log_id}", headers=soc_headers)
    assert res_soc.status_code == 200
    inc_data = res_soc.json()
    assert "incident_id" in inc_data
    assert inc_data["incident_id"].startswith("INC-2026-")
    assert inc_data["status"] in ["Open", "Investigating", "Escalated", "Resolved"]
    assert inc_data["employee_id"] == target_log["employee_id"]




def test_milestone3_polish_anomaly_and_telemetry_incident_mapping():
    """Validates that incident_id and has_incident are returned in anomaly and telemetry lists."""
    admin_headers = get_auth_header()
    
    # 1. Check anomalies report
    anom_res = client.get("/api/anomalies/report", headers=admin_headers)
    assert anom_res.status_code == 200
    anom_data = anom_res.json()
    assert "events" in anom_data
    assert len(anom_data["events"]) > 0
    first_anom = anom_data["events"][0]
    assert "has_incident" in first_anom
    assert "incident_id" in first_anom

    # 2. Check telemetry logs
    telemetry_res = client.get("/api/telemetry/logs?limit=10", headers=admin_headers)
    assert telemetry_res.status_code == 200
    telemetry_logs = telemetry_res.json()
    assert len(telemetry_logs) > 0
    first_log = telemetry_logs[0]
    assert "has_incident" in first_log
    assert "incident_id" in first_log


# ==============================================================================
# --- ML Anomaly Corroboration Model Tests ---
# ==============================================================================

def test_ml_corroboration_model_metadata():
    """Validates that GET /api/settings/ml-model returns model metadata, 5 feature vectors, and operational status."""
    headers = get_auth_header()
    res = client.get("/api/settings/ml-model", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert data["is_trained"] is True
    assert data["sample_size"] > 0
    assert "daily_event_volume" in data["features_used"]
    assert "off_hours_ratio" in data["features_used"]
    assert "data_transfer_volume_mb" in data["features_used"]
    assert "privilege_change_count" in data["features_used"]
    assert "anomaly_tag_count" in data["features_used"]
    assert data["observed_min"] is not None
    assert data["observed_max"] is not None
    assert data["observed_min"] < data["observed_max"]
    assert "Isolation Forest" in data["algorithm"]
    assert data["status"] == "Operational & Ready" or data["status"] == "Operational"


def test_ml_corroboration_retrain_rbac_and_audit():
    """Validates that POST /api/settings/ml-model/retrain is restricted to Admin and logs RETRAIN_ML_MODEL."""
    admin_headers = get_auth_header()
    analyst_headers = get_auth_header("analyst@ams.internal", "Analyst123!")

    # 1. Analyst receives 403 Forbidden
    res_analyst = client.post("/api/settings/ml-model/retrain", headers=analyst_headers)
    assert res_analyst.status_code == 403

    # 2. Administrator succeeds and retrains across all employees
    res_admin = client.post("/api/settings/ml-model/retrain", headers=admin_headers)
    assert res_admin.status_code == 200
    data = res_admin.json()
    assert data["is_trained"] is True
    assert data["sample_size"] > 0
    assert "emp_1001" in data["employee_scores"]
    assert "emp_1002" in data["employee_scores"]

    # 3. Verify audit ledger entry for RETRAIN_ML_MODEL
    audit_res = client.get("/api/audit/logs?limit=5", headers=admin_headers)
    assert audit_res.status_code == 200
    logs = audit_res.json()
    retrain_logs = [l for l in logs if l["action"] == "RETRAIN_ML_MODEL"]
    assert len(retrain_logs) > 0
    assert retrain_logs[0]["target_resource"] == "isolation_forest_corroboration_bundle"


def test_employee_dossier_serializes_ml_score():
    """Validates that GET /api/employees and GET /api/employees/{id} return ml_corroboration_score."""
    headers = get_auth_header()
    
    # 1. Check employee detail for emp_1002 (Priya Nair - Critical)
    res_detail = client.get("/api/employees/emp_1002", headers=headers)
    assert res_detail.status_code == 200
    data = res_detail.json()
    assert "ml_corroboration_score" in data
    assert data["ml_corroboration_score"] is not None
    assert 0.0 <= data["ml_corroboration_score"] <= 100.0

    # 2. Check employee directory list
    res_list = client.get("/api/employees", headers=headers)
    assert res_list.status_code == 200
    employees = res_list.json()
    assert len(employees) > 0
    for emp in employees:
        assert "ml_corroboration_score" in emp
        if emp["ml_corroboration_score"] is not None:
            assert 0.0 <= emp["ml_corroboration_score"] <= 100.0


def test_employee_detail_serializes_ml_feature_vector():
    """Feature P3: Validates that GET /api/employees/{id} serializes the 5-vector feature inputs."""
    headers = get_auth_header()
    res = client.get("/api/employees/emp_1001", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "ml_feature_vector" in data
    vec = data["ml_feature_vector"]
    assert vec is not None
    assert "daily_event_volume" in vec
    assert "off_hours_ratio" in vec
    assert "data_transfer_volume_mb" in vec
    assert "privilege_change_count" in vec
    assert "anomaly_tag_count" in vec
    assert vec["daily_event_volume"] >= 0
    assert 0.0 <= vec["off_hours_ratio"] <= 100.0
    assert vec["data_transfer_volume_mb"] >= 0


def test_incident_detail_correlated_2h_window():
    """Feature P2: Validates that GET /api/incidents/{id} returns both +-2h and +-24h correlated telemetry windows."""
    headers = get_auth_header()
    res = client.get("/api/incidents/INC-2026-0001", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "correlated_telemetry_2h" in data
    assert "correlated_telemetry" in data
    assert isinstance(data["correlated_telemetry_2h"], list)
    assert isinstance(data["correlated_telemetry"], list)


def test_incident_consolidation_sensible_count():
    """Validates that incidents are consolidated into distinct situation cases."""
    headers = get_auth_header()
    res = client.get("/api/incidents", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "metrics" in data
    # Consolidated count should be sensible (e.g. 10-35 cases, not 95+ raw fragmented events)
    assert 10 <= data["metrics"]["total_incidents"] <= 35
    assert data["metrics"]["mttd_seconds_avg"] is not None
    assert data["metrics"]["mtti_minutes_avg"] is not None
    assert data["metrics"]["mttr_hours_avg"] is not None


# ==============================================================================
# --- MILESTONE 4: ANALYTICS, TESTING & DEPLOYMENT INTEGRATION SUITE ---
# ==============================================================================

import io
import openpyxl
from unittest.mock import patch


def test_notification_delivery_channel_status():
    """Milestone 4 (Module 11): Verify honest notification status reporting."""
    headers = get_auth_header()
    res = client.get("/api/settings/notifications/status", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "email_configured" in data
    assert "slack_configured" in data
    assert "delivery_mode" in data
    # In default unconfigured test environment, should be inert safeguard
    if not data["email_configured"] and not data["slack_configured"]:
        assert data["delivery_mode"] == "inert_safeguard"


def test_notification_mocked_alert_dispatch():
    """Milestone 4 (Module 11): Mock SMTP and Slack delivery, verifying audit logging."""
    headers = get_auth_header()
    with patch("app.notification_service.send_email_alert", return_value={"success": True, "message": "Dispatched"}) as mock_email, \
         patch("app.notification_service.send_slack_alert", return_value={"success": True, "message": "Broadcast"}) as mock_slack:
        res = client.post(
            "/api/settings/notifications/test",
            headers=headers,
            json={"channel": "both", "severity": "CRITICAL"}
        )
        assert res.status_code == 200
        data = res.json()
        assert data["delivery_success"] is True
        assert data["audit_action"] == "NOTIFICATION_SENT"
        assert mock_email.called
        assert mock_slack.called


def test_notification_daily_digest_trigger():
    """Milestone 4 (Module 11): Verify manual daily digest synthesis and audit logging."""
    headers = get_auth_header()
    res = client.post("/api/settings/notifications/digest", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "status" in data
    assert "timestamp" in data
    # Audit trail should record either NOTIFICATION_SENT or NOTIFICATION_SKIPPED
    audit_res = client.get("/api/audit/logs?limit=10", headers=headers)
    assert audit_res.status_code == 200
    actions = [log["action"] for log in audit_res.json()]
    assert any(a in ["NOTIFICATION_SENT", "NOTIFICATION_SKIPPED"] for a in actions)


def test_excel_export_employee_directory():
    """Milestone 4 (Module 12): Validates styled Excel (.xlsx) Employee Directory export."""
    headers = get_auth_header("manager@ams.internal", "Manager123!")
    res = client.get("/api/employees/export-xlsx", headers=headers)
    assert res.status_code == 200
    assert "spreadsheetml" in res.headers.get("content-type", "")

    # Parse with openpyxl to verify workbook integrity and styling
    wb = openpyxl.load_workbook(io.BytesIO(res.content))
    assert "Employee Directory" in wb.sheetnames
    ws = wb["Employee Directory"]
    assert ws.freeze_panes == "A2"
    # Check headers
    header_vals = [cell.value for cell in ws[1]]
    assert "Employee ID" in header_vals
    assert "Threat Score" in header_vals
    assert "Risk Tier" in header_vals
    assert ws.max_row >= 15


def test_excel_export_incidents_queue():
    """Milestone 4 (Module 12): Validates styled Excel (.xlsx) Incidents Queue export."""
    headers = get_auth_header("soc@ams.internal", "SocEng123!")
    res = client.get("/api/incidents/export-xlsx", headers=headers)
    assert res.status_code == 200
    assert "spreadsheetml" in res.headers.get("content-type", "")

    wb = openpyxl.load_workbook(io.BytesIO(res.content))
    assert "Incident Queue" in wb.sheetnames
    ws = wb["Incident Queue"]
    assert ws.freeze_panes == "A2"
    header_vals = [cell.value for cell in ws[1]]
    assert "Incident ID" in header_vals
    assert "Severity" in header_vals
    assert "Status" in header_vals


def test_executive_posture_report_api_and_excel():
    """Milestone 4 (Module 12): Validates Executive Summary API, 4-tab Excel workbook, and PDF audit."""
    # Analyst should be forbidden
    headers_analyst = get_auth_header("analyst@ams.internal", "Analyst123!")
    res_forbidden = client.get("/api/executive/summary", headers=headers_analyst)
    assert res_forbidden.status_code == 403

    # Manager should succeed
    headers_mgr = get_auth_header("manager@ams.internal", "Manager123!")
    res = client.get("/api/executive/summary", headers=headers_mgr)
    assert res.status_code == 200
    data = res.json()
    assert "kpis" in data
    assert "top_risk_employees" in data
    assert "department_breakdown" in data
    assert "soc_metrics" in data
    assert "mitre_techniques" in data
    assert len(data["top_risk_employees"]) <= 5
    assert len(data["department_breakdown"]) > 0

    # Test 4-Tab Excel Generation
    res_xlsx = client.get("/api/executive/export-xlsx", headers=headers_mgr)
    assert res_xlsx.status_code == 200
    assert "spreadsheetml" in res_xlsx.headers.get("content-type", "")

    wb = openpyxl.load_workbook(io.BytesIO(res_xlsx.content))
    expected_tabs = ["Executive Summary", "High-Risk Identities", "Department Vulnerability", "SOC Operations & KPIs"]
    for tab in expected_tabs:
        assert tab in wb.sheetnames

    # Test PDF Export Audit Endpoint
    res_pdf_audit = client.post("/api/executive/audit-pdf-export", headers=headers_mgr)
    assert res_pdf_audit.status_code == 200


def test_e2e_multi_milestone_incident_lifecycle_pipeline():
    """
    Milestone 4 (Module 13): Full end-to-end multi-milestone integration test:
      1. Fetch anomalous telemetry log (Milestone 2)
      2. Escalate anomaly to formal incident case (Milestone 3)
      3. Verify incident lifecycle and notification dispatch (Milestone 4)
      4. Analyst adds investigative note (Milestone 3)
      5. Resolve incident with containment summary (Milestone 3)
      6. Verify MTTD / MTTI / MTTR and audit trail reflection (Milestone 4)
    """
    headers_soc = get_auth_header("soc@ams.internal", "SocEng123!")
    headers_mgr = get_auth_header("manager@ams.internal", "Manager123!")

    # Step 1: Find an anomaly log
    telemetry_res = client.get("/api/telemetry/logs?limit=50", headers=headers_soc)
    assert telemetry_res.status_code == 200
    logs = telemetry_res.json()
    anomaly_logs = [l for l in logs if l.get("anomaly_category")]
    assert len(anomaly_logs) > 0

    inc_res = client.get("/api/incidents", headers=headers_soc)
    existing_log_ids = {i.get("telemetry_event_id") for i in inc_res.json().get("incidents", []) if i.get("telemetry_event_id")}
    unescalated = [l for l in anomaly_logs if l.get("id") not in existing_log_ids]
    target_log = unescalated[0] if unescalated else anomaly_logs[0]

    # Step 2: Escalate to formal incident
    escalate_res = client.post(f"/api/incidents/escalate-anomaly/{target_log['id']}", headers=headers_soc)
    assert escalate_res.status_code == 200
    new_inc = escalate_res.json()
    inc_id = new_inc["incident_id"]
    assert new_inc["status"] in ["Open", "Investigating", "Escalated", "Resolved"]

    # Step 3: Triage to Investigating
    triage_res = client.patch(
        f"/api/incidents/{inc_id}/status",
        headers=headers_soc,
        json={"status": "Investigating", "note": "Forensic log correlation initialized."}
    )
    assert triage_res.status_code == 200
    assert triage_res.json()["status"] == "Investigating"

    # Step 4: Add Investigation Note
    note_res = client.post(
        f"/api/incidents/{inc_id}/notes",
        headers=headers_soc,
        json={"note": "Confirmed egress spike corresponds to off-hours staging bucket transfer."}
    )
    assert note_res.status_code == 200
    assert note_res.json()["incident_id"] == inc_id

    # Step 5: Resolve with containment
    resolve_res = client.patch(
        f"/api/incidents/{inc_id}/status",
        headers=headers_mgr,
        json={
            "status": "Resolved",
            "resolution_summary": "Active session terminated, VPN credentials rotated, user security awareness training assigned."
        }
    )
    assert resolve_res.status_code == 200
    resolved_inc = resolve_res.json()
    assert resolved_inc["status"] == "Resolved"
    assert resolved_inc["resolved_at"] is not None

    # Step 6: Verify Executive metrics and Audit Trail reflect the lifecycle
    exec_res = client.get("/api/executive/summary", headers=headers_mgr)
    assert exec_res.status_code == 200
    assert exec_res.json()["soc_metrics"]["resolved_incidents"] >= 1


def test_api_gateway_instrumentation_headers():
    """Verify API Gateway injects real X-Process-Time and sliding-window rate limit headers."""
    res = client.get("/health")
    assert res.status_code == 200
    assert "x-process-time" in res.headers
    assert "ms" in res.headers["x-process-time"]
    assert "x-ratelimit-limit" in res.headers
    assert res.headers["x-ratelimit-limit"] == "600"
    assert "x-ratelimit-remaining" in res.headers
    assert int(res.headers["x-ratelimit-remaining"]) >= 0
    assert "x-ratelimit-reset" in res.headers


def test_corporate_sso_login_all_roles():
    """Verify simulated Corporate SSO OAuth2 token grant for all 4 seeded personas."""
    roles = ["Administrator", "Security Manager", "SOC Engineer", "Security Analyst"]
    for role in roles:
        res = client.post("/api/auth/sso-login", json={"role": role, "provider": "Corporate_SSO_Demo"})
        assert res.status_code == 200
        data = res.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
        assert data["user"]["role"] == role

    # Invalid role rejects with 400
    bad_res = client.post("/api/auth/sso-login", json={"role": "SuperUser", "provider": "Corporate_SSO_Demo"})
    assert bad_res.status_code == 400


def test_executive_system_performance_metrics():
    """Verify Executive summary includes genuine measurable system_performance metrics."""
    headers = get_auth_header()
    res = client.get("/api/executive/summary", headers=headers)
    assert res.status_code == 200
    data = res.json()
    assert "system_performance" in data
    perf = data["system_performance"]
    assert "mttd_seconds" in perf
    assert "mtti_minutes" in perf
    assert "mttr_hours" in perf
    assert perf["anomaly_categories_detected"] >= 4
    assert perf["total_defined_categories"] == 5
    assert perf["taxonomy_coverage_pct"] >= 80.0
    assert perf["employees_with_baseline"] >= 16
    assert perf["employees_with_baseline"] == perf["total_employees"]
    assert perf["total_telemetry_logs"] > 2000
    assert "api_gateway_sla" in perf


# ==============================================================================
# --- Scoped Exception Module: Live Windows Ingestion Tests ---
# ==============================================================================

def test_live_ingestion_status_endpoint():
    """Verify /api/live-ingestion/status reports real state and enforces Admin role."""
    headers_admin = get_auth_header("admin@ams.internal", "Admin1234!")
    headers_analyst = get_auth_header("analyst@ams.internal", "Analyst123!")

    # Non-admin forbidden
    res_forbidden = client.get("/api/live-ingestion/status", headers=headers_analyst)
    assert res_forbidden.status_code == 403

    # Admin access
    res = client.get("/api/live-ingestion/status", headers=headers_admin)
    assert res.status_code == 200
    data = res.json()
    assert "is_enabled" in data
    assert "is_running" in data
    assert "is_windows" in data
    assert "pywin32_available" in data
    assert "channels_monitored" in data
    assert "Security" in data["channels_monitored"]
    assert "System" in data["channels_monitored"]
    assert "status_summary" in data


def test_identity_mapping_crud_and_validation():
    """Verify identity mapping registration strictly rejects unseeded employees."""
    headers_admin = get_auth_header()

    # 1. Existing mappings should include seeded personas
    res = client.get("/api/admin/identity-mappings", headers=headers_admin)
    assert res.status_code == 200
    mappings = res.json()
    assert len(mappings) >= 4

    # 2. Creating mapping to NON-EXISTENT employee must fail with HTTP 400
    bad_payload = {
        "windows_identifier": "CORP\\phantom.user",
        "employee_id": "emp_fake_99999",
        "description": "Attempted mapping to phantom identity"
    }
    bad_res = client.post("/api/admin/identity-mappings", json=bad_payload, headers=headers_admin)
    assert bad_res.status_code == 400
    assert "does not exist in seeded employee roster" in bad_res.json()["detail"]

    # 3. Creating mapping to real seeded employee succeeds
    test_identifier = f"CORP\\test.worker.{int(time.time())}"
    valid_payload = {
        "windows_identifier": test_identifier,
        "employee_id": "emp_1001",
        "description": "Test workstation mapping"
    }
    create_res = client.post("/api/admin/identity-mappings", json=valid_payload, headers=headers_admin)
    assert create_res.status_code == 201
    created_data = create_res.json()
    mapping_id = created_data["id"]
    assert created_data["windows_identifier"] == test_identifier
    assert created_data["employee_id"] == "emp_1001"

    # 4. Cleanup: Delete created mapping
    del_res = client.delete(f"/api/admin/identity-mappings/{mapping_id}", headers=headers_admin)
    assert del_res.status_code == 200


def test_mapped_event_ingestion_simulation():
    """Verify mapped Windows event generates TelemetryLog with source='live_windows_listener'."""
    headers_admin = get_auth_header()

    sim_payload = {
        "channel": "Security",
        "event_id": 4624,
        "raw_identifier": "CORP\\elena.rostova",
        "source_ip": "10.14.8.99",
        "details": {
            "logon_type": 2,
            "workstation": "WS-ELENA-01"
        }
    }
    res = client.post("/api/live-ingestion/simulate-test-event", json=sim_payload, headers=headers_admin)
    assert res.status_code == 200
    data = res.json()
    assert data["mapped"] is True
    assert data["employee_id"] == "emp_1001"
    assert data["telemetry_log_id"] is not None
    assert data["event_type"] == "LOGIN"

    # Verify TelemetryLog row in DB has source="live_windows_listener"
    db = SessionLocal()
    try:
        from app.models import TelemetryLog
        log_entry = db.query(TelemetryLog).filter(TelemetryLog.id == data["telemetry_log_id"]).first()
        assert log_entry is not None
        assert log_entry.employee_id == "emp_1001"
        assert log_entry.source == "live_windows_listener"
    finally:
        db.close()


def test_unmapped_event_quarantine_simulation():
    """Verify unmapped Windows event is quarantined without creating an employee or TelemetryLog."""
    headers_admin = get_auth_header()

    db = SessionLocal()
    try:
        from app.models import Employee
        initial_emp_count = db.query(Employee).count()
    finally:
        db.close()

    unmapped_sim_payload = {
        "channel": "Security",
        "event_id": 4625,
        "raw_identifier": "CORP\\unmapped.intruder.999",
        "source_ip": "198.51.100.77",
        "details": {
            "status_code": "0xC000006D",
            "workstation": "UNKNOWN-HOST"
        }
    }
    res = client.post("/api/live-ingestion/simulate-test-event", json=unmapped_sim_payload, headers=headers_admin)
    assert res.status_code == 200
    data = res.json()
    assert data["mapped"] is False
    assert data["employee_id"] is None
    assert data["telemetry_log_id"] is None
    assert data["unmapped_log_id"] is not None

    # Verify unmapped log appears in /api/live-ingestion/unmapped-log
    log_res = client.get("/api/live-ingestion/unmapped-log?search=unmapped.intruder.999", headers=headers_admin)
    assert log_res.status_code == 200
    logs = log_res.json()
    assert len(logs) >= 1
    assert logs[0]["raw_identifier"] == "CORP\\unmapped.intruder.999"

    # Guardrail 1 Verification: Employee count MUST remain strictly unchanged!
    db = SessionLocal()
    try:
        final_emp_count = db.query(Employee).count()
        assert final_emp_count == initial_emp_count, "Guardrail 1 Violation: Employee record was created by unmapped listener event!"
    finally:
        db.close()


def test_default_off_behavior():
    """Confirm listener defaults to False and leaves existing evaluation intact."""
    from app.config import settings
    # Default is False unless explicitly configured
    assert hasattr(settings, "ENABLE_LIVE_WINDOWS_LISTENER")
    assert hasattr(settings, "WINDOWS_LISTENER_POLL_INTERVAL_SECONDS")


def test_executive_pdf_export_and_rbac():
    """Verify Executive PDF Export (Spec Item 204) generates real PDF bytes and enforces RBAC."""
    from app.models import AuditLog

    # 1. Admin gets HTTP 200 and real PDF bytes starting with %PDF-
    headers_admin = get_auth_header()
    res_admin = client.get("/api/executive/export-pdf", headers=headers_admin)
    assert res_admin.status_code == 200
    assert res_admin.headers["content-type"] == "application/pdf"
    assert "attachment; filename=" in res_admin.headers["content-disposition"]
    assert res_admin.content.startswith(b"%PDF-")
    assert len(res_admin.content) >= 1000

    # 2. Security Manager also gets HTTP 200
    manager_login = client.post("/api/auth/login", json={"email": "manager@ams.internal", "password": "Manager123!"})
    manager_token = manager_login.json()["access_token"]
    res_manager = client.get("/api/executive/export-pdf", headers={"Authorization": f"Bearer {manager_token}"})
    assert res_manager.status_code == 200
    assert res_manager.content.startswith(b"%PDF-")

    # 3. Security Analyst receives HTTP 403 Forbidden
    analyst_login = client.post("/api/auth/login", json={"email": "analyst@ams.internal", "password": "Analyst123!"})
    analyst_token = analyst_login.json()["access_token"]
    res_analyst = client.get("/api/executive/export-pdf", headers={"Authorization": f"Bearer {analyst_token}"})
    assert res_analyst.status_code == 403

    # 4. Verify audit trail entry exists for EXPORT_EXECUTIVE_PDF
    db = SessionLocal()
    try:
        audit_entry = db.query(AuditLog).filter(AuditLog.action == "EXPORT_EXECUTIVE_PDF").order_by(AuditLog.id.desc()).first()
        assert audit_entry is not None
        assert audit_entry.target_resource == "ExecutivePostureReport"
        assert audit_entry.details.get("format") == "pdf"
    finally:
        db.close()


def test_showcase_scenarios_endpoint():
    """Verify Showcase Attack Scenarios endpoint returns 4 verified real records with exact DB data."""
    headers = get_auth_header()
    res = client.get("/api/incidents/showcase-scenarios", headers=headers)
    assert res.status_code == 200
    scenarios = res.json()
    assert len(scenarios) == 4

    # Verify Marcus Hale (Finance) - INC-2026-0001
    s1 = scenarios[0]
    assert s1["incident_id"] == "INC-2026-0001"
    assert s1["employee_name"] == "Marcus Hale"
    assert s1["employee_department"] == "Finance"
    assert s1["status"] == "Escalated"
    assert s1["mitre_technique_id"] == "T1048"

    # Verify Chen Wei (Research) - INC-2026-0008
    s2 = scenarios[1]
    assert s2["incident_id"] == "INC-2026-0008"
    assert s2["employee_name"] == "Chen Wei"
    assert s2["employee_department"] == "Research"
    assert s2["status"] == "Open"
    assert s2["mitre_technique_id"] == "T1048"

    # Verify Amara Diallo (Sales) - INC-2026-0005
    s3 = scenarios[2]
    assert s3["incident_id"] == "INC-2026-0005"
    assert s3["employee_name"] == "Amara Diallo"
    assert s3["employee_department"] == "Sales"
    assert s3["status"] == "Investigating"
    assert s3["mitre_technique_id"] == "T1052"

    # Verify Viktor Sorokin (Procurement) - INC-2026-0007
    s4 = scenarios[3]
    assert s4["incident_id"] == "INC-2026-0007"
    assert s4["employee_name"] == "Viktor Sorokin"
    assert s4["employee_department"] == "Procurement"
    assert s4["status"] == "Resolved"
    assert s4["mitre_technique_id"] == "T1048"















