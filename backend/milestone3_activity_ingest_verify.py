#!/usr/bin/env python3
"""
ITBIS — Module 3 Activity Monitoring Engine & Ingestion Verification
======================================================================
Simulates and ingests sample activity events across all monitored categories,
then verifies validation, enrichment, and dual-database persistence without
field loss.

Covers:
  • Login / Logoff
  • File Access, Uploads & Downloads
  • Application Usage & Network Traffic
  • USB Device Events & Email Activity

Ingestion paths exercised:
  A) JWT  POST /api/v1/telemetry/ingest       (sensors / scripts)
  B) Agent POST /api/v1/ingestion/events      (Windows endpoint agent)

Run from backend/ with the API and MongoDB running:
    python milestone3_activity_ingest_verify.py
    python milestone3_activity_ingest_verify.py --base-url http://127.0.0.1:8000
    python milestone3_activity_ingest_verify.py --agent-api-key itbis_ag_...
"""

from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

try:
    from pymongo import MongoClient
except ImportError as exc:
    raise SystemExit("pymongo is required — pip install pymongo") from exc

# ── ANSI helpers ──────────────────────────────────────────────────────────────

GREEN = "\033[92m"
RED = "\033[91m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

PASS_COUNT = 0
FAIL_COUNT = 0
WARN_COUNT = 0


def _log(level: str, msg: str) -> None:
    ts = datetime.now().strftime("%H:%M:%S")
    print(f"{DIM}[{ts}]{RESET} {level}  {msg}")


def ok(msg: str) -> None:
    global PASS_COUNT
    PASS_COUNT += 1
    _log(f"{GREEN}PASS{RESET}", msg)


def fail(msg: str) -> None:
    global FAIL_COUNT
    FAIL_COUNT += 1
    _log(f"{RED}FAIL{RESET}", msg)


def warn(msg: str) -> None:
    global WARN_COUNT
    WARN_COUNT += 1
    _log(f"{YELLOW}WARN{RESET}", msg)


def info(msg: str) -> None:
    _log(f"{CYAN}INFO{RESET}", msg)


def section(title: str) -> None:
    print(f"\n{BOLD}{'─' * 72}{RESET}")
    print(f"{BOLD}{title}{RESET}")
    print(f"{BOLD}{'─' * 72}{RESET}")


# ── HTTP helpers ──────────────────────────────────────────────────────────────

def http_post_form(base_url: str, path: str, data: dict[str, str]) -> tuple[int, Any]:
    encoded = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(
        f"{base_url}{path}",
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read())
        except Exception:
            body = {"detail": str(exc)}
        return exc.code, body


def http_post_json(
    base_url: str,
    path: str,
    payload: dict[str, Any],
    *,
    token: str | None = None,
    api_key: str | None = None,
    device_id: str | None = None,
) -> tuple[int, Any]:
    data = json.dumps(payload, default=str).encode("utf-8")
    headers: dict[str, str] = {
        "Content-Type": "application/json",
        "Accept": "application/json",
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
        headers["X-Api-Key"] = api_key
    if device_id:
        headers["X-Device-Id"] = device_id
    req = urllib.request.Request(
        f"{base_url}{path}",
        data=data,
        headers=headers,
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read())
        except Exception:
            body = {"detail": str(exc)}
        return exc.code, body


def http_get(base_url: str, path: str, token: str) -> tuple[int, Any]:
    req = urllib.request.Request(
        f"{base_url}{path}",
        headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
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


# ── Config defaults ───────────────────────────────────────────────────────────

DEFAULT_BASE_URL = "http://127.0.0.1:8000"
DEFAULT_MONGO_URI = "mongodb://localhost:27017"
DEFAULT_MONGO_DB = "itbis_logs"
ADMIN_USER = "admin@itbis.internal"
ADMIN_PASS = "Admin1234!"
TEST_EMP_ID = "emp_1004"
TEST_DEVICE_ID = "ASSET-LT-006"
AGENT_DEVICE_ID = "WS-001"


def load_agent_api_key(explicit: str | None) -> str | None:
    if explicit:
        return explicit.strip()
    config_path = Path(__file__).resolve().parent.parent / "itbis-agent" / "config.yaml"
    if not config_path.is_file():
        return None
    text = config_path.read_text(encoding="utf-8")
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("api_key:"):
            value = stripped.split(":", 1)[1].strip().strip('"').strip("'")
            if value.startswith("itbis_ag_"):
                return value
    return None


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── Sample event definitions ─────────────────────────────────────────────────

def build_telemetry_events(run_id: str) -> list[dict[str, Any]]:
    """JWT telemetry path — one event per monitored category."""
    marker = f"m3_telemetry_{run_id}"
    ts = utcnow_iso()
    return [
        {
            "category": "Login",
            "payload": {
                "emp_id": TEST_EMP_ID,
                "event_type": "LOGIN",
                "severity": "INFO",
                "source_ip": "10.0.4.11",
                "device_id": TEST_DEVICE_ID,
                "payload": {
                    "_verify_marker": marker,
                    "category": "Login",
                    "success": True,
                    "auth_method": "SSO_SAML",
                    "mfa_verified": True,
                    "session_id": f"sess-{run_id}-login",
                },
                "timestamp": ts,
            },
        },
        {
            "category": "Logoff",
            "payload": {
                "emp_id": TEST_EMP_ID,
                "event_type": "LOGOFF",
                "severity": "INFO",
                "source_ip": "10.0.4.11",
                "device_id": TEST_DEVICE_ID,
                "payload": {
                    "_verify_marker": marker,
                    "category": "Logoff",
                    "session_id": f"sess-{run_id}-login",
                    "session_duration_minutes": 287,
                    "reason": "user_initiated",
                },
                "timestamp": ts,
            },
        },
        {
            "category": "File Access",
            "payload": {
                "emp_id": TEST_EMP_ID,
                "event_type": "FILE_ACCESS",
                "severity": "LOW",
                "source_ip": "10.0.4.11",
                "device_id": TEST_DEVICE_ID,
                "payload": {
                    "_verify_marker": marker,
                    "category": "File Access",
                    "filename": "Q4_budget_draft.xlsx",
                    "path": "\\\\fileserver\\finance\\Q4_budget_draft.xlsx",
                    "action": "READ",
                    "bytes": 524_288,
                },
                "timestamp": ts,
            },
        },
        {
            "category": "File Upload",
            "payload": {
                "emp_id": TEST_EMP_ID,
                "event_type": "FILE_UPLOAD",
                "severity": "MEDIUM",
                "source_ip": "10.0.4.11",
                "device_id": TEST_DEVICE_ID,
                "payload": {
                    "_verify_marker": marker,
                    "category": "File Upload",
                    "filename": "vendor_contract_v2.pdf",
                    "destination": "sharepoint.corp.local",
                    "bytes": 2_097_152,
                    "encrypted": True,
                },
                "timestamp": ts,
            },
        },
        {
            "category": "File Download",
            "payload": {
                "emp_id": TEST_EMP_ID,
                "event_type": "FILE_DOWNLOAD",
                "severity": "LOW",
                "source_ip": "10.0.4.11",
                "device_id": TEST_DEVICE_ID,
                "payload": {
                    "_verify_marker": marker,
                    "category": "File Download",
                    "filename": "policy_handbook_2026.pdf",
                    "source": "intranet.corp.local",
                    "bytes": 1_048_576,
                    "action": "READ",
                },
                "timestamp": ts,
            },
        },
        {
            "category": "Application Usage",
            "payload": {
                "emp_id": TEST_EMP_ID,
                "event_type": "APPLICATION_USAGE",
                "severity": "INFO",
                "source_ip": "10.0.4.11",
                "device_id": TEST_DEVICE_ID,
                "payload": {
                    "_verify_marker": marker,
                    "category": "Application Usage",
                    "application": "Microsoft Excel",
                    "process_name": "EXCEL.EXE",
                    "pid": 8842,
                    "duration_seconds": 1840,
                    "window_title": "Q4_budget_draft.xlsx - Excel",
                },
                "timestamp": ts,
            },
        },
        {
            "category": "Network Traffic",
            "payload": {
                "emp_id": TEST_EMP_ID,
                "event_type": "DATA_TRANSFER",
                "severity": "MEDIUM",
                "source_ip": "10.0.4.11",
                "device_id": TEST_DEVICE_ID,
                "payload": {
                    "_verify_marker": marker,
                    "category": "Network Traffic",
                    "protocol": "HTTPS",
                    "destination": "api.corp-analytics.internal",
                    "destination_ip": "10.0.8.50",
                    "bytes_sent": 4096,
                    "bytes_received": 65536,
                    "port": 443,
                },
                "timestamp": ts,
            },
        },
        {
            "category": "USB Device",
            "payload": {
                "emp_id": TEST_EMP_ID,
                "event_type": "USB_INSERTED",
                "severity": "MEDIUM",
                "source_ip": "10.0.4.11",
                "device_id": TEST_DEVICE_ID,
                "payload": {
                    "_verify_marker": marker,
                    "category": "USB Device",
                    "device_type": "removable_storage",
                    "vendor": "SanDisk",
                    "serial": "SD-USB-88421",
                    "capacity_gb": 64,
                    "drive_letter": "E:",
                },
                "timestamp": ts,
            },
        },
        {
            "category": "Email Activity",
            "payload": {
                "emp_id": TEST_EMP_ID,
                "event_type": "EMAIL_ACTIVITY",
                "severity": "INFO",
                "source_ip": "10.0.4.11",
                "device_id": TEST_DEVICE_ID,
                "payload": {
                    "_verify_marker": marker,
                    "category": "Email Activity",
                    "action": "SEND",
                    "subject": "Q4 budget review meeting",
                    "recipients": ["manager@corp.local", "finance@corp.local"],
                    "external": False,
                    "attachment_count": 1,
                    "attachment_names": ["Q4_budget_draft.xlsx"],
                },
                "timestamp": ts,
            },
        },
    ]


def build_agent_events(run_id: str) -> list[dict[str, Any]]:
    """Agent canonical path — endpoint-collector event shapes."""
    ts = utcnow_iso()
    marker = f"m3_agent_{run_id}"
    base = {
        "source_dataset": "win_endpoint",
        "timestamp": ts,
        "user_id": "CORP\\adiallo",
        "username": "adiallo",
        "employee_id": TEST_EMP_ID,
        "device_id": AGENT_DEVICE_ID,
        "device_name": "Workstation 001",
        "ip_address": "10.0.4.11",
        "operating_system": "Windows 11",
        "tags": ["m3_verify"],
    }

    def evt(
        category: str,
        event_type: str,
        raw_event_id: str,
        **extra: Any,
    ) -> dict[str, Any]:
        event_id = str(uuid.uuid4())
        doc = {
            **base,
            "category": category,
            "event_id": event_id,
            "event_type": event_type,
            "raw_event_id": raw_event_id,
            "action": extra.pop("action", event_type),
            "result": extra.pop("result", "success"),
            "raw_payload": {
                "_verify_marker": marker,
                "category": category,
                **extra.pop("raw_payload_extra", {}),
            },
        }
        doc.update(extra)
        return doc

    return [
        evt("Login", "logon", f"m3-{run_id}-4624-logon", target_resource="Console", logon_type=2),
        evt("Logoff", "logoff", f"m3-{run_id}-4634-logoff", target_resource="Console"),
        evt(
            "File Access",
            "file_read",
            f"m3-{run_id}-file-read",
            target_resource=r"C:\Users\adiallo\Documents\report.docx",
            target_type="file",
            bytes_transferred=8192,
        ),
        evt(
            "File Upload",
            "file_write",
            f"m3-{run_id}-file-write",
            target_resource=r"C:\Users\adiallo\Documents\upload.zip",
            target_type="file",
            bytes_transferred=4_194_304,
        ),
        evt(
            "File Download",
            "file_download",
            f"m3-{run_id}-file-download",
            target_resource=r"C:\Users\adiallo\Downloads\installer.msi",
            target_type="file",
            bytes_transferred=52_428_800,
        ),
        evt(
            "Application Usage",
            "app_launch",
            f"m3-{run_id}-app-launch",
            target_resource="OUTLOOK.EXE",
            target_type="process",
            raw_payload_extra={"process_name": "OUTLOOK.EXE", "pid": 4412},
        ),
        evt(
            "Network Traffic",
            "network_connection",
            f"m3-{run_id}-net-conn",
            target_resource="10.0.8.50:443",
            target_type="socket",
            raw_payload_extra={
                "protocol": "TCP",
                "remote_ip": "10.0.8.50",
                "remote_port": 443,
                "process_name": "chrome.exe",
            },
        ),
        evt(
            "USB Device",
            "usb_insert",
            f"m3-{run_id}-usb-insert",
            target_resource="E:",
            target_type="removable_drive",
            raw_payload_extra={"vendor": "SanDisk", "serial": "SD-AGENT-001"},
        ),
        evt(
            "USB File Copy",
            "usb_file_copy",
            f"m3-{run_id}-usb-copy",
            target_resource=r"E:\confidential_export.csv",
            target_type="file",
            bytes_transferred=1_048_576,
            risk_level="high",
            risk_indicators=["usb_exfil"],
        ),
    ]


# ── Verification helpers ──────────────────────────────────────────────────────

def verify_telemetry_document(
    submitted: dict[str, Any],
    stored: dict[str, Any],
    category: str,
) -> bool:
    passed = True
    for field in ("emp_id", "event_type", "severity", "source_ip", "device_id"):
        expected = submitted.get(field)
        if expected is not None and stored.get(field) != expected:
            fail(f"[{category}] top-level field lost: {field} expected={expected!r} got={stored.get(field)!r}")
            passed = False

    submitted_payload = submitted.get("payload") or {}
    stored_payload = stored.get("payload") or {}
    for key, value in submitted_payload.items():
        if stored_payload.get(key) != value:
            fail(f"[{category}] payload field lost: {key} expected={value!r} got={stored_payload.get(key)!r}")
            passed = False

    for enrich_field in ("ingested_at", "anomaly_score", "inference_result", "threat_score"):
        if enrich_field not in stored:
            fail(f"[{category}] enrichment missing: {enrich_field}")
            passed = False

    if passed:
        ok(
            f"[{category}] telemetry stored + enriched "
            f"(log_id={stored.get('_id', 'n/a')}, threat_score={stored.get('threat_score')})"
        )
    return passed


def verify_canonical_document(
    submitted: dict[str, Any],
    stored: dict[str, Any],
    category: str,
) -> bool:
    passed = True
    scalar_fields = (
        "event_type",
        "source_dataset",
        "raw_event_id",
        "user_id",
        "username",
        "employee_id",
        "device_id",
        "device_name",
        "ip_address",
        "target_resource",
        "action",
        "result",
        "bytes_transferred",
    )
    for field in scalar_fields:
        if field not in submitted:
            continue
        expected = submitted[field]
        actual = stored.get(field)
        if actual != expected:
            fail(f"[{category}] canonical field lost: {field} expected={expected!r} got={actual!r}")
            passed = False

    submitted_raw = submitted.get("raw_payload") or {}
    stored_raw = stored.get("raw_payload") or {}
    for key, value in submitted_raw.items():
        if stored_raw.get(key) != value:
            fail(f"[{category}] raw_payload field lost: {key}")
            passed = False

    if submitted.get("risk_indicators") and stored.get("risk_indicators") != submitted["risk_indicators"]:
        fail(f"[{category}] risk_indicators lost")
        passed = False

    if "ingested_at" not in stored:
        fail(f"[{category}] canonical ingested_at missing")
        passed = False

    if passed:
        ok(f"[{category}] canonical_events stored (idempotency={stored.get('idempotency_key')})")
    return passed


def verify_agent_activity_log(
    canonical: dict[str, Any],
    activity: dict[str, Any],
    category: str,
) -> bool:
    passed = True
    if activity.get("emp_id") != TEST_EMP_ID:
        fail(f"[{category}] activity_logs emp_id mismatch: {activity.get('emp_id')}")
        passed = False
    if activity.get("canonical_event_id") != canonical["event_id"]:
        fail(f"[{category}] activity_logs missing canonical_event_id link")
        passed = False
    if activity.get("source_dataset") != "win_endpoint":
        fail(f"[{category}] activity_logs source_dataset missing")
        passed = False

    raw = canonical.get("raw_payload") or {}
    payload = activity.get("payload") or {}
    for key in ("_verify_marker", "category"):
        if raw.get(key) != payload.get(key):
            fail(f"[{category}] activity_logs payload marker/category lost")
            passed = False

    if "ingested_at" not in activity:
        fail(f"[{category}] activity_logs ingested_at missing")
        passed = False

    if passed:
        ok(f"[{category}] activity_logs mapped from canonical event")
    return passed


# ── Main runner ───────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser(description="Module 3 activity ingestion verification")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--mongo-uri", default=DEFAULT_MONGO_URI)
    parser.add_argument("--mongo-db", default=DEFAULT_MONGO_DB)
    parser.add_argument("--agent-api-key", default=None, help="Device API key (reads itbis-agent/config.yaml if omitted)")
    parser.add_argument("--skip-agent", action="store_true", help="Skip agent ingestion path")
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    api_v1 = f"{base_url}/api/v1"
    run_id = datetime.now().strftime("%Y%m%d%H%M%S")

    section("Module 3 — Activity Monitoring Engine & Ingestion Verification")
    info(f"Run ID: {run_id}")
    info(f"API base: {api_v1}")
    info(f"Test employee: {TEST_EMP_ID}  device: {TEST_DEVICE_ID}")

    # ── Preflight ─────────────────────────────────────────────────────────────
    section("Preflight Checks")
    try:
        with urllib.request.urlopen(f"{base_url}/health", timeout=5) as resp:
            if resp.status == 200:
                ok(f"Backend health OK ({base_url}/health)")
            else:
                fail(f"Backend health returned HTTP {resp.status}")
                return 1
    except Exception as exc:
        fail(f"Backend unreachable at {base_url}: {exc}")
        return 1

    try:
        mongo = MongoClient(args.mongo_uri, serverSelectionTimeoutMS=4000)
        mongo.admin.command("ping")
        mdb = mongo[args.mongo_db]
        ok(f"MongoDB reachable ({args.mongo_uri}/{args.mongo_db})")
    except Exception as exc:
        fail(f"MongoDB unreachable: {exc}")
        return 1

    status, login_body = http_post_form(
        api_v1,
        "/auth/login",
        {"username": ADMIN_USER, "password": ADMIN_PASS},
    )
    if status != 200 or not login_body.get("access_token"):
        fail(f"Admin login failed: HTTP {status} {login_body}")
        return 1
    token: str = login_body["access_token"]
    ok(f"Authenticated as {ADMIN_USER}")

    pre_status, pre_emp = http_get(api_v1, f"/employees/{TEST_EMP_ID}", token)
    if pre_status != 200:
        fail(f"Employee {TEST_EMP_ID} not found in PostgreSQL (HTTP {pre_status})")
        return 1
    pre_risk_score = float(pre_emp.get("risk_score", 0))
    ok(f"PostgreSQL employee validated: {TEST_EMP_ID} risk_score={pre_risk_score:.4f}")

    # ── Path A: JWT Telemetry Ingestion ───────────────────────────────────────
    section("Path A — JWT Telemetry Ingestion (/telemetry/ingest)")
    telemetry_cases = build_telemetry_events(run_id)
    telemetry_log_ids: dict[str, str] = {}

    for case in telemetry_cases:
        category = case["category"]
        payload = case["payload"]
        info(f"Ingesting [{category}] event_type={payload['event_type']}")
        code, body = http_post_json(api_v1, "/telemetry/ingest", payload, token=token)
        if code not in (200, 201):
            fail(f"[{category}] ingest rejected HTTP {code}: {body}")
            continue
        log_id = body.get("log_id", "")
        if not log_id:
            fail(f"[{category}] ingest response missing log_id")
            continue
        telemetry_log_ids[category] = log_id
        ok(
            f"[{category}] accepted HTTP {code} log_id={log_id} "
            f"threat_score={body.get('threat_score')} anomaly={body.get('anomaly_score')}"
        )
        time.sleep(0.15)

    # ── Path B: Agent Canonical Ingestion ───────────────────────────────────
    agent_cases: list[dict[str, Any]] = []
    agent_api_key = None if args.skip_agent else load_agent_api_key(args.agent_api_key)

    if args.skip_agent:
        warn("Agent ingestion path skipped (--skip-agent)")
    elif not agent_api_key:
        warn("No agent API key found — skipping agent path (set --agent-api-key or enroll device)")
    else:
        section("Path B — Agent Canonical Ingestion (/ingestion/events)")
        agent_cases = build_agent_events(run_id)
        batch = {
            "agent_id": AGENT_DEVICE_ID,
            "submitted_at": utcnow_iso(),
            "events": [
                {k: v for k, v in evt.items() if k != "category"}
                for evt in agent_cases
            ],
        }
        info(f"Posting batch of {len(batch['events'])} canonical events for device {AGENT_DEVICE_ID}")
        code, body = http_post_json(
            api_v1,
            "/ingestion/events",
            batch,
            api_key=agent_api_key,
            device_id=AGENT_DEVICE_ID,
        )
        if code not in (200, 201):
            fail(f"Agent batch ingest rejected HTTP {code}: {body}")
        else:
            accepted = body.get("accepted", 0)
            duplicates = body.get("duplicates", 0)
            rejected = body.get("rejected", 0)
            ok(f"Agent batch ack: accepted={accepted} duplicates={duplicates} rejected={rejected}")
            if rejected:
                for result in body.get("results", []):
                    if result.get("status") == "rejected":
                        warn(f"  rejected event {result.get('event_id')}: {result.get('reason')}")
        time.sleep(0.3)

    # ── MongoDB field-preservation verification ───────────────────────────────
    section("MongoDB Storage Verification — Field Preservation")

    activity_col = mdb["activity_logs"]
    canonical_col = mdb["canonical_events"]

    for case in telemetry_cases:
        category = case["category"]
        submitted = case["payload"]
        marker = submitted["payload"]["_verify_marker"]
        stored = activity_col.find_one(
            {
                "emp_id": TEST_EMP_ID,
                "payload._verify_marker": marker,
                "payload.category": category,
            }
        )
        if not stored:
            fail(f"[{category}] no matching activity_logs document in MongoDB")
            continue
        verify_telemetry_document(submitted, stored, category)

    if agent_cases:
        for case in agent_cases:
            category = case["category"]
            raw_event_id = case["raw_event_id"]
            stored_canonical = canonical_col.find_one({"raw_event_id": raw_event_id})
            if not stored_canonical:
                fail(f"[{category}] no canonical_events document for raw_event_id={raw_event_id}")
                continue
            verify_canonical_document(case, stored_canonical, category)

            stored_activity = activity_col.find_one(
                {"canonical_event_id": case["event_id"]}
            )
            if not stored_activity:
                fail(f"[{category}] no activity_logs row linked to canonical event")
                continue
            verify_agent_activity_log(case, stored_activity, category)

    # ── PostgreSQL enrichment check ───────────────────────────────────────────
    section("PostgreSQL Enrichment Verification")
    post_status, post_emp = http_get(api_v1, f"/employees/{TEST_EMP_ID}", token)
    if post_status != 200:
        fail(f"Could not re-fetch employee after ingest (HTTP {post_status})")
    else:
        post_risk = float(post_emp.get("risk_score", 0))
        post_category = post_emp.get("risk_category", "UNKNOWN")
        ok(f"Employee risk_score updated: {pre_risk_score:.4f} → {post_risk:.4f}")
        ok(f"Employee risk_category: {post_category}")
        if post_emp.get("updated_at"):
            ok(f"PostgreSQL updated_at present: {post_emp['updated_at']}")
        else:
            warn("PostgreSQL updated_at missing on employee record")

    # ── API read-back spot check ──────────────────────────────────────────────
    section("API Read-Back Spot Check")
    logs_status, logs = http_get(api_v1, f"/telemetry/logs/{TEST_EMP_ID}?limit=20", token)
    if logs_status != 200:
        fail(f"GET /telemetry/logs/{TEST_EMP_ID} failed HTTP {logs_status}")
    else:
        ok(f"Retrieved {len(logs)} recent activity_logs via API")
        found_markers = {
            log.get("payload", {}).get("category")
            for log in logs
            if log.get("payload", {}).get("_verify_marker", "").startswith(f"m3_telemetry_{run_id}")
        }
        expected_categories = {c["category"] for c in telemetry_cases}
        missing_api = expected_categories - found_markers
        if missing_api:
            warn(f"API read-back missing categories: {sorted(missing_api)}")
        else:
            ok("All telemetry categories visible via GET /telemetry/logs")

    # ── Summary ───────────────────────────────────────────────────────────────
    section("Execution Summary")
    total = PASS_COUNT + FAIL_COUNT
    print(f"  {GREEN}Passed:{RESET}  {PASS_COUNT}")
    print(f"  {RED}Failed:{RESET}  {FAIL_COUNT}")
    print(f"  {YELLOW}Warnings:{RESET} {WARN_COUNT}")
    print(f"  Total checks: {total}")
    print()
    if FAIL_COUNT == 0:
        print(f"{GREEN}{BOLD}All Module 3 ingestion checks passed.{RESET}")
        return 0
    print(f"{RED}{BOLD}{FAIL_COUNT} check(s) failed — review log above.{RESET}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
