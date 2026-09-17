"""
CYBER AI — Backend Automated Verification Suite
Validates authentication, active identity profile, employee listing,
risk scoring engine, and analytics summary APIs.
"""

import json
import urllib.parse
import urllib.request
import sys

# Ensure UTF-8 output encoding for Windows terminal compatibility
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

BASE_URL = "http://127.0.0.1:8000"

def log_step(step_num: int, title: str):
    print(f"\n[{step_num}/5] {title}")
    print("=" * 60)

def main():
    print("=" * 60)
    print("CYBER AI — Backend Automated Verification")
    print("=" * 60)

    # ── Step 1: Service Health Check ───────────────────────────
    log_step(1, "Checking Service Health (/health)")
    try:
        req = urllib.request.Request(f"{BASE_URL}/health")
        res = urllib.request.urlopen(req)
        health_data = json.loads(res.read())
        print(f"  [OK] Service Status: {health_data.get('status')} | Service: {health_data.get('service')}")
    except Exception as e:
        print(f"  [FAIL] Health check failed: {e}")
        sys.exit(1)

    # ── Step 2: Administrator Login ────────────────────────────
    log_step(2, "Authenticating as Administrator (admin@cyberai.internal)")
    login_data = urllib.parse.urlencode({
        "username": "admin@cyberai.internal",
        "password": "CyberAdmin2026!",
    }).encode()

    try:
        req = urllib.request.Request(
            f"{BASE_URL}/api/v1/auth/login",
            data=login_data,
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        res = urllib.request.urlopen(req)
        token_payload = json.loads(res.read())
        token = token_payload.get("access_token")
        print(f"  [OK] Authentication Success!")
        print(f"       Token Type:   {token_payload.get('token_type')}")
        print(f"       Access Token: {token[:28]}...")
    except Exception as e:
        print(f"  [FAIL] Administrator login failed: {e}")
        sys.exit(1)

    auth_headers = {"Authorization": f"Bearer {token}"}

    # ── Step 3: Current User Profile (/auth/me) ────────────────
    log_step(3, "Inspecting Authenticated Profile (/api/v1/auth/me)")
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/v1/auth/me", headers=auth_headers)
        res = urllib.request.urlopen(req)
        user_data = json.loads(res.read())
        print(f"  [OK] Identity Confirmed:")
        print(f"       Email:  {user_data.get('email')}")
        print(f"       Role:   {user_data.get('role')}")
        print(f"       Active: {user_data.get('is_active')}")
    except Exception as e:
        print(f"  [FAIL] Profile lookup failed: {e}")
        sys.exit(1)

    # ── Step 4: Monitored Employees (/employees/) ─────────────
    log_step(4, "Fetching Monitored Employee Directory (/api/v1/employees/)")
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/v1/employees/?limit=10", headers=auth_headers)
        res = urllib.request.urlopen(req)
        employees = json.loads(res.read())
        print(f"  [OK] Retrieved {len(employees)} employee records from cyberai.db:")
        for emp in employees[:4]:
            print(f"       • {emp.get('emp_id'):<10} {emp.get('first_name')} {emp.get('last_name'):<14} dept={emp.get('department'):<16} risk={emp.get('risk_category')}")
    except Exception as e:
        print(f"  [FAIL] Employee listing failed: {e}")
        sys.exit(1)

    # ── Step 5: Analytics & Threat Summary (/analytics/summary) 
    log_step(5, "Fetching Security Posture Summary (/api/v1/analytics/summary)")
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/v1/analytics/summary", headers=auth_headers)
        res = urllib.request.urlopen(req)
        summary = json.loads(res.read())
        print(f"  [OK] Analytics Aggregation Confirmed:")
        print(f"       Total Monitored Identities: {summary.get('total_employees')}")
        print(f"       Critical Risk Count:       {summary.get('critical_count')}")
        print(f"       High Risk Count:           {summary.get('high_risk_count')}")
        print(f"       Fleet Avg Threat Score:     {summary.get('average_threat_score')} / 100")
        print(f"       Risk Band Distribution:    {summary.get('risk_distribution')}")
    except Exception as e:
        print(f"  [FAIL] Analytics summary failed: {e}")
        sys.exit(1)

    print("\n" + "=" * 60)
    print("[SUCCESS] ALL CYBER AI BACKEND TESTS PASSED CLEANLY!")
    print("=" * 60)

if __name__ == "__main__":
    main()
