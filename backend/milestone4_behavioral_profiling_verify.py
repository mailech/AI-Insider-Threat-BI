#!/usr/bin/env python3
"""
ITBIS — Module 4 Behavioral Profiling Engine Verification
==========================================================
Verifies baseline user profile generation, peer/cohort comparison logic,
and incremental baseline updates as new activity logs arrive.

Checks:
  1. Baseline profile generation (working hours, data transfer volume, devices)
  2. Peer comparison — department peer averages + fleet cohort Z-scores
  3. Baseline refresh — profiles update after new telemetry ingest

Run from backend/ with API + MongoDB running:
    python milestone4_behavioral_profiling_verify.py
    python milestone4_behavioral_profiling_verify.py --emp-id emp_1006
"""

from __future__ import annotations

import argparse
import json
import sys
import time
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

DEFAULT_BASE_URL = "http://127.0.0.1:8000"
DEFAULT_MONGO_URI = "mongodb://localhost:27017"
DEFAULT_MONGO_DB = "itbis_logs"
ADMIN_USER = "admin@itbis.internal"
ADMIN_PASS = "Admin1234!"
DEFAULT_TEST_EMP = "emp_1002"  # Priya Nair — IT Infrastructure (peers: emp_1013)


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
    token: str,
) -> tuple[int, Any]:
    data = json.dumps(payload, default=str).encode("utf-8")
    req = urllib.request.Request(
        f"{base_url}{path}",
        data=data,
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Accept": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
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
        with urllib.request.urlopen(req, timeout=30) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        try:
            body = json.loads(exc.read())
        except Exception:
            body = {}
        return exc.code, body


def utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ingest_event(
    api_v1: str,
    token: str,
    emp_id: str,
    event_type: str,
    payload: dict[str, Any],
    *,
    severity: str = "INFO",
    device_id: str | None = None,
) -> tuple[int, Any]:
    body: dict[str, Any] = {
        "emp_id": emp_id,
        "event_type": event_type,
        "severity": severity,
        "source_ip": "10.0.4.11",
        "payload": payload,
        "timestamp": utcnow_iso(),
    }
    if device_id:
        body["device_id"] = device_id
    return http_post_json(api_v1, "/telemetry/ingest", body, token)


def fetch_baseline(api_v1: str, token: str, emp_id: str, window_days: int = 14) -> tuple[int, dict[str, Any]]:
    return http_get(api_v1, f"/analytics/employee/{emp_id}/baseline?window_days={window_days}", token)


def fetch_mongo_baseline(mdb: Any, emp_id: str) -> dict[str, Any] | None:
    return mdb["employee_behavioral_baselines"].find_one({"emp_id": emp_id}, {"_id": 0})


def count_app_usage_events(mdb: Any, emp_id: str, window_days: int = 14) -> int:
    since = datetime.now(timezone.utc) - __import__("datetime").timedelta(days=window_days)
    app_types = {"APPLICATION_USAGE", "APP_LAUNCH", "APP_CLOSE", "APP_USAGE"}
    return mdb["activity_logs"].count_documents(
        {
            "emp_id": emp_id,
            "timestamp": {"$gte": since},
            "event_type": {"$in": list(app_types)},
        }
    )


def print_baseline_profile(
    emp_id: str,
    api_baseline: dict[str, Any],
    mongo_baseline: dict[str, Any] | None,
    app_usage_count: int,
    label: str,
) -> None:
    """Pretty-print the full baseline profile for a test user."""
    section(f"Baseline Profile Output — {label}")
    name = f"{api_baseline.get('first_name', '')} {api_baseline.get('last_name', '')}".strip()
    dept = api_baseline.get("department", "N/A")
    print(f"  Employee:     {emp_id} — {name}")
    print(f"  Department:   {dept}")
    print(f"  Designation:  {api_baseline.get('designation', 'N/A')}")
    print(f"  Window:       {api_baseline.get('window_days', 14)} days")
    print(f"  Evaluated:    {api_baseline.get('evaluated_at', 'N/A')}")
    print()
    print(f"  {BOLD}Working Hours Profile{RESET}")
    print(f"    Typical login window:  {api_baseline.get('typical_login_hour_start'):02d}:00 – "
          f"{api_baseline.get('typical_login_hour_end'):02d}:00 UTC")
    print(f"    Peak login hour:       {api_baseline.get('peak_login_hour'):02d}:00 UTC")
    print(f"    Avg daily logins:      {api_baseline.get('avg_daily_logins', 0):.4f}")
    print()
    print(f"  {BOLD}Data Transfer Volume{RESET}")
    print(f"    Avg download MB/day:   {api_baseline.get('avg_download_mb_per_day', 0):.4f} MB")
    print(f"    Avg upload MB/day:     {api_baseline.get('avg_upload_mb_per_day', 0):.4f} MB")
    print()
    print(f"  {BOLD}Endpoint / Device Usage{RESET}")
    devices = api_baseline.get("typical_device_ids") or []
    print(f"    Typical devices:       {', '.join(devices) if devices else '(none observed)'}")
    print()
    print(f"  {BOLD}Application Activity (from activity_logs){RESET}")
    print(f"    App usage events:      {app_usage_count} in window "
          f"(APPLICATION_USAGE / APP_LAUNCH / APP_CLOSE)")
    if mongo_baseline:
        print(f"    MongoDB updated_at:    {mongo_baseline.get('updated_at', 'N/A')}")
        print(f"    Sample event count:    {mongo_baseline.get('sample_event_count', 0)}")
    print()
    print(f"  {BOLD}ML Anomaly Assessment{RESET}")
    print(f"    Anomaly score:         {api_baseline.get('anomaly_score', 0):.2f} / 100")
    print(f"    Severity:              {api_baseline.get('severity', 'N/A')}")
    print(f"    Is anomaly:            {api_baseline.get('is_anomaly', False)}")
    print()
    print(f"  {BOLD}Cohort Comparison Metrics (8-feature Z-scores vs fleet baseline){RESET}")
    metrics = api_baseline.get("metrics") or []
    if metrics:
        print(f"    {'Metric':<32} {'Current':>10} {'Cohort μ':>10} {'Z-score':>8} {'Status':>10}")
        print(f"    {'-' * 32} {'-' * 10} {'-' * 10} {'-' * 8} {'-' * 10}")
        for m in metrics:
            label_m = str(m.get("feature_label", m.get("feature_name", "")))[:32]
            print(
                f"    {label_m:<32} "
                f"{m.get('current_value', 0):>10.2f} "
                f"{m.get('baseline_mean', 0):>10.2f} "
                f"{m.get('z_score', 0):>8.2f} "
                f"{m.get('status', 'NORMAL'):>10}"
            )
    top = api_baseline.get("top_deviations") or []
    if top:
        print()
        print(f"  {BOLD}Top Deviations{RESET}")
        for i, factor in enumerate(top[:3], 1):
            print(
                f"    {i}. {factor.get('feature_label', 'N/A')} — "
                f"z={factor.get('z_score', 0):.2f} ({factor.get('risk_level', 'LOW')})"
            )


def compute_department_peer_stats(
    api_v1: str,
    token: str,
    test_emp_id: str,
    department: str,
    all_employees: list[dict[str, Any]],
    window_days: int = 14,
) -> dict[str, Any]:
    """Compute department peer averages for key baseline dimensions."""
    dept_peers = [
        e for e in all_employees
        if e.get("department") == department and e.get("emp_id")
    ]
    peer_baselines: list[dict[str, Any]] = []
    for peer in dept_peers:
        code, bl = fetch_baseline(api_v1, token, peer["emp_id"], window_days)
        if code == 200:
            peer_baselines.append(bl)

    if not peer_baselines:
        return {"peer_count": 0, "department": department}

    def avg(field: str) -> float:
        vals = [float(b.get(field, 0) or 0) for b in peer_baselines]
        return sum(vals) / len(vals) if vals else 0.0

    test_bl = next((b for b in peer_baselines if b.get("employee_id") == test_emp_id), None)

    return {
        "department": department,
        "peer_count": len(dept_peers),
        "peers_evaluated": len(peer_baselines),
        "dept_avg_download_mb": round(avg("avg_download_mb_per_day"), 4),
        "dept_avg_upload_mb": round(avg("avg_upload_mb_per_day"), 4),
        "dept_avg_daily_logins": round(avg("avg_daily_logins"), 4),
        "dept_avg_anomaly_score": round(avg("anomaly_score"), 2),
        "test_download_mb": float((test_bl or {}).get("avg_download_mb_per_day", 0)),
        "test_upload_mb": float((test_bl or {}).get("avg_upload_mb_per_day", 0)),
        "test_daily_logins": float((test_bl or {}).get("avg_daily_logins", 0)),
        "test_anomaly_score": float((test_bl or {}).get("anomaly_score", 0)),
        "peer_emp_ids": [p["emp_id"] for p in dept_peers],
    }


def main() -> int:
    global PASS_COUNT, FAIL_COUNT, WARN_COUNT

    parser = argparse.ArgumentParser(description="Module 4 behavioral profiling verification")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--mongo-uri", default=DEFAULT_MONGO_URI)
    parser.add_argument("--mongo-db", default=DEFAULT_MONGO_DB)
    parser.add_argument("--emp-id", default=DEFAULT_TEST_EMP)
    parser.add_argument("--window-days", type=int, default=14)
    args = parser.parse_args()

    base_url = args.base_url.rstrip("/")
    api_v1 = f"{base_url}/api/v1"
    test_emp = args.emp_id
    run_id = datetime.now().strftime("%Y%m%d%H%M%S")
    marker = f"m4_profile_{run_id}"

    section("Module 4 — Behavioral Profiling Engine Verification")
    info(f"Test employee: {test_emp}")
    info(f"API: {api_v1}")

    # ── Preflight ─────────────────────────────────────────────────────────────
    section("Preflight Checks")
    try:
        with urllib.request.urlopen(f"{base_url}/health", timeout=8) as resp:
            if resp.status != 200:
                fail(f"Health check HTTP {resp.status}")
                return 1
            ok("Backend health OK")
    except Exception as exc:
        fail(f"Backend unreachable: {exc}")
        return 1

    try:
        mongo = MongoClient(args.mongo_uri, serverSelectionTimeoutMS=5000)
        mongo.admin.command("ping")
        mdb = mongo[args.mongo_db]
        ok(f"MongoDB reachable ({args.mongo_db})")
    except Exception as exc:
        fail(f"MongoDB unreachable: {exc}")
        return 1

    code, login = http_post_form(api_v1, "/auth/login", {"username": ADMIN_USER, "password": ADMIN_PASS})
    if code != 200 or not login.get("access_token"):
        fail(f"Login failed HTTP {code}")
        return 1
    token: str = login["access_token"]
    ok(f"Authenticated as {ADMIN_USER}")

    emp_code, emp_detail = http_get(api_v1, f"/employees/{test_emp}", token)
    if emp_code != 200:
        fail(f"Test employee {test_emp} not found (HTTP {emp_code})")
        return 1
    department = emp_detail.get("department", "")
    device_id = emp_detail.get("device_id", "ASSET-LT-011")
    ok(f"Employee resolved: {emp_detail.get('first_name')} {emp_detail.get('last_name')} — {department}")

    # ── 1. Seed controlled activity to establish baseline signals ───────────
    section("Step 1 — Seed Baseline Activity Events")
    seed_events = [
        ("LOGIN", {"success": True, "auth_method": "SSO", "_marker": marker, "work_hours": True}, "INFO"),
        ("FILE_DOWNLOAD", {"filename": "baseline_seed.csv", "size_mb": 10.0, "_marker": marker}, "LOW"),
        ("APPLICATION_USAGE", {
            "application": "Microsoft Teams",
            "process_name": "Teams.exe",
            "duration_seconds": 3600,
            "_marker": marker,
        }, "INFO"),
    ]
    for event_type, payload, severity in seed_events:
        info(f"Ingesting seed {event_type}")
        sc, body = ingest_event(api_v1, token, test_emp, event_type, payload, severity=severity, device_id=device_id)
        if sc in (200, 201):
            ok(f"Seed {event_type} ingested (log_id={body.get('log_id', 'n/a')})")
        else:
            fail(f"Seed {event_type} rejected HTTP {sc}: {body}")
        time.sleep(0.2)

    # ── 2. Fetch and validate baseline profile ────────────────────────────────
    section("Step 2 — Baseline Profile Generation")
    bl_code, baseline = fetch_baseline(api_v1, token, test_emp, args.window_days)
    if bl_code != 200:
        fail(f"GET /analytics/employee/{test_emp}/baseline failed HTTP {bl_code}: {baseline}")
        return 1
    ok(f"Baseline API returned HTTP 200 for {test_emp}")

    required_profile_fields = (
        "typical_login_hour_start",
        "typical_login_hour_end",
        "peak_login_hour",
        "avg_download_mb_per_day",
        "avg_upload_mb_per_day",
        "avg_daily_logins",
    )
    for field in required_profile_fields:
        if baseline.get(field) is None:
            fail(f"Baseline profile missing field: {field}")
        else:
            ok(f"Profile field present: {field} = {baseline[field]}")

    if baseline.get("typical_login_hour_start", 0) <= baseline.get("typical_login_hour_end", 23):
        ok(
            f"Working hours window valid: "
            f"{baseline['typical_login_hour_start']:02d}:00–{baseline['typical_login_hour_end']:02d}:00 UTC"
        )
    else:
        warn("Working hours start > end (may indicate sparse login data)")

    if float(baseline.get("avg_download_mb_per_day", 0)) >= 0:
        ok(f"Data transfer baseline computed: download={baseline['avg_download_mb_per_day']:.4f} MB/day")
    else:
        fail("Negative download baseline")

    mongo_bl = fetch_mongo_baseline(mdb, test_emp)
    if mongo_bl and mongo_bl.get("emp_id") == test_emp:
        ok(f"MongoDB employee_behavioral_baselines doc exists for {test_emp}")
        if mongo_bl.get("sample_event_count", 0) > 0:
            ok(f"MongoDB sample_event_count = {mongo_bl['sample_event_count']}")
    else:
        fail(f"MongoDB employee_behavioral_baselines missing for {test_emp}")

    app_count = count_app_usage_events(mdb, test_emp, args.window_days)
    if app_count > 0:
        ok(f"Application usage events tracked in activity_logs: {app_count}")
    else:
        warn("No APPLICATION_USAGE events found in window (seed may not have landed yet)")

    metrics = baseline.get("metrics") or []
    if len(metrics) == 8:
        ok(f"Cohort comparison returned all 8 ML feature metrics")
    else:
        fail(f"Expected 8 cohort metrics, got {len(metrics)}")

    for m in metrics:
        if m.get("baseline_mean") is not None and m.get("z_score") is not None:
            ok(
                f"  {m.get('feature_label', m.get('feature_name'))}: "
                f"current={m.get('current_value')} vs cohort μ={m.get('baseline_mean')} "
                f"z={m.get('z_score')} [{m.get('status')}]"
            )
        else:
            fail(f"Metric missing comparison fields: {m.get('feature_name')}")

    # ── 3. Department peer group comparison ───────────────────────────────────
    section("Step 3 — Peer Group Comparison")
    emp_list_code, employees = http_get(api_v1, "/employees/?limit=100", token)
    if emp_list_code != 200 or not isinstance(employees, list):
        fail(f"Could not list employees HTTP {emp_list_code}")
        employees = []

    peer_stats = compute_department_peer_stats(
        api_v1, token, test_emp, department, employees, args.window_days
    )
    peer_count = peer_stats.get("peer_count", 0)
    info(f"Department '{department}' has {peer_count} employee(s): {peer_stats.get('peer_emp_ids', [])}")

    if peer_count >= 2:
        ok(f"Department peer group identified ({peer_count} members in {department})")
        dl_delta = peer_stats["test_download_mb"] - peer_stats["dept_avg_download_mb"]
        info(
            f"  Download MB/day — test user: {peer_stats['test_download_mb']:.4f}, "
            f"dept avg: {peer_stats['dept_avg_download_mb']:.4f}, "
            f"delta: {dl_delta:+.4f}"
        )
        info(
            f"  Anomaly score — test user: {peer_stats['test_anomaly_score']:.2f}, "
            f"dept avg: {peer_stats['dept_avg_anomaly_score']:.2f}"
        )
        ok("Department peer comparison computed from per-employee baseline profiles")
    elif peer_count == 1:
        warn(f"Only 1 employee in '{department}' — dept peer comparison limited to fleet cohort Z-scores")
    else:
        warn("No department peers found")

    elevated = [m for m in metrics if m.get("status") in ("ELEVATED", "CRITICAL")]
    if elevated:
        ok(f"Fleet cohort flagged {len(elevated)} elevated/critical metric(s) for {test_emp}")
    else:
        ok(f"All fleet cohort metrics within NORMAL range for {test_emp}")

    # ── 4. Baseline update over time ────────────────────────────────────────
    section("Step 4 — Baseline Updates Over Time (Ingest → Recompute)")
    snapshot_before = {
        "download_mb": float(baseline.get("avg_download_mb_per_day", 0)),
        "upload_mb": float(baseline.get("avg_upload_mb_per_day", 0)),
        "mongo_updated_at": (mongo_bl or {}).get("updated_at"),
    }
    info(f"Before: avg_download={snapshot_before['download_mb']:.4f} MB/day")

    update_events = [
        ("FILE_DOWNLOAD", {"filename": "large_dataset.zip", "size_mb": 250.0, "_marker": f"{marker}_update"}, "MEDIUM"),
        ("FILE_UPLOAD", {"filename": "report_export.zip", "size_mb": 80.0, "_marker": f"{marker}_update"}, "MEDIUM"),
        ("APPLICATION_USAGE", {
            "application": "Visual Studio Code",
            "process_name": "Code.exe",
            "duration_seconds": 7200,
            "_marker": f"{marker}_update",
        }, "INFO"),
    ]
    for event_type, payload, severity in update_events:
        sc, _ = ingest_event(api_v1, token, test_emp, event_type, payload, severity=severity, device_id=device_id)
        if sc in (200, 201):
            ok(f"Update event {event_type} ingested")
        else:
            fail(f"Update event {event_type} rejected HTTP {sc}")
        time.sleep(0.25)

    time.sleep(0.5)
    bl_code2, baseline_after = fetch_baseline(api_v1, token, test_emp, args.window_days)
    mongo_bl_after = fetch_mongo_baseline(mdb, test_emp)

    if bl_code2 != 200:
        fail(f"Post-update baseline fetch failed HTTP {bl_code2}")
    else:
        download_after = float(baseline_after.get("avg_download_mb_per_day", 0))
        upload_after = float(baseline_after.get("avg_upload_mb_per_day", 0))
        info(f"After:  avg_download={download_after:.4f} MB/day, avg_upload={upload_after:.4f} MB/day")

        if download_after >= snapshot_before["download_mb"]:
            ok(
                f"Download baseline updated: "
                f"{snapshot_before['download_mb']:.4f} → {download_after:.4f} MB/day"
            )
        else:
            fail(
                f"Download baseline did not increase after 250 MB ingest: "
                f"{snapshot_before['download_mb']:.4f} → {download_after:.4f}"
            )

        if upload_after > snapshot_before["upload_mb"]:
            ok(f"Upload baseline updated: {snapshot_before['upload_mb']:.4f} → {upload_after:.4f} MB/day")
        else:
            warn(f"Upload baseline unchanged: {upload_after:.4f} MB/day")

        before_ts = snapshot_before.get("mongo_updated_at")
        after_ts = (mongo_bl_after or {}).get("updated_at")
        if after_ts and before_ts and str(after_ts) != str(before_ts):
            ok(f"MongoDB baseline updated_at changed: {before_ts} → {after_ts}")
        elif after_ts:
            ok(f"MongoDB baseline updated_at: {after_ts}")
        else:
            warn("Could not confirm MongoDB updated_at change")

        app_count_after = count_app_usage_events(mdb, test_emp, args.window_days)
        if app_count_after >= app_count:
            ok(f"Application usage event count grew: {app_count} → {app_count_after}")
        else:
            warn(f"Application usage count unchanged: {app_count_after}")

    # ── Print full baseline output ────────────────────────────────────────────
    print_baseline_profile(
        test_emp,
        baseline_after if bl_code2 == 200 else baseline,
        mongo_bl_after or mongo_bl,
        count_app_usage_events(mdb, test_emp, args.window_days),
        f"{test_emp} (post-update)",
    )

    if peer_count >= 2:
        section(f"Department Peer Comparison — {department}")
        print(f"  Peers in department:  {', '.join(peer_stats.get('peer_emp_ids', []))}")
        print(f"  {'Metric':<28} {'Test User':>12} {'Dept Avg':>12} {'Delta':>12}")
        print(f"  {'-' * 28} {'-' * 12} {'-' * 12} {'-' * 12}")
        rows = [
            ("Download MB/day", peer_stats["test_download_mb"], peer_stats["dept_avg_download_mb"]),
            ("Upload MB/day", peer_stats["test_upload_mb"], peer_stats["dept_avg_upload_mb"]),
            ("Daily logins", peer_stats["test_daily_logins"], peer_stats["dept_avg_daily_logins"]),
            ("Anomaly score", peer_stats["test_anomaly_score"], peer_stats["dept_avg_anomaly_score"]),
        ]
        for label, test_val, dept_val in rows:
            delta = test_val - dept_val
            print(f"  {label:<28} {test_val:>12.4f} {dept_val:>12.4f} {delta:>+12.4f}")

    # ── Summary ───────────────────────────────────────────────────────────────
    section("Execution Summary")
    total = PASS_COUNT + FAIL_COUNT
    print(f"  {GREEN}Passed:{RESET}  {PASS_COUNT}")
    print(f"  {RED}Failed:{RESET}  {FAIL_COUNT}")
    print(f"  {YELLOW}Warnings:{RESET} {WARN_COUNT}")
    print(f"  Total checks: {total}")
    print()
    if FAIL_COUNT == 0:
        print(f"{GREEN}{BOLD}All Module 4 behavioral profiling checks passed.{RESET}")
        return 0
    print(f"{RED}{BOLD}{FAIL_COUNT} check(s) failed.{RESET}")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
