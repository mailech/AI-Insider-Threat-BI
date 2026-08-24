#!/usr/bin/env python3
"""
ITBIS — Milestone 2 Step 2: Real-Time ML Inference & Baseline Persistence Verification
======================================================================================
Validates the end-to-end real-time ML inference pipeline connected to /api/v1/telemetry/ingest:
  1. Service Connectivity & Authentication (OAuth2 JWT Bearer tokens)
  2. Benign Telemetry Ingestion -> Real-time baseline inference (NORMAL/LOW risk)
  3. Threat Telemetry Ingestion -> Instant anomaly escalation (HIGH/CRITICAL risk)
  4. Real-time Z-score Risk Factor Attribution (identifying exfiltration/privilege spikes)
  5. Dual-Database Instant Persistence (PostgreSQL Employee table + MongoDB employee_risk_baselines)
  6. Edge Case & Error Handling (Non-existent employee 404, Unauthorized 401)

Run from backend/ directory:
    python test_realtime_inference.py
"""

from __future__ import annotations

import json
import os
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# Enable UTF-8 on Windows terminal
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ── Configuration ─────────────────────────────────────────────────────────────

BASE_URL   = "http://127.0.0.1:8000/api/v1"
HEALTH_URL = "http://127.0.0.1:8000/health"

ADMIN_USER = {"username": "admin@itbis.internal", "password": "Admin1234!"}
ANALYST_USER = {"username": "analyst@itbis.internal", "password": "Analyst123!"}

# ANSI Colors
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

results: list[dict[str, Any]] = []

def record(section: str, name: str, passed: bool, detail: str = "") -> None:
    results.append({"section": section, "name": name, "passed": passed, "detail": detail})
    icon = ok if passed else fail
    print(f"  {icon(name)}" + (f"  {DIM}{detail}{RESET}" if detail else ""))


# ── HTTP Helpers ──────────────────────────────────────────────────────────────

def http_get(path: str, token: str) -> tuple[int, Any]:
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except Exception:
            body = {}
        return e.code, body
    except Exception as e:
        return 0, {"__error__": str(e)}


def http_post_json(path: str, payload: dict[str, Any], token: Optional[str] = None) -> tuple[int, Any]:
    data = json.dumps(payload).encode("utf-8")
    headers = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"

    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except Exception:
            body = {}
        return e.code, body
    except Exception as e:
        return 0, {"__error__": str(e)}


def http_post_form(path: str, data: dict[str, str]) -> tuple[int, Any]:
    encoded = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
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
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=4) as resp:
            return resp.status == 200
    except Exception:
        return False


# ══════════════════════════════════════════════════════════════════════════════
# MAIN TEST SUITE
# ══════════════════════════════════════════════════════════════════════════════

def run_tests() -> None:
    start_time = time.time()
    print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
    print(f"{BOLD}{CYAN}  ITBIS — REAL-TIME ML INFERENCE & BASELINE PERSISTENCE TEST SUITE{RESET}")
    print(f"{BOLD}{CYAN}{'='*80}{RESET}")

    # 0. Health check
    if not check_server_alive():
        print(f"\n{RED}ERROR: FastAPI backend is not running at {HEALTH_URL}.{RESET}")
        print(f"Please start the backend server before running this test:\n")
        print(f"    cd backend\n    uvicorn app.main:app --reload --host 127.0.0.1 --port 8000\n")
        sys.exit(1)

    print(f"{GREEN}✓  Backend server is healthy and responding at {BASE_URL}{RESET}")

    # 1. Authentication
    print(f"\n{BOLD}{CYAN}━━━  1. AUTHENTICATION & ACCESS CONTROL  ━━━{RESET}")
    status, body = http_post_form("/auth/login", ADMIN_USER)
    admin_token = body.get("access_token", "")
    auth_ok = status == 200 and bool(admin_token)
    record("1. AUTH", "Admin OAuth2 Authentication", auth_ok, f"token={admin_token[:16]}…")
    if not auth_ok:
        print(f"{RED}Aborting tests: Failed to obtain admin token.{RESET}")
        sys.exit(1)

    # 2. Get Employee Cohort
    print(f"\n{BOLD}{CYAN}━━━  2. RETRIEVING EMPLOYEE COHORT  ━━━{RESET}")
    status, employees = http_get("/employees/?limit=100", admin_token)
    emp_list = employees if isinstance(employees, list) else []
    record("2. EMPLOYEES", "Employee Directory Lookup", status == 200 and len(emp_list) >= 5, f"{len(emp_list)} employees registered")

    emp_ids = [e["emp_id"] for e in emp_list]
    target_threat_emp = "emp_1001" if "emp_1001" in emp_ids else emp_ids[0]
    target_benign_emp = "emp_1004" if "emp_1004" in emp_ids else emp_ids[-1]

    print(f"  {info(f'Target Benign Persona: {target_benign_emp}')}")
    print(f"  {info(f'Target Threat Persona: {target_threat_emp}')}")

    # 3. Real-Time Telemetry Ingestion — Benign Ingestion Test
    print(f"\n{BOLD}{CYAN}━━━  3. BENIGN TELEMETRY INGESTION & REAL-TIME BASELINE INFERENCE  ━━━{RESET}")
    now_iso = datetime.now(timezone.utc).isoformat()
    benign_event = {
        "emp_id": target_benign_emp,
        "event_type": "FILE_DOWNLOAD",
        "severity": "INFO",
        "source_ip": "10.0.4.15",
        "payload": {
            "file_name": "quarterly_budget_q2.xlsx",
            "file_path": "/shared/finance/quarterly_budget_q2.xlsx",
            "size_mb": 1.5,
            "action": "READ",
            "work_hours": True,
        },
        "timestamp": now_iso,
    }

    ingest_status, ingest_res = http_post_json("/telemetry/ingest", benign_event, admin_token)
    ingest_pass = (
        ingest_status == 201
        and ingest_res.get("status") == "success"
        and bool(ingest_res.get("log_id"))
        and ingest_res.get("threat_score") is not None
        and ingest_res.get("anomaly_score") is not None
    )
    record(
        "3. BENIGN INGEST",
        f"POST /telemetry/ingest for {target_benign_emp}",
        ingest_pass,
        f"log_id={ingest_res.get('log_id')}  threat_score={ingest_res.get('threat_score')}  anomaly_score={ingest_res.get('anomaly_score')}  sev={ingest_res.get('severity')}",
    )

    # Verify PostgreSQL Employee Record Updated
    status, emp_rec = http_get(f"/employees/{target_benign_emp}", admin_token)
    db_score = emp_rec.get("risk_score", 0.0)
    db_cat = emp_rec.get("risk_category", "")
    pg_pass = status == 200 and db_cat in ("LOW", "MEDIUM")
    record(
        "3. BENIGN INGEST",
        "PostgreSQL Employee Profile Instant Persistence",
        pg_pass,
        f"risk_score={db_score} (raw) -> {round(db_score*100)}/100  category={db_cat}  updated_at={emp_rec.get('updated_at')}",
    )

    # 4. Real-Time Telemetry Ingestion — Threat & Anomaly Spike Ingestion Test
    print(f"\n{BOLD}{CYAN}━━━  4. CRITICAL THREAT EVENT & REAL-TIME ANOMALY ESCALATION  ━━━{RESET}")
    # Ingest a severe data exfiltration burst event
    exfil_event = {
        "emp_id": target_threat_emp,
        "event_type": "FILE_UPLOAD",
        "severity": "CRITICAL",
        "source_ip": "192.168.1.105",
        "payload": {
            "file_name": "customer_pii_vault_export.tar.gz",
            "destination_ip": "198.51.100.42",
            "destination_country": "UNKNOWN",
            "size_mb": 4250.0,
            "external_transfer": True,
            "off_hours": True,
            "protocol": "SFTP",
            "encrypted": False,
        },
        "timestamp": now_iso,
    }

    t_status, t_res = http_post_json("/telemetry/ingest", exfil_event, admin_token)
    t_threat_score = t_res.get("threat_score", 0)
    t_anom_score = t_res.get("anomaly_score", 0.0)
    t_sev = t_res.get("severity", "")
    t_factors = t_res.get("contributing_risk_factors", [])
    t_is_anom = t_res.get("is_anomaly", False)

    exfil_pass = (
        t_status == 201
        and t_res.get("status") == "success"
        and t_threat_score >= 60
        and t_anom_score >= 50.0
        and t_sev in ("HIGH", "CRITICAL")
        and t_is_anom is True
    )
    record(
        "4. THREAT INGEST",
        f"Real-Time Exfiltration Anomaly Spike for {target_threat_emp}",
        exfil_pass,
        f"threat_score={t_threat_score}/100  anomaly_score={t_anom_score}/100  severity={t_sev}  is_anomaly={t_is_anom}",
    )

    # 5. Risk Factor Attribution (Z-scores)
    print(f"\n{BOLD}{CYAN}━━━  5. RISK FACTOR ATTRIBUTION (Z-SCORE ANALYSIS)  ━━━{RESET}")
    factors_ok = len(t_factors) > 0 and any(
        "upload" in f.get("feature_name", "").lower() or "exfiltration" in f.get("feature_label", "").lower() or "file" in f.get("feature_label", "").lower() or f.get("z_score", 0) > 1.0
        for f in t_factors
    )
    top_factor = t_factors[0] if t_factors else {}
    record(
        "5. ATTRIBUTIONS",
        "Top Contributing Risk Factors Extracted",
        factors_ok,
        f"top_factor='{top_factor.get('feature_label')}'  z_score={top_factor.get('z_score')}  val={top_factor.get('value')}  baseline={top_factor.get('baseline_mean')}",
    )

    # 6. Verify Dual-Database Persistence for Threat Persona
    print(f"\n{BOLD}{CYAN}━━━  6. DUAL-DATABASE PERSISTENCE VERIFICATION  ━━━{RESET}")
    # 6a. PostgreSQL Check
    status, threat_emp_rec = http_get(f"/employees/{target_threat_emp}", admin_token)
    t_db_score = threat_emp_rec.get("risk_score", 0.0)
    t_db_cat = threat_emp_rec.get("risk_category", "")
    pg_threat_pass = status == 200 and t_db_cat in ("HIGH", "CRITICAL") and t_db_score >= 0.60
    record(
        "6. PERSISTENCE",
        "PostgreSQL Employee Threat Escalation Persistence",
        pg_threat_pass,
        f"persisted risk_score={t_db_score} (normalized) -> category={t_db_cat}",
    )

    # 6b. Analytics Baseline Route verification
    status, baseline_rec = http_get(f"/analytics/employee/{target_threat_emp}/baseline", admin_token)
    baseline_pass = (
        status == 200
        and baseline_rec.get("employee_id") == target_threat_emp
        and baseline_rec.get("anomaly_score") is not None
        and len(baseline_rec.get("metrics", [])) == 8
    )
    record(
        "6. PERSISTENCE",
        "GET /analytics/employee/{id}/baseline Alignment",
        baseline_pass,
        f"metrics_count={len(baseline_rec.get('metrics', []))}  top_deviations={len(baseline_rec.get('top_deviations', []))}",
    )

    # 7. Edge Cases & Validation
    print(f"\n{BOLD}{CYAN}━━━  7. EDGE CASES & ERROR HANDLING  ━━━{RESET}")
    # 7a. Ingest for unknown employee
    bad_event = {
        "emp_id": "emp_99999",
        "event_type": "LOGIN",
        "severity": "INFO",
    }
    bad_status, bad_res = http_post_json("/telemetry/ingest", bad_event, admin_token)
    record(
        "7. EDGE CASES",
        "POST /telemetry/ingest with Unknown Employee (404 Not Found)",
        bad_status == 404,
        f"status={bad_status}  detail='{bad_res.get('detail')}'",
    )

    # 7b. Ingest without authorization
    unauth_status, unauth_res = http_post_json("/telemetry/ingest", benign_event, token=None)
    record(
        "7. EDGE CASES",
        "POST /telemetry/ingest without Authorization Token (401 Unauthorized)",
        unauth_status == 401,
        f"status={unauth_status}",
    )

    # ── Summary Report ────────────────────────────────────────────────────────
    duration = time.time() - start_time
    total_checks = len(results)
    passed_checks = sum(1 for r in results if r["passed"])
    failed_checks = total_checks - passed_checks

    print(f"\n{BOLD}{CYAN}{'='*80}{RESET}")
    print(f"{BOLD}  VERIFICATION SUMMARY{RESET}")
    print(f"{BOLD}{CYAN}{'='*80}{RESET}")
    print(f"  Total Validations : {total_checks}")
    print(f"  Passed            : {GREEN}{passed_checks}{RESET}")
    print(f"  Failed            : {RED if failed_checks else GREEN}{failed_checks}{RESET}")
    print(f"  Execution Time    : {duration:.2f}s")
    print(f"{BOLD}{CYAN}{'='*80}{RESET}\n")

    if failed_checks == 0:
        print(f"{GREEN}{BOLD}✅  ALL REAL-TIME ML INFERENCE & BASELINE PERSISTENCE CHECKS PASSED!{RESET}\n")
    else:
        print(f"{RED}{BOLD}❌  SOME CHECKS FAILED. Review output above.{RESET}\n")
        sys.exit(1)


if __name__ == "__main__":
    run_tests()
