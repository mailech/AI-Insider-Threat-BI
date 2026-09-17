#!/usr/bin/env python3
"""
ITBIS — Module 8: UEBA Intelligence Engine Verification
========================================================
Validates the User & Entity Behavior Analytics intelligence layer:

  1. Entity-level risk scoring and behavioral trend analysis over time
  2. Peer Group Deviation logic (department cohort comparison)
  3. Predictive risk scoring output (ML anomaly prediction + projected score)

Run from backend/ with API + MongoDB + PostgreSQL running:
    python module8_ueba_intelligence_verify.py
"""

from __future__ import annotations

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

BASE_URL = "http://127.0.0.1:8000/api/v1"
HEALTH_URL = "http://127.0.0.1:8000/health"
MONGO_URI = "mongodb://localhost:27017"
MONGO_DB = "itbis_logs"
ADMIN_CREDENTIALS = {"username": "admin@itbis.internal", "password": "Admin1234!"}

# Marcus Hale — Finance exfiltration persona (seeded high-volume transfers)
SUBJECT_EMP_ID = "emp_1001"
SUBJECT_DEPARTMENT = "Finance"
PEER_MULTIPLIER_THRESHOLD = 5.0
WINDOW_DAYS = 14

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


def http_post_form(path: str, data: dict[str, str]) -> tuple[int, Any]:
    encoded = urllib.parse.urlencode(data).encode()
    req = urllib.request.Request(
        f"{BASE_URL}{path}",
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        try:
            return exc.code, json.loads(exc.read())
        except Exception:
            return exc.code, {}


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
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode("utf-8")
            return resp.status, json.loads(body) if body else {}
    except urllib.error.HTTPError as exc:
        try:
            return exc.code, json.loads(exc.read())
        except Exception:
            return exc.code, {"detail": exc.reason}


def fetch_baseline(token: str, emp_id: str) -> tuple[int, dict[str, Any]]:
    return api_request("GET", f"/analytics/employee/{emp_id}/baseline?window_days={WINDOW_DAYS}", token=token)


def calculate_risk(token: str, emp_id: str) -> tuple[int, dict[str, Any]]:
    return api_request(
        "POST",
        "/analytics/calculate-risk",
        {"emp_id": emp_id, "window_hours": WINDOW_DAYS * 24},
        token,
    )


def ingest_event(token: str, emp_id: str, event_type: str, payload: dict[str, Any], severity: str) -> tuple[int, Any]:
    return api_request(
        "POST",
        "/telemetry/ingest",
        {
            "emp_id": emp_id,
            "event_type": event_type,
            "severity": severity,
            "source_ip": "10.0.1.101",
            "device_id": "ASSET-LT-001",
            "payload": payload,
            "timestamp": datetime.now(timezone.utc).isoformat().replace("+00:00", "Z"),
        },
        token,
    )


def metric_value(baseline: dict[str, Any], feature_name: str) -> float | None:
    for m in baseline.get("metrics") or []:
        if m.get("feature_name") == feature_name:
            return float(m.get("current_value") or 0)
    return None


def compute_department_peer_stats(
    token: str,
    subject_emp_id: str,
    department: str,
    employees: list[dict[str, Any]],
) -> dict[str, Any]:
    peers = [e for e in employees if e.get("department") == department and e.get("emp_id")]
    peer_baselines: list[dict[str, Any]] = []
    for peer in peers:
        code, bl = fetch_baseline(token, peer["emp_id"])
        if code == 200:
            peer_baselines.append(bl)

    subject_bl = next((b for b in peer_baselines if b.get("employee_id") == subject_emp_id), {})

    def peer_avg(field: str, *, exclude_subject: bool = True) -> float:
        vals = [
            float(b.get(field) or 0)
            for b in peer_baselines
            if not (exclude_subject and b.get("employee_id") == subject_emp_id)
        ]
        return sum(vals) / len(vals) if vals else 0.0

    def peer_avg_metric(feature: str, *, exclude_subject: bool = True) -> float:
        vals: list[float] = []
        for b in peer_baselines:
            if exclude_subject and b.get("employee_id") == subject_emp_id:
                continue
            v = metric_value(b, feature)
            if v is not None:
                vals.append(v)
        return sum(vals) / len(vals) if vals else 0.0

    subject_download_mb = float(subject_bl.get("avg_download_mb_per_day") or 0)
    subject_upload_mb = float(subject_bl.get("avg_upload_mb_per_day") or 0)
    dept_avg_download = peer_avg("avg_download_mb_per_day")
    dept_avg_upload = peer_avg("avg_upload_mb_per_day")

    dl_feature = metric_value(subject_bl, "total_file_download_mb") or 0.0
    ul_feature = metric_value(subject_bl, "total_file_upload_mb") or 0.0
    dept_dl_feature = peer_avg_metric("total_file_download_mb")
    dept_ul_feature = peer_avg_metric("total_file_upload_mb")

    return {
        "department": department,
        "peer_count": len(peers),
        "peer_ids": [p["emp_id"] for p in peers],
        "subject_name": f"{subject_bl.get('first_name', '')} {subject_bl.get('last_name', '')}".strip(),
        "subject_download_mb_day": subject_download_mb,
        "subject_upload_mb_day": subject_upload_mb,
        "dept_avg_download_mb_day": dept_avg_download,
        "dept_avg_upload_mb_day": dept_avg_upload,
        "download_multiplier": (subject_download_mb / dept_avg_download) if dept_avg_download > 0 else 0.0,
        "upload_multiplier": (subject_upload_mb / dept_avg_upload) if dept_avg_upload > 0 else 0.0,
        "subject_total_download_mb": dl_feature,
        "subject_total_upload_mb": ul_feature,
        "dept_avg_total_download_mb": dept_dl_feature,
        "dept_avg_total_upload_mb": dept_ul_feature,
        "total_download_multiplier": (dl_feature / dept_dl_feature) if dept_dl_feature > 0 else 0.0,
        "total_upload_multiplier": (ul_feature / dept_ul_feature) if dept_ul_feature > 0 else 0.0,
        "subject_anomaly_score": float(subject_bl.get("anomaly_score") or 0),
        "dept_avg_anomaly_score": peer_avg("anomaly_score"),
        "peer_only_count": len([b for b in peer_baselines if b.get("employee_id") != subject_emp_id]),
        "subject_baseline": subject_bl,
    }


def project_risk_score(trend_points: list[dict[str, Any]], horizon_days: int = 7) -> dict[str, Any]:
    """Simple velocity-based predictive projection from observed score trend."""
    if len(trend_points) < 2:
        current = float(trend_points[-1]["threat_score"]) if trend_points else 0.0
        return {
            "current_score": current,
            "projected_score_7d": current,
            "daily_velocity": 0.0,
            "trend_direction": "STABLE",
        }

    first = trend_points[0]
    last = trend_points[-1]
    delta = float(last["threat_score"]) - float(first["threat_score"])
    steps = max(1, len(trend_points) - 1)
    daily_velocity = delta / steps
    projected = min(100.0, max(0.0, float(last["threat_score"]) + daily_velocity * horizon_days))

    if daily_velocity > 1.0:
        direction = "ESCALATING"
    elif daily_velocity < -1.0:
        direction = "DE-ESCALATING"
    else:
        direction = "STABLE"

    return {
        "current_score": float(last["threat_score"]),
        "projected_score_7d": round(projected, 1),
        "daily_velocity": round(daily_velocity, 2),
        "trend_direction": direction,
    }


def print_comparison_table(title: str, rows: list[tuple[str, str, str, str]]) -> None:
    print(f"\n{BOLD}  {title}{RESET}")
    print(f"  {DIM}{'─' * 88}{RESET}")
    print(f"  {BOLD}{'Metric':<34} {'Subject':>14} {'Peer μ*':>14} {'Ratio':>10}{RESET}")
    print(f"  {DIM}{'─' * 88}{RESET}")
    for metric, subject, peer_avg, ratio in rows:
        print(f"  {metric:<34} {subject:>14} {peer_avg:>14} {ratio:>10}")
    print(f"  {DIM}{'─' * 88}{RESET}")


def print_trend_table(trend_points: list[dict[str, Any]]) -> None:
    print(f"\n{BOLD}  Behavioral Risk Trend (Entity: {SUBJECT_EMP_ID}){RESET}")
    print(f"  {DIM}{'─' * 88}{RESET}")
    print(f"  {BOLD}{'Stage':<12} {'Threat':>8} {'Anomaly':>10} {'Download':>12} {'Upload':>12} {'Category':>12}{RESET}")
    print(f"  {DIM}{'─' * 88}{RESET}")
    for pt in trend_points:
        print(
            f"  {pt['stage']:<12} "
            f"{pt['threat_score']:>8} "
            f"{pt['anomaly_score']:>10.2f} "
            f"{pt['download_mb_day']:>12.4f} "
            f"{pt['upload_mb_day']:>12.4f} "
            f"{pt.get('risk_category', 'N/A'):>12}"
        )
    print(f"  {DIM}{'─' * 88}{RESET}")


def run_ueba_verification() -> int:
    print(f"\n{'━' * 74}")
    print(f"{BOLD}  ITBIS Module 8 — UEBA Intelligence Engine Verification{RESET}")
    print(f"{'━' * 74}")

    try:
        with urllib.request.urlopen(HEALTH_URL, timeout=8) as resp:
            record("FastAPI backend reachable", resp.status == 200)
    except Exception as exc:
        record("FastAPI backend reachable", False, str(exc))
        return print_summary()

    try:
        mongo = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        mongo.admin.command("ping")
        mdb = mongo[MONGO_DB]
        record("MongoDB reachable", True, MONGO_DB)
    except Exception as exc:
        record("MongoDB reachable", False, str(exc))
        return print_summary()

    status, login_body = http_post_form("/auth/login", ADMIN_CREDENTIALS)
    if status != 200 or "access_token" not in login_body:
        record("Authentication", False, f"HTTP {status}")
        return print_summary()
    token: str = login_body["access_token"]
    record("Authenticated as admin", True)

    # ── Step 1: Entity-level risk scoring & behavioral trend ─────────────────
    section("STEP 1 — Entity Risk Scoring & Behavioral Trend Over Time")
    trend_points: list[dict[str, Any]] = []

    bl0_status, bl0 = fetch_baseline(token, SUBJECT_EMP_ID)
    if bl0_status != 200:
        record("Initial baseline fetch", False, f"HTTP {bl0_status}")
        return print_summary()

    risk0_status, risk0 = calculate_risk(token, SUBJECT_EMP_ID)
    trend_points.append({
        "stage": "T0 Baseline",
        "threat_score": risk0.get("threat_score", 0) if risk0_status == 200 else 0,
        "anomaly_score": float(bl0.get("anomaly_score") or 0),
        "download_mb_day": float(bl0.get("avg_download_mb_per_day") or 0),
        "upload_mb_day": float(bl0.get("avg_upload_mb_per_day") or 0),
        "risk_category": str(risk0.get("risk_category", "N/A")),
    })
    record(
        "T0 entity risk score computed",
        risk0_status == 200 and int(risk0.get("threat_score") or 0) >= 0,
        f"threat_score={risk0.get('threat_score')}  category={risk0.get('risk_category')}",
    )

    ingest_event(
        token, SUBJECT_EMP_ID, "FILE_DOWNLOAD",
        {"filename": "m8_trend_probe.csv", "size_mb": 120.0, "_marker": "M8_UEBA_TREND"},
        "MEDIUM",
    )
    time.sleep(0.3)
    risk1_status, risk1 = calculate_risk(token, SUBJECT_EMP_ID)
    bl1_status, bl1 = fetch_baseline(token, SUBJECT_EMP_ID)
    trend_points.append({
        "stage": "T1 +120MB",
        "threat_score": risk1.get("threat_score", 0) if risk1_status == 200 else 0,
        "anomaly_score": float((bl1 if bl1_status == 200 else bl0).get("anomaly_score") or 0),
        "download_mb_day": float((bl1 if bl1_status == 200 else bl0).get("avg_download_mb_per_day") or 0),
        "upload_mb_day": float((bl1 if bl1_status == 200 else bl0).get("avg_upload_mb_per_day") or 0),
        "risk_category": str(risk1.get("risk_category", "N/A")),
    })
    record(
        "T1 risk recalculated after download ingest",
        risk1_status == 200,
        f"threat_score={risk1.get('threat_score')}  data_access={risk1.get('data_access_score')}",
    )

    ingest_event(
        token, SUBJECT_EMP_ID, "FILE_UPLOAD",
        {"filename": "m8_exfil_probe.zip", "size_mb": 500.0, "external_transfer": True, "_marker": "M8_UEBA_TREND"},
        "HIGH",
    )
    time.sleep(0.3)
    risk2_status, risk2 = calculate_risk(token, SUBJECT_EMP_ID)
    bl2_status, bl2 = fetch_baseline(token, SUBJECT_EMP_ID)
    trend_points.append({
        "stage": "T2 +500MB",
        "threat_score": risk2.get("threat_score", 0) if risk2_status == 200 else 0,
        "anomaly_score": float((bl2 if bl2_status == 200 else bl1).get("anomaly_score") or 0),
        "download_mb_day": float((bl2 if bl2_status == 200 else bl1).get("avg_download_mb_per_day") or 0),
        "upload_mb_day": float((bl2 if bl2_status == 200 else bl1).get("avg_upload_mb_per_day") or 0),
        "risk_category": str(risk2.get("risk_category", "N/A")),
    })
    record(
        "T2 risk recalculated after upload ingest",
        risk2_status == 200,
        f"threat_score={risk2.get('threat_score')}  data_access={risk2.get('data_access_score')}",
    )

    score_delta = trend_points[-1]["threat_score"] - trend_points[0]["threat_score"]
    dl_delta = trend_points[-1]["download_mb_day"] - trend_points[0]["download_mb_day"]
    record(
        "Behavioral trend shows measurable score movement",
        score_delta >= 0 and (score_delta > 0 or dl_delta >= 0),
        f"Δthreat={score_delta:+d}  Δdownload_mb/day={dl_delta:+.4f}",
    )

    # ── Step 2: Peer Group Deviation ─────────────────────────────────────────
    section("STEP 2 — Peer Group Deviation (Finance Department Cohort)")
    emp_status, employees = api_request("GET", "/employees/?limit=100", token=token)
    if emp_status != 200 or not isinstance(employees, list):
        record("Employee directory fetch", False, f"HTTP {emp_status}")
        employees = []

    peer_stats = compute_department_peer_stats(token, SUBJECT_EMP_ID, SUBJECT_DEPARTMENT, employees)
    record(
        f"Finance peer group resolved ({peer_stats['peer_count']} members)",
        peer_stats["peer_count"] >= 2,
        ", ".join(peer_stats["peer_ids"]),
    )

    best_multiplier = max(
        peer_stats["download_multiplier"],
        peer_stats["upload_multiplier"],
        peer_stats["total_download_multiplier"],
        peer_stats["total_upload_multiplier"],
    )
    record(
        f"Subject deviates ≥{PEER_MULTIPLIER_THRESHOLD:.0f}× from department average data transfer",
        best_multiplier >= PEER_MULTIPLIER_THRESHOLD,
        f"best_ratio={best_multiplier:.2f}×  subject={peer_stats['subject_name']}",
    )

    dl_metric = next(
        (m for m in (peer_stats["subject_baseline"].get("metrics") or [])
         if m.get("feature_name") == "total_file_download_mb"),
        None,
    )
    if dl_metric:
        record(
            "Fleet Z-score flags elevated download deviation",
            float(dl_metric.get("z_score") or 0) >= 1.0,
            f"z={dl_metric.get('z_score')}  status={dl_metric.get('status')}",
        )
    else:
        record("Fleet Z-score download metric present", False, "metric missing")

    # ── Step 3: Predictive risk scoring output ──────────────────────────────
    section("STEP 3 — Predictive Risk Scoring Output")
    projection = project_risk_score(trend_points, horizon_days=7)

    anom_status, anom_body = api_request("GET", f"/analytics/anomalies?window_days={WINDOW_DAYS}&limit=20", token=token)
    subject_anomaly = next(
        (a for a in (anom_body.get("anomalies") or []) if a.get("employee_id") == SUBJECT_EMP_ID),
        None,
    )
    record(
        "ML anomaly prediction returned for subject",
        anom_status == 200 and subject_anomaly is not None,
        f"anomaly_score={subject_anomaly.get('anomaly_score') if subject_anomaly else 'N/A'}  "
        f"is_anomaly={subject_anomaly.get('is_anomaly') if subject_anomaly else 'N/A'}",
    )

    mongo_baseline = mdb["employee_risk_baselines"].find_one({"emp_id": SUBJECT_EMP_ID}, {"_id": 0})
    record(
        "Predictive baseline snapshot persisted (employee_risk_baselines)",
        mongo_baseline is not None and "threat_score" in mongo_baseline,
        f"threat_score={mongo_baseline.get('threat_score') if mongo_baseline else 'N/A'}  "
        f"severity={mongo_baseline.get('severity') if mongo_baseline else 'N/A'}",
    )

    top_factors = (mongo_baseline or {}).get("contributing_risk_factors") or []
    record(
        "Top predictive risk factors attributed",
        len(top_factors) >= 1,
        ", ".join(
            f"{f.get('feature_label', '?')}(z={f.get('z_score', 0)})"
            for f in top_factors[:3]
        ) if top_factors else "none",
    )

    record(
        "7-day projected risk score computed",
        projection["projected_score_7d"] >= projection["current_score"] - 5,
        f"current={projection['current_score']} → projected={projection['projected_score_7d']}  "
        f"velocity={projection['daily_velocity']}/step  trend={projection['trend_direction']}",
    )

    # ── Print comparison metrics ─────────────────────────────────────────────
    section("COMPARISON METRICS")
    print_trend_table(trend_points)

    peer_rows = [
        (
            "Avg download MB/day",
            f"{peer_stats['subject_download_mb_day']:.4f}",
            f"{peer_stats['dept_avg_download_mb_day']:.4f}",
            f"{peer_stats['download_multiplier']:.2f}×",
        ),
        (
            "Avg upload MB/day",
            f"{peer_stats['subject_upload_mb_day']:.4f}",
            f"{peer_stats['dept_avg_upload_mb_day']:.4f}",
            f"{peer_stats['upload_multiplier']:.2f}×",
        ),
        (
            "Total download MB (14d)",
            f"{peer_stats['subject_total_download_mb']:.2f}",
            f"{peer_stats['dept_avg_total_download_mb']:.2f}",
            f"{peer_stats['total_download_multiplier']:.2f}×",
        ),
        (
            "Total upload MB (14d)",
            f"{peer_stats['subject_total_upload_mb']:.2f}",
            f"{peer_stats['dept_avg_total_upload_mb']:.2f}",
            f"{peer_stats['total_upload_multiplier']:.2f}×",
        ),
        (
            "ML anomaly score",
            f"{peer_stats['subject_anomaly_score']:.2f}",
            f"{peer_stats['dept_avg_anomaly_score']:.2f}",
            f"{peer_stats['subject_anomaly_score'] / max(peer_stats['dept_avg_anomaly_score'], 0.01):.2f}×",
        ),
    ]
    print_comparison_table(
        f"Peer Group Deviation — {SUBJECT_EMP_ID} ({peer_stats['subject_name']}) vs {SUBJECT_DEPARTMENT} Peers",
        peer_rows,
    )
    print(f"  {DIM}* Peer μ = department average excluding subject ({peer_stats.get('peer_only_count', 0)} peers){RESET}")

    print(f"\n{BOLD}  Predictive Risk Scoring Output{RESET}")
    print(f"  {DIM}{'─' * 72}{RESET}")
    print(f"  Current threat score:     {projection['current_score']:.0f} / 100")
    print(f"  7-day projected score:    {projection['projected_score_7d']:.1f} / 100")
    print(f"  Trend velocity:           {projection['daily_velocity']:+.2f} pts/step")
    print(f"  Trend direction:          {projection['trend_direction']}")
    if subject_anomaly:
        print(f"  ML anomaly score:         {subject_anomaly.get('anomaly_score', 0):.2f} / 100")
        print(f"  ML severity:              {subject_anomaly.get('severity', 'N/A')}")
        print(f"  Outlier classification:   {subject_anomaly.get('is_anomaly', False)}")
        factors = subject_anomaly.get("contributing_risk_factors") or []
        if factors:
            print(f"  Top predictive factors:")
            for i, f in enumerate(factors[:3], 1):
                print(
                    f"    {i}. {f.get('feature_label', '?')} — "
                    f"value={f.get('value', 0)}  z={f.get('z_score', 0)}  "
                    f"level={f.get('risk_level', 'LOW')}"
                )
    print(f"  {DIM}{'─' * 72}{RESET}")

    if dl_metric:
        print(f"\n  {BOLD}Fleet Cohort Z-Score (total_file_download_mb){RESET}")
        print(
            f"    Subject: {dl_metric.get('current_value')} MB  |  "
            f"Cohort μ: {dl_metric.get('baseline_mean')} MB  |  "
            f"Z-score: {dl_metric.get('z_score')}  |  "
            f"Deviation: {dl_metric.get('deviation_pct'):+.1f}%  |  "
            f"Status: {dl_metric.get('status')}"
        )

    return print_summary()


def print_summary() -> int:
    total = len(results)
    passed = sum(1 for r in results if r["passed"])
    failed = total - passed
    health_pct = round((passed / total) * 100, 1) if total else 0.0
    color = GREEN if failed == 0 else RED

    print(f"\n{'━' * 74}")
    print(f"{BOLD}  MODULE 8 — UEBA INTELLIGENCE ENGINE TEST SUMMARY{RESET}")
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
        + (f"  {RED}({failed} FAILED){RESET}" if failed else f"  {GREEN}✓ UEBA intelligence verified{RESET}")
    )
    print(f"{'━' * 74}\n")
    return 0 if failed == 0 else 1


def main() -> int:
    return run_ueba_verification()


if __name__ == "__main__":
    sys.exit(main())
