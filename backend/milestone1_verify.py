#!/usr/bin/env python3
"""
ITBIS — Milestone 1 Health & Verification Script
=================================================
Tests all four core API pillars for Milestone 1:
  1. Auth    — Login (all 4 RBAC roles) + JWT validation
  2. Employees — List, risk-level filter, device-info presence
  3. Telemetry — MongoDB connection + event fetch
  4. Analytics — Summary endpoint, threat scores, dept breakdown

Run from backend/ directory with venv activated:
    python milestone1_verify.py
"""

from __future__ import annotations

import sys
import json
import time
import urllib.request
import urllib.error
import urllib.parse
from typing import Any

# ── Configuration ─────────────────────────────────────────────────────────────

BASE_URL  = "http://127.0.0.1:8000/api/v1"
HEALTH_URL = "http://127.0.0.1:8000/health"

# All 4 RBAC roles seeded by seed_data.py
TEST_USERS = [
    {"email": "admin@itbis.internal",   "password": "Admin1234!",   "role": "ADMINISTRATOR"},
    {"email": "manager@itbis.internal", "password": "Manager123!",  "role": "SECURITY_MANAGER"},
    {"email": "soc@itbis.internal",     "password": "SocEng123!",   "role": "SOC_ENGINEER"},
    {"email": "analyst@itbis.internal", "password": "Analyst123!",  "role": "SECURITY_ANALYST"},
]

PRIMARY_USER  = TEST_USERS[0]   # admin used for deeper API checks
RISK_LEVELS   = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]
EXPECTED_DEPTS = {"Finance", "IT Infrastructure", "Research", "Sales",
                  "Procurement", "Human Resources", "Legal", "Marketing",
                  "Customer Support", "Operations"}

# ── Colour helpers (ANSI) ─────────────────────────────────────────────────────

GREEN  = "\033[92m"
RED    = "\033[91m"
YELLOW = "\033[93m"
CYAN   = "\033[96m"
BOLD   = "\033[1m"
DIM    = "\033[2m"
RESET  = "\033[0m"

def ok(msg: str)   -> str: return f"{GREEN}✓  PASS{RESET}  {msg}"
def fail(msg: str) -> str: return f"{RED}✗  FAIL{RESET}  {msg}"
def warn(msg: str) -> str: return f"{YELLOW}⚠  WARN{RESET}  {msg}"
def info(msg: str) -> str: return f"{CYAN}ℹ  INFO{RESET}  {msg}"

# ── HTTP helpers ──────────────────────────────────────────────────────────────

def http_get(path: str, token: str) -> tuple[int, Any]:
    """GET request returning (status_code, parsed_json)."""
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        return e.code, {}
    except Exception as e:
        return 0, {"__error__": str(e)}


def http_post_form(path: str, data: dict[str, str]) -> tuple[int, Any]:
    """POST application/x-www-form-urlencoded — used for OAuth2 login."""
    encoded = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=8) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except Exception:
            body = {}
        return e.code, body
    except Exception as e:
        return 0, {"__error__": str(e)}


def check_server_alive() -> bool:
    """Ping the /health endpoint before running tests."""
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=4) as resp:
            return resp.status == 200
    except Exception:
        return False

# ── Result tracking ───────────────────────────────────────────────────────────

results: list[dict[str, Any]] = []   # {section, name, passed, detail}

def record(section: str, name: str, passed: bool, detail: str = "") -> None:
    results.append({"section": section, "name": name, "passed": passed, "detail": detail})
    icon = ok if passed else fail
    print(f"  {icon(name)}" + (f"  {DIM}{detail}{RESET}" if detail else ""))


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 1 — AUTH
# ══════════════════════════════════════════════════════════════════════════════

def run_auth_checks() -> str:
    """Login all 4 roles. Returns admin JWT for subsequent checks."""
    section = "AUTH"
    print(f"\n{BOLD}{CYAN}━━━  1. USER AUTHENTICATION & RBAC  ━━━{RESET}")
    admin_token = ""

    for user in TEST_USERS:
        status, body = http_post_form(
            "/auth/login",
            {"username": user["email"], "password": user["password"]},
        )
        token = body.get("access_token", "")
        passed = status == 200 and bool(token)
        detail = (
            f"role={user['role']}  token={'…' + token[-12:] if token else 'NONE'}"
        )
        record(section, f"Login  {user['email']}", passed, detail)

        if user["email"] == PRIMARY_USER["email"] and passed:
            admin_token = token

    # /auth/me — verify JWT round-trip for admin
    if admin_token:
        status, body = http_get("/auth/me", admin_token)
        me_ok = status == 200 and body.get("role") == "ADMINISTRATOR"
        record(section, "GET /auth/me (admin JWT round-trip)",
               me_ok, f"role={body.get('role')}  email={body.get('email')}")
    else:
        record(section, "GET /auth/me (admin JWT round-trip)", False, "No token — login failed")

    return admin_token


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — EMPLOYEES
# ══════════════════════════════════════════════════════════════════════════════

def run_employee_checks(token: str) -> list[dict]:
    section = "EMPLOYEES"
    print(f"\n{BOLD}{CYAN}━━━  2. EMPLOYEE API & RISK FILTERING  ━━━{RESET}")
    all_employees: list[dict] = []

    # 2a — Full employee list (expect exactly 15 seeded)
    status, body = http_get("/employees/?limit=200", token)
    all_employees = body if isinstance(body, list) else []
    count = len(all_employees)
    passed = status == 200 and count >= 15
    record(section, "GET /employees/ (list all)", passed,
           f"returned {count} employees (expected ≥15)")

    # 2b — Device info presence on every employee
    missing_device = [e["emp_id"] for e in all_employees
                      if not e.get("device_id") and not e.get("ip_address")]
    device_ok = len(missing_device) == 0
    record(section, "Device info present on all employees", device_ok,
           "all have device_id or ip_address" if device_ok
           else f"missing on: {missing_device[:5]}")

    # 2c — Risk category filter for each level
    for level in RISK_LEVELS:
        status, body = http_get(f"/employees/?risk_category={level}&limit=200", token)
        employees = body if isinstance(body, list) else []
        # Verify every returned employee actually has the requested risk_category
        mismatched = [e["emp_id"] for e in employees
                      if e.get("risk_category") != level]
        passed = status == 200 and len(mismatched) == 0
        record(
            section,
            f"Filter risk_category={level}",
            passed,
            f"{len(employees)} employees returned"
            + (f"  ⚠ mismatched: {mismatched}" if mismatched else ""),
        )

    # 2d — Risk distribution sanity check (all 4 categories present in full list)
    present_cats = {e.get("risk_category") for e in all_employees}
    all_cats_present = present_cats >= set(RISK_LEVELS)
    record(section, "All 4 risk categories present in dataset", all_cats_present,
           f"found: {sorted(present_cats)}")

    # 2e — Individual employee detail fetch
    if all_employees:
        sample_id = all_employees[0]["emp_id"]
        status, body = http_get(f"/employees/{sample_id}", token)
        has_assets = isinstance(body.get("assets"), list)
        passed = status == 200 and has_assets
        record(section, f"GET /employees/{sample_id} (detail + assets)", passed,
               f"assets count={len(body.get('assets', []))}"
               + f"  risk={body.get('risk_category')}  score={body.get('risk_score')}")

    return all_employees


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — TELEMETRY
# ══════════════════════════════════════════════════════════════════════════════

def run_telemetry_checks(token: str, employees: list[dict]) -> None:
    section = "TELEMETRY"
    print(f"\n{BOLD}{CYAN}━━━  3. TELEMETRY API & MONGODB CONNECTION  ━━━{RESET}")

    CANONICAL_EVENTS = {
        "LOGIN", "FILE_DOWNLOAD", "FILE_UPLOAD",
        "DATA_TRANSFER", "EMAIL_ACTIVITY", "PRIVILEGE_CHANGE", "REMOTE_ACCESS",
    }

    # NOTE: The backend exposes per-employee logs at /telemetry/logs/{emp_id}
    # and ingestion at POST /telemetry/ingest.
    # There is no generic flat-list route — tests target the implemented endpoints.

    # 3a — Per-employee telemetry for a CRITICAL-risk employee
    critical = next(
        (e for e in employees if e.get("risk_category") == "CRITICAL"), None
    )
    if critical:
        emp_id = critical["emp_id"]
        status, body = http_get(f"/telemetry/logs/{emp_id}?limit=20", token)
        logs_crit = body if isinstance(body, list) else []
        passed = status == 200 and len(logs_crit) > 0
        record(section, f"GET /telemetry/logs/{emp_id} (CRITICAL employee)", passed,
               f"{len(logs_crit)} events  risk=CRITICAL  score={critical.get('risk_score')}")
        if logs_crit:
            found_types = {l.get("event_type") for l in logs_crit}
            canonical_ok = bool(found_types & CANONICAL_EVENTS)
            record(section, "  Canonical event types in CRITICAL employee logs", canonical_ok,
                   f"found: {sorted(found_types & CANONICAL_EVENTS)}")
    else:
        record(section, "GET /telemetry/logs (CRITICAL employee)", False, "No CRITICAL employee found")

    # 3b — Per-employee telemetry for a HIGH-risk employee
    high = next(
        (e for e in employees if e.get("risk_category") == "HIGH"), None
    )
    if high:
        emp_id = high["emp_id"]
        status, body = http_get(f"/telemetry/logs/{emp_id}?limit=10", token)
        logs_high = body if isinstance(body, list) else []
        passed = status == 200 and len(logs_high) > 0
        record(section, f"GET /telemetry/logs/{emp_id} (HIGH employee)", passed,
               f"{len(logs_high)} events  risk=HIGH")
    else:
        record(section, "GET /telemetry/logs (HIGH employee)", False, "No HIGH employee found")

    # 3c — Telemetry event schema integrity check
    # Use the first employee from any risk level that returns logs
    probe_emp = (critical or high or (employees[0] if employees else None))
    if probe_emp:
        emp_id = probe_emp["emp_id"]
        _, body = http_get(f"/telemetry/logs/{emp_id}?limit=5", token)
        logs_probe = body if isinstance(body, list) else []
        if logs_probe:
            first = logs_probe[0]
            required_keys = {"event_type", "severity", "timestamp"}
            has_required  = required_keys.issubset(first.keys())
            record(section, "Telemetry event schema (event_type, severity, timestamp)",
                   has_required,
                   f"event_type={first.get('event_type')}  severity={first.get('severity')}"
                   + ("" if has_required else f"  missing={required_keys - first.keys()}"))

            # 3d — Severity values are valid Milestone-1 values
            VALID_SEVERITIES = {"CRITICAL", "HIGH", "MEDIUM", "LOW", "INFO"}
            all_sevs  = {l.get("severity") for l in logs_probe}
            sev_valid = all_sevs <= VALID_SEVERITIES
            record(section, "  Severity values are valid Milestone-1 levels", sev_valid,
                   f"found: {sorted(s for s in all_sevs if s)}")

    # 3e — MongoDB active: confirm total seeded events across two employees
    total_events = 0
    checked_emps = []
    for emp in employees[:5]:   # sample first 5
        _, body = http_get(f"/telemetry/logs/{emp['emp_id']}?limit=20", token)
        n = len(body) if isinstance(body, list) else 0
        total_events += n
        checked_emps.append(emp["emp_id"])
    mongo_ok = total_events > 0
    record(section, "MongoDB active — events retrievable across sampled employees",
           mongo_ok,
           f"{total_events} total events across {len(checked_emps)} sampled employees")


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — ANALYTICS
# ══════════════════════════════════════════════════════════════════════════════

def run_analytics_checks(token: str) -> None:
    section = "ANALYTICS"
    print(f"\n{BOLD}{CYAN}━━━  4. ANALYTICS & RISK SCORING ENGINE  ━━━{RESET}")

    # 4a — Summary endpoint
    status, body = http_get("/analytics/summary", token)
    passed = status == 200
    record(section, "GET /analytics/summary (200 OK)", passed,
           f"total_employees={body.get('total_employees')}  "
           f"critical={body.get('critical_count')}  "
           f"high_risk={body.get('high_risk_count')}")

    if not passed:
        return

    # 4b — Non-zero totals
    total = body.get("total_employees", 0)
    record(section, "total_employees > 0", total >= 15,
           f"value={total} (expected ≥15)")

    # 4c — Threat score is non-zero and in valid range
    avg_score = body.get("average_threat_score", 0)
    score_ok = isinstance(avg_score, (int, float)) and 0 < avg_score <= 100
    record(section, "average_threat_score is non-zero and ≤100", score_ok,
           f"value={avg_score}")

    # 4d — Risk distribution covers all 4 categories
    dist = body.get("risk_distribution", {})
    dist_ok = all(cat in dist for cat in RISK_LEVELS) and sum(dist.values()) == total
    record(section, "risk_distribution covers all 4 categories and sums to total",
           dist_ok,
           "  ".join(f"{k}={v}" for k, v in dist.items()))

    # 4e — Department breakdown present and non-empty
    breakdown = body.get("department_breakdown", [])
    dept_ok = isinstance(breakdown, list) and len(breakdown) > 0
    record(section, "department_breakdown is non-empty", dept_ok,
           f"{len(breakdown)} departments returned")

    # 4f — Each dept has required fields with valid values
    if breakdown:
        schema_failures = []
        for dept in breakdown:
            if not all(k in dept for k in ("department", "employee_count", "avg_risk_score", "high_risk_count")):
                schema_failures.append(dept.get("department", "?"))
            if not (0 <= dept.get("avg_risk_score", -1) <= 100):
                schema_failures.append(f"{dept['department']}(score={dept.get('avg_risk_score')})")
        schema_ok = len(schema_failures) == 0
        record(section, "All departments have valid schema + score 0–100", schema_ok,
               f"validated {len(breakdown)} depts"
               + (f"  failures: {schema_failures}" if schema_failures else ""))

        # Show department scores sorted (highest risk first)
        print(f"\n  {DIM}Department Risk Scores (sorted by threat level):{RESET}")
        for d in sorted(breakdown, key=lambda x: x.get("avg_risk_score", 0), reverse=True):
            bar_len  = int(d["avg_risk_score"] / 5)   # max 20 chars
            bar_char = "█" * bar_len + "░" * (20 - bar_len)
            score    = d["avg_risk_score"]
            color    = RED if score >= 80 else YELLOW if score >= 60 else CYAN if score >= 30 else GREEN
            print(f"  {DIM}│{RESET}  {d['department']:<22}  {color}{bar_char}{RESET}  "
                  f"{color}{score:5.1f}{RESET}  "
                  f"{DIM}({d['employee_count']} emp, {d['high_risk_count']} high-risk){RESET}")

    # 4g — Risk recalculation (calculate-risk endpoint)
    print(f"\n  {DIM}Testing risk recalculation engine...{RESET}")
    calc_url = f"{BASE_URL}/analytics/calculate-risk"
    payload  = json.dumps({"emp_id": "emp_1001", "window_hours": 24}).encode()
    req = urllib.request.Request(
        calc_url,
        data=payload,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=12) as resp:
            calc_status = resp.status
            calc_body   = json.loads(resp.read())
    except urllib.error.HTTPError as e:
        calc_status = e.code
        calc_body   = {}
    except Exception as e:
        calc_status = 0
        calc_body   = {"__error__": str(e)}

    calc_ok = (
        calc_status == 200
        and isinstance(calc_body.get("threat_score"), (int, float))
        and calc_body.get("risk_category") in RISK_LEVELS
    )
    record(section, "POST /analytics/calculate-risk (emp_1001, 24h window)", calc_ok,
           f"threat_score={calc_body.get('threat_score')}  "
           f"category={calc_body.get('risk_category')}  "
           f"anomaly={calc_body.get('anomaly_weight')}  "
           f"freq={calc_body.get('frequency')}")


# ══════════════════════════════════════════════════════════════════════════════
# SUMMARY TABLE
# ══════════════════════════════════════════════════════════════════════════════

def print_summary() -> int:
    """Print final result table. Returns exit code (0 = all pass)."""
    total  = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed

    # Group by section
    sections: dict[str, list[dict]] = {}
    for r in results:
        sections.setdefault(r["section"], []).append(r)

    col_w = 52   # name column width

    print(f"\n{'━' * 72}")
    print(f"{BOLD}  MILESTONE 1 — VERIFICATION SUMMARY{RESET}")
    print(f"{'━' * 72}")
    print(f"  {'TEST NAME':<{col_w}}  {'STATUS':^8}  DETAIL")
    print(f"  {'-' * col_w}  {'-' * 8}  {'-' * 40}")

    prev_section = ""
    for r in results:
        if r["section"] != prev_section:
            print(f"\n  {BOLD}{r['section']}{RESET}")
            prev_section = r["section"]
        status_str = f"{GREEN}PASS{RESET}" if r["passed"] else f"{RED}FAIL{RESET}"
        name_trunc = r["name"][:col_w]
        detail = (r["detail"][:55] + "…") if len(r["detail"]) > 56 else r["detail"]
        print(f"  {name_trunc:<{col_w}}  {status_str:^8}  {DIM}{detail}{RESET}")

    print(f"\n{'━' * 72}")
    result_color = GREEN if failed == 0 else RED
    print(
        f"  {BOLD}Result: {result_color}{passed}/{total} tests passed{RESET}"
        + (f"  {RED}({failed} FAILED){RESET}" if failed else f"  {GREEN}✓ All checks green{RESET}")
    )
    print(f"{'━' * 72}\n")
    return 0 if failed == 0 else 1


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def main() -> int:
    print(f"\n{'━' * 72}")
    print(f"{BOLD}  ITBIS — Milestone 1 Health & Verification Check{RESET}")
    print(f"  Backend: {BASE_URL}")
    print(f"{'━' * 72}")

    # Pre-flight: is the server up?
    print(f"\n{info('Checking backend server availability...')}")
    if not check_server_alive():
        print(f"\n  {fail('Backend is NOT reachable at http://127.0.0.1:8000')}")
        print(f"  {warn('Start the server:  uvicorn app.main:app --reload --port 8000')}")
        print(f"  {warn('Then re-run this script.')}\n")
        return 1
    print(f"  {ok('Backend server is UP at http://127.0.0.1:8000')}")
    time.sleep(0.2)

    # Run all sections
    admin_token = run_auth_checks()
    if not admin_token:
        print(f"\n  {fail('Cannot continue — admin login failed. Run seed_data.py first.')}\n")
        return 1

    employees = run_employee_checks(admin_token)
    run_telemetry_checks(admin_token, employees)
    run_analytics_checks(admin_token)

    return print_summary()


if __name__ == "__main__":
    sys.exit(main())
