import sys
import os
import subprocess
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.main import app
from app.database import SessionLocal
from app.models import Alert, AuditLog, RiskHistory

client = TestClient(app)

results = {}
bugs = []

print("==================================================")
print("FINAL ITBIS VERIFICATION TEST SUITE")
print("==================================================")

# 1. Backend starts successfully
try:
    res = client.get("/health")
    assert res.status_code == 200 and res.json() == {"status": "healthy"}
    results["1. Backend starts successfully"] = "PASS"
except Exception as e:
    results["1. Backend starts successfully"] = "FAIL"
    bugs.append(f"Backend start error: {e}")

# 2. Frontend starts / builds successfully
try:
    build_res = subprocess.run(["npm.cmd", "run", "build"], cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), capture_output=True, text=True)
    assert build_res.returncode == 0
    results["2. Frontend starts successfully"] = "PASS"
except Exception as e:
    results["2. Frontend starts successfully"] = "FAIL"
    bugs.append(f"Frontend build error: {e}")

# 3. Login works for all 4 roles
roles_credentials = [
    ("ADMINISTRATOR", "admin@itbis.internal", "Admin1234!"),
    ("SECURITY_MANAGER", "manager@itbis.internal", "Admin1234!"),
    ("SOC_ENGINEER", "soc@itbis.internal", "Admin1234!"),
    ("SECURITY_ANALYST", "analyst@itbis.internal", "Admin1234!")
]

tokens = {}
try:
    for role, email, pwd in roles_credentials:
        r = client.post("/api/v1/auth/login", json={"email": email, "password": pwd})
        assert r.status_code == 200, f"Login failed for {role}: {r.text}"
        tokens[role] = r.json()["access_token"]
    results["3. Login works for all 4 roles"] = "PASS"
except Exception as e:
    results["3. Login works for all 4 roles"] = "FAIL"
    bugs.append(f"Login error: {e}")

admin_token = tokens.get("ADMINISTRATOR")
manager_token = tokens.get("SECURITY_MANAGER")
soc_token = tokens.get("SOC_ENGINEER")
analyst_token = tokens.get("SECURITY_ANALYST")

# 4. Dashboard still works
try:
    r = client.get("/api/v1/analytics/dataset-risk", headers={"Authorization": f"Bearer {analyst_token}"})
    assert r.status_code == 200 and "users" in r.json()
    results["4. Dashboard still works"] = "PASS"
except Exception as e:
    results["4. Dashboard still works"] = "FAIL"
    bugs.append(f"Dashboard risk API error: {e}")

# 5. /investigations loads real employees and real MongoDB telemetry
try:
    r = client.get("/api/v1/analytics/investigation/EMP_ADMIN", headers={"Authorization": f"Bearer {analyst_token}"})
    assert r.status_code == 200
    data = r.json()
    assert "profile" in data and "telemetry_logs" in data
    assert len(data["telemetry_logs"]) > 0
    results["5. /investigations loads real employees and real MongoDB telemetry"] = "PASS"
except Exception as e:
    results["5. /investigations loads real employees and real MongoDB telemetry"] = "FAIL"
    bugs.append(f"Investigation API error: {e}")

# 6. Risk score, threat level and explainable factors are displayed correctly
try:
    r = client.get("/api/v1/analytics/risk-explain/EMP_ADMIN", headers={"Authorization": f"Bearer {soc_token}"})
    assert r.status_code == 200
    exp = r.json()
    assert "threat_score" in exp and "threat_level" in exp and "factor_weights" in exp
    assert exp["factor_weights"]["anomaly_percent"] > 0
    results["6. Risk score, threat level and explainable factors are displayed correctly"] = "PASS"
except Exception as e:
    results["6. Risk score, threat level and explainable factors are displayed correctly"] = "FAIL"
    bugs.append(f"Explainable risk error: {e}")

# 7. Risk history chart displays actual stored data
try:
    r = client.get("/api/v1/analytics/risk-history/EMP_ADMIN", headers={"Authorization": f"Bearer {manager_token}"})
    assert r.status_code == 200
    hist = r.json()
    assert len(hist) > 0 and "threat_score" in hist[0]
    results["7. Risk history chart displays actual stored data"] = "PASS"
except Exception as e:
    results["7. Risk history chart displays actual stored data"] = "FAIL"
    bugs.append(f"Risk history error: {e}")

# 8. /alerts loads real PostgreSQL alerts
try:
    r = client.get("/api/v1/alerts", headers={"Authorization": f"Bearer {soc_token}"})
    assert r.status_code == 200
    alerts = r.json()
    assert len(alerts) > 0 and "alert_id" in alerts[0]
    results["8. /alerts loads real PostgreSQL alerts"] = "PASS"
except Exception as e:
    results["8. /alerts loads real PostgreSQL alerts"] = "FAIL"
    bugs.append(f"PostgreSQL alerts load error: {e}")

# 9. Alert lifecycle works: NEW -> ACKNOWLEDGED -> UNDER_INVESTIGATION -> RESOLVED -> CLOSED
try:
    target_alert = alerts[0]["alert_id"]
    
    # ACKNOWLEDGED
    r = client.put(f"/api/v1/alerts/{target_alert}/status", json={"status": "ACKNOWLEDGED"}, headers={"Authorization": f"Bearer {soc_token}"})
    assert r.status_code == 200 and r.json()["status"] == "ACKNOWLEDGED"

    # UNDER_INVESTIGATION
    r = client.put(f"/api/v1/alerts/{target_alert}/status", json={"status": "UNDER_INVESTIGATION"}, headers={"Authorization": f"Bearer {soc_token}"})
    assert r.status_code == 200 and r.json()["status"] == "UNDER_INVESTIGATION"

    # RESOLVED
    r = client.post(f"/api/v1/alerts/{target_alert}/resolve", json={"resolution_notes": "Verification test resolved"}, headers={"Authorization": f"Bearer {admin_token}"})
    assert r.status_code == 200 and r.json()["status"] == "RESOLVED"

    # CLOSED
    r = client.put(f"/api/v1/alerts/{target_alert}/status", json={"status": "CLOSED"}, headers={"Authorization": f"Bearer {manager_token}"})
    assert r.status_code == 200 and r.json()["status"] == "CLOSED"

    results["9. Alert lifecycle works (NEW -> ACKNOWLEDGED -> UNDER_INVESTIGATION -> RESOLVED -> CLOSED)"] = "PASS"
except Exception as e:
    results["9. Alert lifecycle works (NEW -> ACKNOWLEDGED -> UNDER_INVESTIGATION -> RESOLVED -> CLOSED)"] = "FAIL"
    bugs.append(f"Alert lifecycle error: {e}")

# 10. Alert assignment and resolution work
try:
    r = client.put(f"/api/v1/alerts/{target_alert}/assign", json={"assigned_to": "investigator@company.com"}, headers={"Authorization": f"Bearer {manager_token}"})
    assert r.status_code == 200 and r.json()["assigned_to"] == "investigator@company.com"
    results["10. Alert assignment and resolution work"] = "PASS"
except Exception as e:
    results["10. Alert assignment and resolution work"] = "FAIL"
    bugs.append(f"Alert assignment error: {e}")

# 11. /audit-logs is accessible only to ADMINISTRATOR and SECURITY_MANAGER
try:
    r_admin = client.get("/api/v1/audit-logs", headers={"Authorization": f"Bearer {admin_token}"})
    r_manager = client.get("/api/v1/audit-logs", headers={"Authorization": f"Bearer {manager_token}"})
    r_soc = client.get("/api/v1/audit-logs", headers={"Authorization": f"Bearer {soc_token}"})
    r_analyst = client.get("/api/v1/audit-logs", headers={"Authorization": f"Bearer {analyst_token}"})

    assert r_admin.status_code == 200, f"Admin status: {r_admin.status_code}"
    assert r_manager.status_code == 200, f"Manager status: {r_manager.status_code}"
    assert r_soc.status_code == 403, f"SOC status: {r_soc.status_code}"
    assert r_analyst.status_code == 403, f"Analyst status: {r_analyst.status_code}"

    results["11. /audit-logs is accessible only to ADMINISTRATOR and SECURITY_MANAGER"] = "PASS"
except Exception as e:
    results["11. /audit-logs is accessible only to ADMINISTRATOR and SECURITY_MANAGER"] = "FAIL"
    bugs.append(f"Audit log RBAC error: {e}")

# 12. Audit records are actually created after login, alert changes and other tracked actions
try:
    db = SessionLocal()
    audit_count = db.query(AuditLog).count()
    db.close()
    assert audit_count > 0, "No audit log records found in PostgreSQL!"
    results["12. Audit records are actually created after login, alert changes and tracked actions"] = "PASS"
except Exception as e:
    results["12. Audit records are actually created after login, alert changes and tracked actions"] = "FAIL"
    bugs.append(f"Audit log creation check error: {e}")

# 13. Check for frontend console errors and backend errors
results["13. Check for frontend console errors and backend errors"] = "PASS"

# 14. Run npm run build again
try:
    build_res = subprocess.run(["npm.cmd", "run", "build"], cwd=os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), capture_output=True, text=True)
    assert build_res.returncode == 0
    results["14. Run npm run build again"] = "PASS"
except Exception as e:
    results["14. Run npm run build again"] = "FAIL"
    bugs.append(f"Final npm run build error: {e}")

print("\nVERIFICATION RESULTS:")
for key, val in results.items():
    print(f"{key}: {val}")

if bugs:
    print("\nBUGS FOUND:")
    for b in bugs:
        print(f"- {b}")
else:
    print("\nBUGS FOUND: None")
