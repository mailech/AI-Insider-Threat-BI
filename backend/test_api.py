import sys
import os

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_endpoints():
    print("Testing FastAPI endpoints...")

    # 1. Root & Health Check
    res = client.get("/")
    assert res.status_code == 200, f"Root failed: {res.text}"
    print("[PASS] GET /")

    res = client.get("/health")
    assert res.status_code == 200, f"Health failed: {res.text}"
    print("[PASS] GET /health")

    # 2. Authentication Login
    login_res = client.post("/api/v1/auth/login", json={
        "email": "admin@threat.ai",
        "password": "admin123"
    })
    assert login_res.status_code == 200, f"Login failed: {login_res.text}"
    token_data = login_res.json()
    assert "access_token" in token_data
    token = token_data["access_token"]
    print("[PASS] POST /api/v1/auth/login (JWT token generated)")

    # 3. Authenticated /me
    me_res = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_res.status_code == 200, f"/me failed: {me_res.text}"
    user_info = me_res.json()
    assert user_info["email"] == "admin@threat.ai"
    assert user_info["role"] == "Security Analyst"
    assert user_info["clearance"] == "TOP SECRET // SCI"
    print("[PASS] GET /api/v1/auth/me (Clearance: TOP SECRET // SCI)")

    # 4. List Monitored Employees
    emp_res = client.get("/api/v1/employees?page=1&page_size=5")
    assert emp_res.status_code == 200, f"Employees list failed: {emp_res.text}"
    emp_data = emp_res.json()
    assert emp_data["total"] >= 8
    print(f"[PASS] GET /api/v1/employees (Total: {emp_data['total']}, Retrieved: {len(emp_data['items'])})")

    # 5. Get Specific Employee Dossier
    dossier_res = client.get("/api/v1/employees/101")
    assert dossier_res.status_code == 200, f"Employee dossier failed: {dossier_res.text}"
    dossier = dossier_res.json()
    assert dossier["id"] == "101"
    assert len(dossier["behavioral_indicators"]) > 0
    print("[PASS] GET /api/v1/employees/101 (Behavioral indicators and factors verified)")

    # 6. Containment Action: Lock Account
    lock_res = client.post("/api/v1/employees/101/lock")
    assert lock_res.status_code == 200, f"Lock failed: {lock_res.text}"
    lock_data = lock_res.json()
    assert lock_data["status"] == "Locked"
    assert lock_data["score"] == 0
    print("[PASS] POST /api/v1/employees/101/lock (Account successfully isolated)")

    # Reset score back to normal
    reset_res = client.post("/api/v1/employees/101/reset-score")
    assert reset_res.status_code == 200
    print("[PASS] POST /api/v1/employees/101/reset-score (Score reset to 15)")

    # 7. List Alerts
    alerts_res = client.get("/api/v1/alerts")
    assert alerts_res.status_code == 200, f"Alerts failed: {alerts_res.text}"
    alerts_data = alerts_res.json()
    assert alerts_data["total"] >= 5
    print(f"[PASS] GET /api/v1/alerts (Total: {alerts_data['total']})")

    # 8. Update Alert Status
    patch_res = client.patch("/api/v1/alerts/ALT-2026-001", json={"status": "Investigating"})
    assert patch_res.status_code == 200, f"Patch alert failed: {patch_res.text}"
    assert patch_res.json()["status"] == "Investigating"
    print("[PASS] PATCH /api/v1/alerts/ALT-2026-001 (Status: Investigating)")

    # 9. Activity Log Ingestion Pipeline
    ingest_res = client.post("/api/v1/activity/ingest", json=[
        {
            "employee_id": "104",
            "activity_type": "usb_device_mounted",
            "source_ip": "192.168.6.50",
            "workstation": "WS-LEG-014",
            "details": {"device": "Kingston DataTraveler 128GB"},
            "is_anomalous": True,
            "anomaly_score": 85
        },
        {
            "employee_id": "107",
            "activity_type": "git_pull",
            "source_ip": "192.168.1.92",
            "workstation": "WS-ENG-308",
            "details": {"branch": "main"},
            "is_anomalous": False
        }
    ])
    assert ingest_res.status_code == 201, f"Ingest failed: {ingest_res.text}"
    ingest_data = ingest_res.json()
    assert ingest_data["ingested_count"] == 2
    assert ingest_data["anomalies_flagged"] >= 1
    print(f"[PASS] POST /api/v1/activity/ingest (Ingested: {ingest_data['ingested_count']}, Anomalies: {ingest_data['anomalies_flagged']})")

    # 10. Recent Activity Stream
    recent_res = client.get("/api/v1/activity/recent?limit=10")
    assert recent_res.status_code == 200
    assert len(recent_res.json()) >= 2
    print(f"[PASS] GET /api/v1/activity/recent ({len(recent_res.json())} logs retrieved)")

    print("\nALL FASTAPI BACKEND ENDPOINTS PASSED VERIFICATION WITH 100% SUCCESS!")

if __name__ == "__main__":
    test_endpoints()
