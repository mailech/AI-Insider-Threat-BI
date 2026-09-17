#!/usr/bin/env python3
"""
ITBIS — Module 7: Threat Investigation Module Verification
============================================================
Validates the SOC investigation workflow end-to-end:

  1. Auto-create an investigation case from a high-risk ML anomaly (>75 score)
  2. Build a chronological activity timeline for the suspect employee
  3. Correlate multi-source evidence (login times, USB logs, network downloads)
     attached to the incident case

Run from backend/ with API + MongoDB + PostgreSQL running:
    python module7_threat_investigation_verify.py
"""

from __future__ import annotations

import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
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
SOC_CREDENTIALS = {"username": "soc@itbis.internal", "password": "SocEng123!"}

# Chen Wei — seeded IP-exfiltration persona (USB + mass download + off-hours logon)
SUSPECT_EMP_ID = "emp_1003"
INVESTIGATION_MARKER_PREFIX = "M7_INVESTIGATION_TEST"
INCIDENT_THRESHOLD = 75

results: list[dict[str, Any]] = []


def ok(msg: str) -> str:
    return f"{GREEN}✓  PASS{RESET}  {msg}"


def fail(msg: str) -> str:
    return f"{RED}✗  FAIL{RESET}  {msg}"


def record(name: str, passed: bool, detail: str = "") -> None:
    results.append({"name": name, "passed": passed, "detail": detail})
    icon = ok if passed else fail
    print(f"  {icon(name)}" + (f"  {DIM}{detail}{RESET}" if detail else ""))


def section(title: str) -> None:
    print(f"\n{BOLD}{CYAN}━━━  {title}  ━━━{RESET}")


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


def api_request(
    method: str,
    path: str,
    payload: dict[str, Any] | None = None,
    token: str | None = None,
) -> tuple[int, Any]:
    url = f"{BASE_URL}{path}"
    headers: dict[str, str] = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    data: bytes | None = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read())
        except Exception:
            body = {"detail": exc.reason}
        return exc.code, body


def login(credentials: dict[str, str]) -> str:
    status, body = http_post_form("/auth/login", credentials)
    if status != 200 or "access_token" not in body:
        raise RuntimeError(f"Login failed: HTTP {status} — {body}")
    return body["access_token"]


def normalize_event_type(event_type: str) -> str:
    upper = event_type.upper()
    if upper in ("LOGIN", "LOGON", "LOGIN_ATTEMPT"):
        return "LOGIN"
    if upper in ("USB_INSERT", "USB_INSERTED", "DEVICE"):
        return "USB"
    if upper in ("FILE_DOWNLOAD", "FILE_UPLOAD", "DATA_TRANSFER"):
        return "NETWORK_TRANSFER"
    return upper


def build_evidence_events(base_time: datetime, marker: str) -> list[dict[str, Any]]:
    """Chronological correlated evidence chain for investigation."""
    t_login = base_time
    t_usb = base_time + timedelta(minutes=5)
    t_download = base_time + timedelta(minutes=12)

    return [
        {
            "label": "Off-hours login",
            "expected_type": "LOGIN",
            "payload": {
                "emp_id": SUSPECT_EMP_ID,
                "event_type": "LOGIN",
                "severity": "MEDIUM",
                "source_ip": "10.0.1.103",
                "device_id": "ASSET-DT-003",
                "payload": {
                    "investigation_marker": marker,
                    "activity": "Logon",
                    "off_hours": True,
                    "login_hour": 2,
                    "status": "SUCCESS",
                    "auth_method": "Password",
                },
                "timestamp": t_login.isoformat().replace("+00:00", "Z"),
            },
        },
        {
            "label": "USB storage insert",
            "expected_type": "USB",
            "payload": {
                "emp_id": SUSPECT_EMP_ID,
                "event_type": "USB_INSERT",
                "severity": "HIGH",
                "source_ip": "10.0.1.103",
                "device_id": "ASSET-DT-003",
                "payload": {
                    "investigation_marker": marker,
                    "activity": "inserted",
                    "device_type": "USB_STORAGE",
                    "vendor": "Kingston",
                    "serial": "M7-USB-TEST-001",
                },
                "timestamp": t_usb.isoformat().replace("+00:00", "Z"),
            },
        },
        {
            "label": "Mass network download",
            "expected_type": "NETWORK_TRANSFER",
            "payload": {
                "emp_id": SUSPECT_EMP_ID,
                "event_type": "FILE_DOWNLOAD",
                "severity": "CRITICAL",
                "source_ip": "10.0.1.103",
                "device_id": "ASSET-DT-003",
                "payload": {
                    "investigation_marker": marker,
                    "filename": "quantum_ai_core_engine_src_v4.tar.gz",
                    "size_mb": 10240.0,
                    "protocol": "HTTPS",
                    "external_transfer": True,
                    "classification": "RESTRICTED",
                },
                "timestamp": t_download.isoformat().replace("+00:00", "Z"),
            },
        },
    ]


def print_timeline_table(events: list[dict[str, Any]], title: str) -> None:
    print(f"\n{BOLD}  {title}{RESET}")
    print(f"  {DIM}{'─' * 90}{RESET}")
    print(f"  {BOLD}{'#':<4} {'Timestamp (UTC)':<28} {'Type':<18} {'Severity':<10} {'Evidence Detail'}{RESET}")
    print(f"  {DIM}{'─' * 90}{RESET}")

    for idx, ev in enumerate(events, start=1):
        ts = ev.get("timestamp", "")[:26]
        etype = ev.get("event_type", "?")
        sev = ev.get("severity", "?")
        meta = ev.get("metadata") or {}
        detail_parts: list[str] = []
        if meta.get("activity"):
            detail_parts.append(str(meta["activity"]))
        if meta.get("device_type"):
            detail_parts.append(str(meta["device_type"]))
        if meta.get("filename"):
            detail_parts.append(str(meta["filename"]))
        if meta.get("size_mb"):
            detail_parts.append(f"{meta['size_mb']} MB")
        if meta.get("login_hour") is not None:
            detail_parts.append(f"hour={meta['login_hour']}")
        if meta.get("protocol"):
            detail_parts.append(str(meta["protocol"]))
        detail = " | ".join(detail_parts) or ev.get("description", "")
        print(f"  {idx:<4} {ts:<28} {etype:<18} {sev:<10} {detail}")

    print(f"  {DIM}{'─' * 90}{RESET}")


def run_investigation_verification() -> int:
    print(f"\n{'━' * 74}")
    print(f"{BOLD}  ITBIS Module 7 — Threat Investigation Module Verification{RESET}")
    print(f"{'━' * 74}")

    if not check_server_alive():
        print(f"\n  {fail('FastAPI backend not reachable')}")
        print(f"  {DIM}Start with: cd backend && python -m uvicorn app.main:app --port 8000{RESET}")
        return 1

    record("FastAPI backend reachable", True)

    try:
        admin_token = login(ADMIN_CREDENTIALS)
        soc_token = login(SOC_CREDENTIALS)
        record("Authenticated ADMIN and SOC_ENGINEER", True)
    except RuntimeError as exc:
        record("Authentication", False, str(exc))
        return print_summary()

    # ── Step 1: Ingest correlated evidence chain ─────────────────────────────
    section("STEP 1 — Ingest Correlated Evidence (Login → USB → Network Download)")
    run_marker = f"{INVESTIGATION_MARKER_PREFIX}_{datetime.now(timezone.utc).strftime('%H%M%S')}"
    base_time = datetime(2026, 9, 17, 2, 30, 0, tzinfo=timezone.utc)
    evidence_chain = build_evidence_events(base_time, run_marker)
    last_ingest: dict[str, Any] = {}

    for step in evidence_chain:
        status, body = api_request("POST", "/telemetry/ingest", step["payload"], admin_token)
        passed = status == 201 and body.get("status") == "success"
        score = body.get("threat_score", "?")
        anomaly = body.get("anomaly_score", "?")
        record(
            f"Ingest {step['label']}",
            passed,
            f"HTTP {status}  threat_score={score}  anomaly={anomaly}",
        )
        if passed:
            last_ingest = body

    is_high_risk = (
        last_ingest.get("is_anomaly") is True
        and float(last_ingest.get("threat_score") or 0) > INCIDENT_THRESHOLD
    )
    record(
        "High-risk anomaly detected on final ingest",
        is_high_risk,
        f"threat_score={last_ingest.get('threat_score')}  threshold>{INCIDENT_THRESHOLD}",
    )

    # Fallback: force risk recalculation if ingest score didn't cross threshold
    if not is_high_risk:
        calc_status, calc_body = api_request(
            "POST",
            "/analytics/calculate-risk",
            {"emp_id": SUSPECT_EMP_ID, "window_hours": 336, "anomaly_score": 0.95},
            admin_token,
        )
        calc_score = int(calc_body.get("threat_score") or 0)
        is_high_risk = calc_status == 200 and calc_score > INCIDENT_THRESHOLD
        record(
            "Risk re-calculation pushes score above threshold",
            is_high_risk,
            f"HTTP {calc_status}  threat_score={calc_score}",
        )

    # ── Step 2: Verify investigation case auto-created ───────────────────────
    section("STEP 2 — Investigation Case Created from High-Risk Anomaly")
    inc_status, inc_list = api_request(
        "GET",
        f"/incidents/?emp_id={SUSPECT_EMP_ID}&limit=10",
        token=admin_token,
    )
    incident: dict[str, Any] | None = None
    if inc_status == 200 and inc_list.get("items"):
        open_items = [
            i for i in inc_list["items"]
            if i.get("status") in ("NEW", "UNDER_INVESTIGATION")
        ]
        incident = open_items[0] if open_items else inc_list["items"][0]

    incident_id = incident.get("id") if incident else None
    record(
        "Investigation case exists for suspect",
        incident is not None and incident_id is not None,
        f"INC-{incident_id}" if incident_id else "no incident found",
    )

    if incident_id:
        detail_status, incident_detail = api_request("GET", f"/incidents/{incident_id}", token=admin_token)
        if detail_status == 200:
            incident = incident_detail

    if incident:
        trigger = incident.get("trigger_reason", "")
        score = incident.get("threat_score", 0)
        record(
            "Case triggered by ML anomaly engine",
            trigger == "ML_AUTO_TRIGGER" and score > INCIDENT_THRESHOLD,
            f"trigger={trigger}  threat_score={score}  severity={incident.get('severity')}",
        )

    if incident_id is None:
        record("Timeline and evidence correlation", False, "skipped — no incident")
        return print_summary()

    # Transition to UNDER_INVESTIGATION
    trans_status, trans_body = api_request(
        "PATCH",
        f"/incidents/{incident_id}/status",
        {"status": "UNDER_INVESTIGATION", "note": "Module 7 verification — opening investigation."},
        soc_token,
    )
    record(
        "Case transitioned to UNDER_INVESTIGATION",
        trans_status == 200 and trans_body.get("status") == "UNDER_INVESTIGATION",
        f"INC-{incident_id}",
    )

    # ── Step 3: Chronological activity timeline ──────────────────────────────
    section("STEP 3 — Chronological Activity Timeline")
    tl_status, timeline = api_request(
        "GET",
        f"/incidents/{incident_id}/timeline?limit=500",
        token=soc_token,
    )
    record(
        "Case linked to suspect employee (via timeline)",
        tl_status == 200 and timeline.get("emp_id") == SUSPECT_EMP_ID,
        f"emp_id={timeline.get('emp_id')}",
    )
    all_events: list[dict[str, Any]] = timeline.get("events", []) if tl_status == 200 else []
    record(
        "Timeline endpoint returns events",
        tl_status == 200 and len(all_events) > 0,
        f"total_events={timeline.get('total_events', 0)}  emp_id={timeline.get('emp_id')}",
    )

    marker_events = [
        ev for ev in all_events
        if (ev.get("metadata") or {}).get("investigation_marker") == run_marker
    ]
    record(
        "Investigation evidence events present in timeline",
        len(marker_events) >= 3,
        f"marker_events={len(marker_events)}",
    )

    # Verify chronological ordering (full timeline + marker subset)
    def is_chronological(events: list[dict[str, Any]]) -> bool:
        timestamps = [ev.get("timestamp", "") for ev in events]
        return timestamps == sorted(timestamps)

    record(
        "Full timeline sorted chronologically (ascending)",
        is_chronological(all_events),
        f"checked {len(all_events)} events",
    )
    record(
        "Marker evidence chain sorted chronologically",
        is_chronological(marker_events),
        f"checked {len(marker_events)} marker events",
    )

    # ── Step 4: Evidence correlation ─────────────────────────────────────────
    section("STEP 4 — Evidence Correlation (Login + USB + Network Download)")
    found_types = {normalize_event_type(ev.get("event_type", "")) for ev in marker_events}
    expected_types = {"LOGIN", "USB", "NETWORK_TRANSFER"}
    record(
        "All three evidence types correlated on case",
        expected_types.issubset(found_types),
        f"found={sorted(found_types)}",
    )

    correlation_note = (
        f"[EVIDENCE CORRELATION] Module 7 test — correlated off-hours LOGIN at "
        f"{base_time.strftime('%H:%M UTC')}, USB_INSERT (+5m), and 10 GB HTTPS "
        f"FILE_DOWNLOAD (+12m) for {SUSPECT_EMP_ID}. Timeline marker: {run_marker}."
    )
    comment_status, comment_body = api_request(
        "POST",
        f"/incidents/{incident_id}/comments",
        {"content": correlation_note},
        soc_token,
    )
    record(
        "Evidence correlation note attached to case",
        comment_status in (200, 201) and "id" in comment_body,
        f"comment_id={comment_body.get('id')}",
    )

    task_status, task_body = api_request(
        "POST",
        f"/incidents/{incident_id}/tasks",
        {
            "title": "Correlate USB + network exfiltration chain",
            "description": (
                "Review chronological timeline: off-hours login → USB insert → "
                "mass HTTPS download. Cross-reference DLP and endpoint logs."
            ),
        },
        soc_token,
    )
    record(
        "Investigation task created for evidence review",
        task_status in (200, 201) and task_body.get("title"),
        f"task_id={task_body.get('id')}  status={task_body.get('status')}",
    )

    # Risk factors endpoint (Z-score attribution)
    rf_status, rf_body = api_request(
        "GET",
        f"/incidents/{incident_id}/risk-factors",
        token=soc_token,
    )
    factor_count = len(rf_body.get("factors", [])) if rf_status == 200 else 0
    record(
        "Risk attribution factors available for case",
        rf_status == 200,
        f"factors={factor_count}  anomaly_score={rf_body.get('anomaly_score')}",
    )

    # ── Display generated case timeline ──────────────────────────────────────
    section("GENERATED CASE TIMELINE")
    print(f"\n  {BOLD}Incident:{RESET} INC-{incident_id}  |  "
          f"{BOLD}Suspect:{RESET} {incident.get('employee_name')} ({SUSPECT_EMP_ID})  |  "
          f"{BOLD}Score:{RESET} {incident.get('threat_score')}/100  |  "
          f"{BOLD}Status:{RESET} {trans_body.get('status', incident.get('status'))}")

    display_events = marker_events if marker_events else all_events[-10:]
    print_timeline_table(
        display_events,
        "Correlated Evidence Timeline (Module 7 Test Events)"
        if marker_events
        else "Recent Timeline Events (last 10)",
    )

    if marker_events:
        print(f"\n  {BOLD}Evidence Correlation Summary:{RESET}")
        for step in evidence_chain:
            norm = step["expected_type"]
            matched = next(
                (ev for ev in marker_events if normalize_event_type(ev.get("event_type", "")) == norm),
                None,
            )
            if matched:
                ts = matched.get("timestamp", "")[:19].replace("T", " ")
                print(f"    • {step['label']:<28} → {matched.get('event_type')} @ {ts} UTC")
            else:
                print(f"    • {step['label']:<28} → {RED}NOT FOUND{RESET}")

    return print_summary()


def print_summary() -> int:
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    health_pct = round((passed / total) * 100, 1) if total else 0.0
    color = GREEN if failed == 0 else RED

    print(f"\n{'━' * 74}")
    print(f"{BOLD}  MODULE 7 — THREAT INVESTIGATION TEST SUMMARY{RESET}")
    print(f"{'━' * 74}")
    print(f"  {'TEST':<52}  {'STATUS':^8}  DETAIL")
    print(f"  {'-' * 52}  {'-' * 8}  {'-' * 30}")

    for r in results:
        status_str = f"{GREEN}PASS{RESET}" if r["passed"] else f"{RED}FAIL{RESET}"
        detail = (r["detail"][:45] + "…") if len(r["detail"]) > 46 else r["detail"]
        print(f"  {r['name'][:52]:<52}  {status_str:^8}  {DIM}{detail}{RESET}")

    print(f"\n{'━' * 74}")
    print(
        f"  {BOLD}Results: {color}{health_pct}% ({passed}/{total} passed){RESET}"
        + (f"  {RED}({failed} FAILED){RESET}" if failed else f"  {GREEN}✓ Investigation workflow verified{RESET}")
    )
    print(f"{'━' * 74}\n")
    return 0 if failed == 0 else 1


def main() -> int:
    return run_investigation_verification()


if __name__ == "__main__":
    sys.exit(main())
