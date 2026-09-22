import sys
import os
from fastapi.testclient import TestClient

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app

client = TestClient(app)

print("==================================================")
print("RUNNING ITBIS AUTOMATED BACKEND WORKFLOW TESTS")
print("==================================================")

# 1. TEST LOGIN & JWT TOKEN GENERATION FOR ALL 4 ROLES
roles_users = [
    ("ADMINISTRATOR", "admin@itbis.internal", "Admin1234!"),
    ("SECURITY_MANAGER", "manager@itbis.internal", "Admin1234!"),
    ("SOC_ENGINEER", "soc@itbis.internal", "Admin1234!"),
    ("SECURITY_ANALYST", "analyst@itbis.internal", "Admin1234!")
]

tokens = {}

for role_name, email, password in roles_users:
    res = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert res.status_code == 200, f"Login failed for {role_name}: {res.text}"
    data = res.json()
    assert "access_token" in data
    assert data["role"] == role_name
    tokens[role_name] = data["access_token"]
    print(f"[PASS] Login successful for {role_name}")

admin_token = tokens["ADMINISTRATOR"]
manager_token = tokens["SECURITY_MANAGER"]
soc_token = tokens["SOC_ENGINEER"]
analyst_token = tokens["SECURITY_ANALYST"]

# 2. TEST GET EMPLOYEES
res = client.get("/api/v1/employees", headers={"Authorization": f"Bearer {admin_token}"})
assert res.status_code == 200
print(f"[PASS] GET /api/v1/employees returned {len(res.json())} employees")

# 3. TEST INVESTIGATION MODULE
res = client.get("/api/v1/analytics/investigation/EMP_ADMIN", headers={"Authorization": f"Bearer {analyst_token}"})
assert res.status_code == 200, res.text
inv_data = res.json()
assert "profile" in inv_data
assert "risk_summary" in inv_data
assert "telemetry_logs" in inv_data
assert "history" in inv_data
print(f"[PASS] GET /api/v1/analytics/investigation/EMP_ADMIN threat score: {inv_data['risk_summary']['threat_score']}")

# 4. TEST EXPLAINABLE RISK
res = client.get("/api/v1/analytics/risk-explain/EMP_ADMIN", headers={"Authorization": f"Bearer {soc_token}"})
assert res.status_code == 200, res.text
exp_data = res.json()
assert "factor_weights" in exp_data
assert "indicators" in exp_data
print(f"[PASS] GET /api/v1/analytics/risk-explain factor weights: {exp_data['factor_weights']}")

# 5. TEST RISK HISTORY
res = client.get("/api/v1/analytics/risk-history/EMP_ADMIN", headers={"Authorization": f"Bearer {manager_token}"})
assert res.status_code == 200, res.text
hist_data = res.json()
assert len(hist_data) >= 1
print(f"[PASS] GET /api/v1/analytics/risk-history returned {len(hist_data)} history records")

# 6. TEST IDEMPOTENT ALERTS GENERATION & LISTING
res1 = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {soc_token}"})
assert res1.status_code == 200, res1.text
alerts1 = res1.json()

# Call GET /api/v1/alerts a second time to ensure idempotency (no duplicate multiplication)
res2 = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {soc_token}"})
assert res2.status_code == 200, res2.text
alerts2 = res2.json()

assert len(alerts1) == len(alerts2), f"Idempotency failed! First call: {len(alerts1)}, second call: {len(alerts2)}"
print(f"[PASS] GET /api/v1/alerts is idempotent! Total alerts in DB: {len(alerts1)}")

if alerts1:
    target_alert = alerts1[0]
    alert_id = target_alert["alert_id"]

    # 7. TEST ALERT STATUS UPDATE
    res = client.put(f"/api/v1/alerts/{alert_id}/status", json={"status": "ACKNOWLEDGED"}, headers={"Authorization": f"Bearer {soc_token}"})
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "ACKNOWLEDGED"
    print(f"[PASS] PUT /api/v1/alerts/{alert_id}/status updated to ACKNOWLEDGED")

    # 8. TEST ALERT ASSIGNMENT
    res = client.put(f"/api/v1/alerts/{alert_id}/assign", json={"assigned_to": "soc@itbis.internal"}, headers={"Authorization": f"Bearer {manager_token}"})
    assert res.status_code == 200, res.text
    assert res.json()["assigned_to"] == "soc@itbis.internal"
    print(f"[PASS] PUT /api/v1/alerts/{alert_id}/assign assigned to soc@itbis.internal")

    # 9. TEST ALERT RESOLUTION
    res = client.post(f"/api/v1/alerts/{alert_id}/resolve", json={"resolution_notes": "Activity verified and cleared."}, headers={"Authorization": f"Bearer {admin_token}"})
    assert res.status_code == 200, res.text
    assert res.json()["status"] == "RESOLVED"
    print(f"[PASS] POST /api/v1/alerts/{alert_id}/resolve status updated to RESOLVED")

# 10. TEST AUDIT LOGS
res = client.get("/api/v1/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
assert res.status_code == 200, res.text
audit_logs = res.json()
assert len(audit_logs) >= 1
print(f"[PASS] GET /api/v1/audit-logs returned {len(audit_logs)} audit records")

# 11. TEST RBAC REJECTION (SECURITY_ANALYST cannot view audit logs)
res = client.get("/api/v1/audit-logs", headers={"Authorization": f"Bearer {analyst_token}"})
assert res.status_code == 403, f"Expected 403 Forbidden for SECURITY_ANALYST, got {res.status_code}"
print("[PASS] RBAC enforcement verified! SECURITY_ANALYST correctly denied access to /api/v1/audit-logs (403 Forbidden)")

print("==================================================")
print("ALL AUTOMATED VERIFICATION TESTS PASSED SUCCESSFULLY!")
print("==================================================")
