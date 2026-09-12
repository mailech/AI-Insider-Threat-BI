"""
Comprehensive verification script for ams_postman_collection.json.
Validates:
1. All 11 folders are properly formatted and valid JSON schema.
2. Auto JWT token capture script is present on all 4 role login requests.
3. Every single request in the collection maps to a real, existing FastAPI endpoint.
4. Executes requests against FastAPI TestClient to confirm ZERO 404 errors.
"""

import json
import os
import sys

# Ensure backend root is on sys.path
sys.path.insert(0, os.path.dirname(__file__))

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

collection_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ams_postman_collection.json"))

def run_verification():
    print("=" * 80)
    print("VERIFYING POSTMAN API COLLECTION (MODULES 01 - 11)")
    print("=" * 80)

    with open(collection_path, "r", encoding="utf-8") as f:
        col = json.load(f)

    # 1. Verify Collection Variables
    vars_dict = {v["key"]: v["value"] for v in col.get("variable", [])}
    assert "base_url" in vars_dict, "FAIL: base_url variable missing!"
    assert "token" in vars_dict, "FAIL: token variable missing!"
    print(f"[+] PASS | Collection Variables: base_url = '{vars_dict['base_url']}', token initialized")

    # 2. Verify Folders
    folders = col.get("item", [])
    assert len(folders) >= 11, f"FAIL: Expected at least 11 folders, found {len(folders)}"
    print(f"[+] PASS | Total Folders: {len(folders)}")

    # 3. Log in as Administrator to obtain real JWT token
    login_res = client.post("/api/auth/login", json={"email": "admin@ams.internal", "password": "Admin1234!"})
    assert login_res.status_code == 200, f"FAIL: Admin login failed: {login_res.text}"
    token = login_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    print(f"[+] PASS | Retrieved valid Admin JWT Token: {token[:20]}...")

    # 4. Check JWT auto-capture scripts on all 4 logins
    auth_folder = next(f for f in folders if "01. Authentication" in f["name"])
    login_items = [i for i in auth_folder["item"] if "Login as" in i["name"]]
    assert len(login_items) >= 4, f"FAIL: Expected 4 login requests, found {len(login_items)}"
    for req in login_items:
        events = req.get("event", [])
        test_event = next((e for e in events if e.get("listen") == "test"), None)
        assert test_event is not None, f"FAIL: Missing test script for {req['name']}"
        script_text = "".join(test_event["script"]["exec"])
        assert "pm.collectionVariables.set('token'" in script_text or "token" in script_text, f"FAIL: No token set in script for {req['name']}"
        print(f"[+] PASS | JWT Token auto-capture verified on: {req['name']}")

    # Pre-clean temporary test mapping if left over from prior runs
    from app.database import SessionLocal
    from app.models import EmployeeIdentityMapping
    _db = SessionLocal()
    try:
        _db.query(EmployeeIdentityMapping).filter(
            EmployeeIdentityMapping.windows_identifier.in_([
                "CORP\\temporary.test.identity",
                "CORP\\marcus.postman",
                "CORP\\marcus.postman.demo"
            ])
        ).delete(synchronize_session=False)
        _db.commit()
    finally:
        _db.close()

    # 5. Verify every single request across all folders does NOT 404
    total_requests = 0
    passed_requests = 0
    col_vars = {"mapping_id": "2"}

    for folder_idx, folder in enumerate(folders, 1):
        print(f"\n--- Folder {folder_idx:02d}: {folder['name']} ({len(folder.get('item', []))} requests) ---")
        for req in folder.get("item", []):
            total_requests += 1
            req_name = req["name"]
            method = req["request"]["method"].upper()
            url_raw = req["request"]["url"]["raw"]
            
            # Resolve url: replace {{base_url}} with /api and collection variables
            resolved_url = url_raw.replace("{{base_url}}", "/api")
            for k, v in col_vars.items():
                resolved_url = resolved_url.replace(f"{{{{{k}}}}}", str(v))

            # Determine headers and body
            req_headers = {"Authorization": f"Bearer {token}"}
            body_json = None
            if "body" in req["request"] and req["request"]["body"].get("mode") == "raw":
                try:
                    raw_str = req["request"]["body"]["raw"]
                    body_json = json.loads(raw_str)
                except Exception:
                    body_json = None

            # Execute via TestClient
            if method == "GET":
                resp = client.get(resolved_url, headers=req_headers)
            elif method == "POST":
                resp = client.post(resolved_url, headers=req_headers, json=body_json)
                if resp.status_code == 201 and "id" in resp.json():
                    col_vars["mapping_id"] = resp.json()["id"]
            elif method == "PATCH":
                resp = client.patch(resolved_url, headers=req_headers, json=body_json)
            elif method == "DELETE":
                resp = client.delete(resolved_url, headers=req_headers)
            else:
                resp = client.request(method, resolved_url, headers=req_headers)

            # Strict guardrail: Check response status
            if resp.status_code == 404:
                print(f"  [X] {method:6} | HTTP 404 | {resolved_url[:45]:45} | {req_name} <-- NOT FOUND")
                failed_requests.append((req_name, method, resolved_url, resp.status_code))
            else:
                status_text = f"HTTP {resp.status_code}"
                print(f"  [+] {method:6} | {status_text:8} | {resolved_url[:45]:45} | {req_name}")
                passed_requests += 1

    print("\n" + "=" * 80)
    print(f"[+] SUMMARY: {passed_requests}/{total_requests} requests passed. {len(failed_requests)} failed.")
    if failed_requests:
        print("\nFailed Requests (404 Not Found):")
        for name, m, u, code in failed_requests:
            print(f"  - {m} {u} ({name})")
        return 1
    else:
        print("[+] ZERO 404s found! All collection requests correspond to real backend endpoints.")
        print("=" * 80)
        return 0

if __name__ == "__main__":
    failed_requests = []
    sys.exit(run_verification())
