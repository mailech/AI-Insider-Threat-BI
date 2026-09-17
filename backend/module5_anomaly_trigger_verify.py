#!/usr/bin/env python3
"""
ITBIS — Module 5: Anomaly Detection Engine Trigger Verification
================================================================
Validates IsolationForest ML engine flags three canonical insider-threat triggers:

  1. Off-hours login spike (e.g., login at 3 AM)
  2. Abnormal data exfiltration (e.g., 10 GB download via USB or Web)
  3. Privilege escalation / unauthorized access attempt

Runs feature extraction + ML inference (direct) and optional live API ingest checks.
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ── ANSI helpers ──────────────────────────────────────────────────────────────
GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

BASE_URL = "http://127.0.0.1:8000/api/v1"
HEALTH_URL = "http://127.0.0.1:8000/health"
ADMIN_CREDENTIALS = {"username": "admin@itbis.internal", "password": "Admin1234!"}

results: list[dict[str, Any]] = []


def ok(msg: str) -> str:
    return f"{GREEN}✓  PASS{RESET}  {msg}"


def fail(msg: str) -> str:
    return f"{RED}✗  FAIL{RESET}  {msg}"


def record(name: str, passed: bool, detail: str = "") -> None:
    results.append({"name": name, "passed": passed, "detail": detail})
    icon = ok if passed else fail
    print(f"  {icon(name)}" + (f"  {DIM}{detail}{RESET}" if detail else ""))


def check_server_alive() -> bool:
    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=4) as resp:
            return resp.status == 200
    except Exception:
        return False


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
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read())
        except Exception:
            body = {}
        return exc.code, body


def http_post_json(path: str, payload: dict[str, Any], token: str) -> tuple[int, Any]:
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read())
        except Exception:
            body = {}
        return exc.code, body


def factor_labels(pred: dict[str, Any]) -> list[str]:
    factors = pred.get("contributing_risk_factors", [])
    return [str(f.get("feature_label", "")) for f in factors]


def factor_names(pred: dict[str, Any]) -> list[str]:
    factors = pred.get("contributing_risk_factors", [])
    return [str(f.get("feature_name", "")) for f in factors]


def run_ml_direct_tests() -> None:
    from app.schemas.features import EmployeeFeatureVector
    from app.services.feature_extraction import _compute_vector_from_logs
    from app.services.ml_engine import load_trained_model, predict_employee_anomaly

    print(f"\n{BOLD}{CYAN}━━━  MODULE 5 — ISOLATION FOREST DIRECT INFERENCE  ━━━{RESET}")

    model, scaler, meta = load_trained_model(force_reload=True)
    record(
        "ML artifacts loaded (IsolationForest + StandardScaler)",
        model is not None and scaler is not None,
        f"n_estimators={getattr(model, 'n_estimators', '?')}  samples={meta.get('total_samples', '?')}",
    )

    # ── Trigger 1: Off-hours login spike (3 AM) ─────────────────────────────
    print(f"\n{BOLD}  Trigger 1 — Off-Hours Login Spike (3 AM){RESET}")
    three_am = datetime(2026, 9, 17, 3, 15, 0, tzinfo=timezone.utc)
    off_hours_logs = [
        {
            "event_type": "LOGIN",
            "severity": "MEDIUM",
            "timestamp": three_am,
            "payload": {"off_hours": True, "source_ip": "203.0.113.55", "status": "SUCCESS"},
        }
        for _ in range(6)
    ]
    off_vec = _compute_vector_from_logs("test_off_hours", 14, off_hours_logs)
    off_pred = predict_employee_anomaly(off_vec, model=model, scaler=scaler)

    record(
        "Feature extraction: off_hours_logon_count >= 6",
        off_vec.off_hours_logon_count >= 6,
        f"off_hours_logon_count={off_vec.off_hours_logon_count}",
    )
    record(
        "ML flags off-hours login spike as anomaly",
        off_pred["is_anomaly"] and off_pred["anomaly_score"] >= 50.0,
        f"score={off_pred['anomaly_score']}/100  severity={off_pred['severity']}  is_anomaly={off_pred['is_anomaly']}",
    )
    record(
        "Anomaly indicator: Off-Hours & Weekend Logons attributed",
        "off_hours_logon_count" in factor_names(off_pred),
        f"factors={factor_labels(off_pred)}",
    )

    # ── Trigger 2: Abnormal data exfiltration (10 GB) ───────────────────────
    print(f"\n{BOLD}  Trigger 2 — Abnormal Data Exfiltration (10 GB USB + Web){RESET}")
    exfil_logs = [
        {
            "event_type": "FILE_DOWNLOAD",
            "severity": "CRITICAL",
            "timestamp": datetime.now(timezone.utc),
            "payload": {"size_mb": 5120.0, "protocol": "HTTPS", "external_transfer": True},
        },
        {
            "event_type": "FILE_DOWNLOAD",
            "severity": "CRITICAL",
            "timestamp": datetime.now(timezone.utc),
            "payload": {"size_mb": 5120.0, "protocol": "USB", "device_type": "USB_STORAGE"},
        },
        {
            "event_type": "USB_INSERT",
            "severity": "HIGH",
            "timestamp": datetime.now(timezone.utc),
            "payload": {"activity": "inserted", "device_type": "USB_STORAGE"},
        },
    ]
    exfil_vec = _compute_vector_from_logs("test_exfiltration", 14, exfil_logs)
    exfil_pred = predict_employee_anomaly(exfil_vec, model=model, scaler=scaler)

    record(
        "Feature extraction: total_file_download_mb >= 10240",
        exfil_vec.total_file_download_mb >= 10240.0,
        f"download={exfil_vec.total_file_download_mb}MB  usb={exfil_vec.usb_device_connect_count}",
    )
    record(
        "ML flags 10 GB exfiltration as anomaly",
        exfil_pred["is_anomaly"] and exfil_pred["anomaly_score"] >= 50.0,
        f"score={exfil_pred['anomaly_score']}/100  severity={exfil_pred['severity']}  is_anomaly={exfil_pred['is_anomaly']}",
    )
    record(
        "Anomaly indicator: File Downloads attributed",
        "total_file_download_mb" in factor_names(exfil_pred),
        f"factors={factor_labels(exfil_pred)}",
    )

    # Web-only upload variant
    web_exfil_vec = EmployeeFeatureVector(
        employee_id="test_web_exfil",
        total_file_upload_mb=10240.0,
        critical_event_count=5,
    )
    web_pred = predict_employee_anomaly(web_exfil_vec, model=model, scaler=scaler)
    record(
        "ML flags 10 GB web upload exfiltration as anomaly",
        web_pred["is_anomaly"] and web_pred["anomaly_score"] >= 50.0,
        f"score={web_pred['anomaly_score']}/100  severity={web_pred['severity']}",
    )
    record(
        "Anomaly indicator: File Uploads & Exfiltration attributed",
        "total_file_upload_mb" in factor_names(web_pred),
        f"factors={factor_labels(web_pred)}",
    )

    # ── Trigger 3: Privilege escalation / unauthorized access ─────────────────
    print(f"\n{BOLD}  Trigger 3 — Privilege Escalation / Unauthorized Access{RESET}")
    priv_logs = [
        {
            "event_type": "PRIVILEGE_CHANGE",
            "severity": "CRITICAL",
            "timestamp": datetime.now(timezone.utc),
            "payload": {"approved": False, "method": "sudo_abuse", "from_level": "USER", "to_level": "ADMIN"},
        }
        for _ in range(4)
    ] + [
        {
            "event_type": "LOGIN",
            "severity": "HIGH",
            "timestamp": datetime.now(timezone.utc),
            "payload": {"status": "FAILED", "attempts": 3},
        }
        for _ in range(3)
    ]
    priv_vec = _compute_vector_from_logs("test_priv_esc", 14, priv_logs)
    priv_pred = predict_employee_anomaly(priv_vec, model=model, scaler=scaler)

    record(
        "Feature extraction: privilege_escalation_count >= 4",
        priv_vec.privilege_escalation_count >= 4,
        f"priv_esc={priv_vec.privilege_escalation_count}  failed_logon={priv_vec.failed_logon_count}",
    )
    record(
        "ML flags privilege escalation as anomaly",
        priv_pred["is_anomaly"] and priv_pred["anomaly_score"] >= 50.0,
        f"score={priv_pred['anomaly_score']}/100  severity={priv_pred['severity']}  is_anomaly={priv_pred['is_anomaly']}",
    )
    record(
        "Anomaly indicator: Privilege Escalation Attempts attributed",
        "privilege_escalation_count" in factor_names(priv_pred),
        f"factors={factor_labels(priv_pred)}",
    )

    # ── Seeded threat personas (live DB profiles) ───────────────────────────
    print(f"\n{BOLD}  Seeded Threat Personas (emp_1001 / emp_1002 / emp_1003){RESET}")
    try:
        from app.services.feature_extraction import extract_all_employee_features_sync

        vectors = extract_all_employee_features_sync(window_days=14)
        vec_map = {v.employee_id: v for v in vectors}

        persona_checks = [
            ("emp_1001", "Off-hours + Exfiltration", lambda v: v.off_hours_logon_count >= 1 and v.total_file_upload_mb >= 500),
            ("emp_1002", "Privilege Escalation", lambda v: v.privilege_escalation_count >= 3),
            ("emp_1003", "USB + Mass Download", lambda v: v.usb_device_connect_count >= 2 and v.total_file_download_mb >= 500),
        ]
        for emp_id, label, feat_check in persona_checks:
            vec = vec_map.get(emp_id)
            if not vec:
                record(f"Persona {emp_id} ({label}): feature vector exists", False, "vector missing")
                continue
            pred = predict_employee_anomaly(vec, model=model, scaler=scaler)
            record(
                f"Persona {emp_id} ({label}): features present",
                feat_check(vec),
                f"off_hrs={vec.off_hours_logon_count}  upload={vec.total_file_upload_mb}MB  priv={vec.privilege_escalation_count}",
            )
            record(
                f"Persona {emp_id} ({label}): ML anomaly flagged",
                pred["is_anomaly"] and pred["anomaly_score"] >= 70.0,
                f"score={pred['anomaly_score']}/100  severity={pred['severity']}  factors={factor_labels(pred)[:2]}",
            )
    except Exception as exc:
        record("Seeded persona DB extraction", False, str(exc))


def run_api_ingest_tests(token: str) -> None:
    print(f"\n{BOLD}{CYAN}━━━  MODULE 5 — LIVE API TELEMETRY INGEST + ML HOOK  ━━━{RESET}")
    now = datetime.now(timezone.utc).isoformat()
    test_emp = "emp_1004"

    # Trigger 1 — 3 AM login
    status, body = http_post_json(
        "/telemetry/ingest",
        {
            "emp_id": test_emp,
            "event_type": "LOGIN",
            "severity": "MEDIUM",
            "source_ip": "203.0.113.99",
            "payload": {"off_hours": True, "login_hour": 3, "status": "SUCCESS"},
            "timestamp": "2026-09-17T03:00:00Z",
        },
        token,
    )
    record(
        "API ingest: off-hours 3 AM login accepted",
        status == 201 and body.get("status") == "success",
        f"HTTP {status}  anomaly_score={body.get('anomaly_score')}  severity={body.get('severity')}",
    )

    # Trigger 2 — 10 GB exfiltration
    status, body = http_post_json(
        "/telemetry/ingest",
        {
            "emp_id": "emp_1001",
            "event_type": "FILE_UPLOAD",
            "severity": "CRITICAL",
            "source_ip": "192.168.1.105",
            "payload": {
                "file_name": "mass_exfil_archive.tar.gz",
                "size_mb": 10240.0,
                "external_transfer": True,
                "off_hours": True,
                "protocol": "HTTPS",
            },
            "timestamp": now,
        },
        token,
    )
    factors = body.get("contributing_risk_factors", [])
    factor_str = [f.get("feature_label", "") for f in factors[:2]]
    record(
        "API ingest: 10 GB exfiltration flagged as anomaly",
        status == 201 and body.get("is_anomaly") is True and float(body.get("anomaly_score", 0)) >= 50.0,
        f"score={body.get('anomaly_score')}/100  severity={body.get('severity')}  factors={factor_str}",
    )

    # Trigger 3 — privilege escalation
    status, body = http_post_json(
        "/telemetry/ingest",
        {
            "emp_id": "emp_1002",
            "event_type": "PRIVILEGE_CHANGE",
            "severity": "CRITICAL",
            "source_ip": "10.0.2.50",
            "payload": {
                "approved": False,
                "method": "sudo_abuse",
                "from_level": "USER",
                "to_level": "ROOT",
                "target_user": "root",
            },
            "timestamp": now,
        },
        token,
    )
    factors = body.get("contributing_risk_factors", [])
    factor_str = [f.get("feature_label", "") for f in factors[:2]]
    record(
        "API ingest: privilege escalation flagged as anomaly",
        status == 201 and body.get("is_anomaly") is True and float(body.get("anomaly_score", 0)) >= 50.0,
        f"score={body.get('anomaly_score')}/100  severity={body.get('severity')}  factors={factor_str}",
    )


def print_summary() -> int:
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed

    print(f"\n{'━' * 74}")
    print(f"{BOLD}  MODULE 5 — ANOMALY DETECTION ENGINE TEST SUMMARY{RESET}")
    print(f"{'━' * 74}")
    print(f"  {'TEST':<52}  {'STATUS':^8}  DETAIL")
    print(f"  {'-' * 52}  {'-' * 8}  {'-' * 30}")

    for r in results:
        status_str = f"{GREEN}PASS{RESET}" if r["passed"] else f"{RED}FAIL{RESET}"
        detail = (r["detail"][:45] + "…") if len(r["detail"]) > 46 else r["detail"]
        print(f"  {r['name'][:52]:<52}  {status_str:^8}  {DIM}{detail}{RESET}")

    health_pct = round((passed / total) * 100, 1) if total else 0.0
    color = GREEN if failed == 0 else RED
    print(f"\n{'━' * 74}")
    print(
        f"  {BOLD}Results: {color}{health_pct}% ({passed}/{total} passed){RESET}"
        + (f"  {RED}({failed} FAILED){RESET}" if failed else f"  {GREEN}✓ All anomaly triggers verified{RESET}")
    )
    print(f"{'━' * 74}\n")
    return 0 if failed == 0 else 1


def main() -> int:
    print(f"\n{'━' * 74}")
    print(f"{BOLD}  ITBIS Module 5 — Anomaly Detection Engine (IsolationForest) Verification{RESET}")
    print(f"{'━' * 74}")

    run_ml_direct_tests()

    if check_server_alive():
        print(f"\n  {ok('FastAPI backend reachable — running live API ingest tests')}")
        status, body = http_post_form("/auth/login", ADMIN_CREDENTIALS)
        token = body.get("access_token", "")
        if status == 200 and token:
            run_api_ingest_tests(token)
        else:
            record("API auth for ingest tests", False, f"HTTP {status}")
    else:
        print(f"\n  {YELLOW}⚠  WARN{RESET}  Backend not running — skipping live API ingest tests")
        print(f"  {DIM}Start with: cd backend && python -m uvicorn app.main:app --port 8000{RESET}")

    return print_summary()


if __name__ == "__main__":
    sys.exit(main())
