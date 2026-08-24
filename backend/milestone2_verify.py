#!/usr/bin/env python3
"""
ITBIS — Milestone 2 Health & Verification Script
=================================================
Validates the complete Milestone 2 Behavioral ML Pipeline & FastAPI Integration:
  1. Auth & RBAC        — Login (all 4 RBAC roles) + JWT Bearer validation
  2. Telemetry & DB     — MongoDB activity logs readiness & employee dataset verification
  3. ML Model Artifacts — Model, scaler, and metadata artifact integrity & cache verification
  4. Feature Vectors    — Telemetry aggregation into 8-dimensional behavioral feature vectors
  5. ML Anomaly Engine  — Isolation Forest inference, threat persona discrimination & metrics
  6. Live API Endpoints — /calculate-risk, /anomalies, and /baseline routes

Run from backend/ directory with venv activated:
    python milestone2_verify.py
"""

from __future__ import annotations

import json
import math
import os
import pathlib
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple

# Enable UTF-8 encoding on Windows terminal stdout
if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ── Configuration ─────────────────────────────────────────────────────────────

BASE_URL   = "http://127.0.0.1:8000/api/v1"
HEALTH_URL = "http://127.0.0.1:8000/health"

# All 4 RBAC roles seeded by seed_data.py
TEST_USERS = [
    {"email": "admin@itbis.internal",   "password": "Admin1234!",   "role": "ADMINISTRATOR"},
    {"email": "manager@itbis.internal", "password": "Manager123!",  "role": "SECURITY_MANAGER"},
    {"email": "soc@itbis.internal",     "password": "SocEng123!",   "role": "SOC_ENGINEER"},
    {"email": "analyst@itbis.internal", "password": "Analyst123!",  "role": "SECURITY_ANALYST"},
]

PRIMARY_USER   = TEST_USERS[0]   # admin used for API checks
THREAT_PERSONAS = ("emp_1001", "emp_1002", "emp_1003")
BENIGN_PERSONAS = ("emp_1004", "emp_1005", "emp_1006")
RISK_LEVELS    = ["CRITICAL", "HIGH", "MEDIUM", "LOW"]

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


def http_post_json(path: str, payload: dict[str, Any], token: str) -> tuple[int, Any]:
    """POST application/json returning (status_code, parsed_json)."""
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
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read())
        except Exception:
            body = {}
        return e.code, body
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
# SECTION 1 — AUTHENTICATION & RBAC
# ══════════════════════════════════════════════════════════════════════════════

def run_auth_checks() -> str:
    section = "1. AUTH & RBAC"
    print(f"\n{BOLD}{CYAN}━━━  1. AUTHENTICATION & RBAC VALIDATION  ━━━{RESET}")
    admin_token = ""

    for user in TEST_USERS:
        status, body = http_post_form(
            "/auth/login",
            {"username": user["email"], "password": user["password"]},
        )
        token = body.get("access_token", "")
        passed = status == 200 and bool(token)
        detail = f"role={user['role']}  token={'…' + token[-12:] if token else 'NONE'}"
        record(section, f"OAuth2 Login: {user['email']}", passed, detail)

        if user["email"] == PRIMARY_USER["email"] and passed:
            admin_token = token
    if admin_token:
        status, body = http_get("/auth/me", admin_token)
        me_ok = status == 200 and body.get("role") == "ADMINISTRATOR"
        record(section, "JWT Bearer Verification (admin token round-trip)",
               me_ok, f"role={body.get('role')}  email={body.get('email')}")
    else:
        record(section, "JWT Bearer Verification", False, "Admin login failed")

    return admin_token


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 2 — TELEMETRY & DATABASE READINESS
# ══════════════════════════════════════════════════════════════════════════════

def run_telemetry_checks(token: str) -> list[dict]:
    section = "2. TELEMETRY & DB"
    print(f"\n{BOLD}{CYAN}━━━  2. TELEMETRY DATASET & DB READINESS  ━━━{RESET}")

    # 2a — Employee records in PostgreSQL
    status, body = http_get("/employees/?limit=200", token)
    employees = body if isinstance(body, list) else []
    emp_count = len(employees)
    passed = status == 200 and emp_count >= 15
    record(section, "PostgreSQL Employee Directory", passed,
           f"{emp_count} active employees registered (expected ≥15)")

    # 2b — Threat persona presence
    emp_ids = {e.get("emp_id") for e in employees}
    threats_present = all(t in emp_ids for t in THREAT_PERSONAS)
    record(section, "Threat Persona Verification (emp_1001, emp_1002, emp_1003)",
           threats_present, f"found personas in directory: {list(THREAT_PERSONAS)}")

    # 2c — MongoDB telemetry events for threat personas
    total_threat_events = 0
    for t_id in THREAT_PERSONAS:
        status, logs = http_get(f"/telemetry/logs/{t_id}?limit=100", token)
        logs_list = logs if isinstance(logs, list) else []
        n_logs = len(logs_list)
        total_threat_events += n_logs
        record(section, f"  Telemetry stream for {t_id}",
               status == 200 and n_logs > 0, f"{n_logs} telemetry events retrieved")

    # 2d — MongoDB telemetry events for benign sample
    status, b_logs = http_get(f"/telemetry/logs/{BENIGN_PERSONAS[0]}?limit=50", token)
    b_list = b_logs if isinstance(b_logs, list) else []
    record(section, f"  Telemetry stream for benign sample ({BENIGN_PERSONAS[0]})",
           status == 200 and len(b_list) > 0, f"{len(b_list)} baseline events retrieved")

    return employees


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 3 — ML MODEL ARTIFACTS & INTEGRITY
# ══════════════════════════════════════════════════════════════════════════════

def run_ml_artifacts_checks() -> bool:
    section = "3. ML ARTIFACTS"
    print(f"\n{BOLD}{CYAN}━━━  3. MACHINE LEARNING ENGINE ARTIFACTS  ━━━{RESET}")

    saved_dir = pathlib.Path(__file__).resolve().parent / "app" / "models" / "saved_models"
    model_file = saved_dir / "isolation_forest.joblib"
    scaler_file = saved_dir / "scaler.joblib"
    metadata_file = saved_dir / "model_metadata.json"

    # 3a — Artifact presence
    model_exists = model_file.exists() and model_file.stat().st_size > 1000
    scaler_exists = scaler_file.exists() and scaler_file.stat().st_size > 100
    meta_exists = metadata_file.exists() and metadata_file.stat().st_size > 50

    record(section, "Model artifact: isolation_forest.joblib", model_exists,
           f"size={model_file.stat().st_size if model_file.exists() else 0} bytes")
    record(section, "Scaler artifact: scaler.joblib", scaler_exists,
           f"size={scaler_file.stat().st_size if scaler_file.exists() else 0} bytes")
    record(section, "Metadata artifact: model_metadata.json", meta_exists,
           f"path={metadata_file.name}")

    if not (model_exists and scaler_exists):
        return False

    # 3b — Model loading via ML engine service
    try:
        from app.services.ml_engine import load_trained_model, FEATURE_COLUMNS
        model, scaler, meta = load_trained_model(force_reload=True)
        load_ok = model is not None and scaler is not None
        record(section, "Artifact In-Memory Deserialization & Cache", load_ok,
               f"n_estimators={getattr(model, 'n_estimators', '?')}  features={len(FEATURE_COLUMNS)}")

        # 3c — Metadata contents verification
        n_samples = meta.get("total_samples", 0)
        metrics = meta.get("precision_metrics", {})
        meta_ok = n_samples >= 15 and "f1_score" in metrics
        record(section, "Training Metadata & Performance Metrics", meta_ok,
               f"samples={n_samples}  F1={metrics.get('f1_score')}  precision={metrics.get('precision')}  recall={metrics.get('recall')}")
        return True
    except Exception as exc:
        record(section, "Artifact In-Memory Deserialization", False, str(exc))
        return False


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 4 — BEHAVIORAL FEATURE ENGINEERING
# ══════════════════════════════════════════════════════════════════════════════

def run_feature_engineering_checks() -> dict[str, Any]:
    section = "4. FEATURE PIPELINE"
    print(f"\n{BOLD}{CYAN}━━━  4. BEHAVIORAL FEATURE EXTRACTION  ━━━{RESET}")

    extracted_vectors: dict[str, Any] = {}
    try:
        from app.services.feature_extraction import extract_all_employee_features_sync, extract_employee_features_sync

        # 4a — Batch extraction
        vectors = extract_all_employee_features_sync(window_days=14)
        vec_count = len(vectors)
        passed = vec_count >= 15
        record(section, "Batch Telemetry Feature Extraction (14-day window)", passed,
               f"generated {vec_count} employee vectors")

        for v in vectors:
            extracted_vectors[v.employee_id] = v

        # 4b — Feature verification for emp_1001 (Data Exfiltration)
        v1 = extracted_vectors.get("emp_1001")
        v1_ok = v1 is not None and v1.total_file_upload_mb >= 500.0 and v1.critical_event_count >= 5
        record(section, "emp_1001 Exfiltration Indicators", v1_ok,
               f"upload={v1.total_file_upload_mb if v1 else 0}MB  off_hours={v1.off_hours_logon_count if v1 else 0}  crit={v1.critical_event_count if v1 else 0}")

        # 4c — Feature verification for emp_1002 (Privilege Escalation)
        v2 = extracted_vectors.get("emp_1002")
        v2_ok = v2 is not None and v2.privilege_escalation_count >= 3 and v2.failed_logon_count >= 3
        record(section, "emp_1002 Privilege Escalation Indicators", v2_ok,
               f"priv_esc={v2.privilege_escalation_count if v2 else 0}  failed_logon={v2.failed_logon_count if v2 else 0}  crit={v2.critical_event_count if v2 else 0}")

        # 4d — Feature verification for emp_1003 (Removable Storage & Sabotage)
        v3 = extracted_vectors.get("emp_1003")
        v3_ok = v3 is not None and v3.usb_device_connect_count >= 2 and v3.total_file_download_mb >= 500.0
        record(section, "emp_1003 Removable Media & Sabotage Indicators", v3_ok,
               f"usb_connects={v3.usb_device_connect_count if v3 else 0}  download={v3.total_file_download_mb if v3 else 0}MB")

        # 4e — Feature verification for benign employee
        vb = extracted_vectors.get("emp_1004")
        vb_ok = vb is not None and vb.privilege_escalation_count == 0 and vb.total_file_upload_mb < 50.0
        record(section, "emp_1004 Benign Baseline Indicators", vb_ok,
               f"upload={vb.total_file_upload_mb if vb else 0}MB  priv_esc={vb.privilege_escalation_count if vb else 0}  crit={vb.critical_event_count if vb else 0}")

    except Exception as exc:
        record(section, "Feature Extraction Pipeline", False, str(exc))

    return extracted_vectors


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 5 — ML ANOMALY INFERENCE & PERSONA DISCRIMINATION
# ══════════════════════════════════════════════════════════════════════════════

def run_ml_inference_checks(vectors: dict[str, Any]) -> None:
    section = "5. ML INFERENCE"
    print(f"\n{BOLD}{CYAN}━━━  5. ISOLATION FOREST INFERENCE & DISCRIMINATION  ━━━{RESET}")

    try:
        from app.services.ml_engine import predict_employee_anomaly

        predictions: list[dict[str, Any]] = []

        # 5a — Inference on threat actors
        for t_id in THREAT_PERSONAS:
            v = vectors.get(t_id)
            if not v:
                record(section, f"ML Anomaly Inference: {t_id}", False, "Vector missing")
                continue
            pred = predict_employee_anomaly(v)
            predictions.append(pred)

            score = pred.get("anomaly_score", 0.0)
            is_anom = pred.get("is_anomaly", False)
            sev = pred.get("severity", "")
            factors = pred.get("contributing_risk_factors", [])

            is_high_threat = bool(is_anom and score >= 80.0 and sev in ("CRITICAL", "HIGH"))
            top_factor_label = (
                factors[0].get("feature_label")
                if factors and isinstance(factors[0], dict)
                else getattr(factors[0], "feature_label", "None") if factors else "None"
            )
            record(
                section,
                f"Threat Classification: {t_id}",
                is_high_threat,
                f"score={score}/100  sev={sev}  outlier={is_anom}  top_factor={top_factor_label}",
            )

        # 5b — Inference on benign cohort
        benign_pass = True
        for b_id in BENIGN_PERSONAS:
            v = vectors.get(b_id)
            if not v:
                continue
            pred = predict_employee_anomaly(v)
            predictions.append(pred)

            score = pred.get("anomaly_score", 0.0)
            is_anom = pred.get("is_anomaly", False)
            sev = pred.get("severity", "")

            is_benign = not is_anom and score < 45.0 and sev in ("NORMAL", "LOW")
            if not is_benign:
                benign_pass = False
            record(
                section,
                f"Benign Classification: {b_id}",
                is_benign,
                f"score={score}/100  sev={sev}  outlier={is_anom}",
            )

        # 5c — Precision & F1 metric validation
        from app.services.ml_engine import evaluate_precision_metrics
        all_preds = [predict_employee_anomaly(v) for v in vectors.values()]
        metrics = evaluate_precision_metrics(all_preds, known_threats=THREAT_PERSONAS)

        perf_ok = metrics.get("f1_score", 0.0) >= 0.90 and metrics.get("false_positives", 99) <= 1
        record(
            section,
            "Cohort Threat Discrimination (Precision / Recall / F1)",
            perf_ok,
            f"Precision={metrics.get('precision')}  Recall={metrics.get('recall')}  F1={metrics.get('f1_score')}  TP={metrics.get('true_positives')} FP={metrics.get('false_positives')}",
        )

    except Exception as exc:
        record(section, "ML Inference Engine", False, str(exc))


# ══════════════════════════════════════════════════════════════════════════════
# SECTION 6 — LIVE API ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

def run_api_endpoints_checks(token: str) -> None:
    section = "6. API ENDPOINTS"
    print(f"\n{BOLD}{CYAN}━━━  6. FASTAPI ANALYTICS & ANOMALIES ENDPOINTS  ━━━{RESET}")

    # 6a — POST /analytics/calculate-risk for threat actor emp_1001
    status, body1 = http_post_json(
        "/analytics/calculate-risk",
        {"emp_id": "emp_1001", "window_hours": 24},
        token,
    )
    score1 = body1.get("threat_score", 0)
    cat1 = body1.get("risk_category", "")
    passed1 = status == 200 and score1 >= 60 and cat1 in ("HIGH", "CRITICAL")
    record(
        section,
        "POST /analytics/calculate-risk (emp_1001 live ML scoring)",
        passed1,
        f"threat_score={score1}  category={cat1}  anomaly_weight={body1.get('anomaly_weight')}  freq={body1.get('frequency')}",
    )

    # 6b — POST /analytics/calculate-risk for benign employee emp_1004
    status, body4 = http_post_json(
        "/analytics/calculate-risk",
        {"emp_id": "emp_1004", "window_hours": 24},
        token,
    )
    score4 = body4.get("threat_score", 0)
    cat4 = body4.get("risk_category", "")
    passed4 = status == 200 and score4 < 60 and cat4 in ("LOW", "MEDIUM")
    record(
        section,
        "POST /analytics/calculate-risk (emp_1004 benign scoring)",
        passed4,
        f"threat_score={score4}  category={cat4}  anomaly_weight={body4.get('anomaly_weight')}",
    )

    # 6c — GET /analytics/anomalies
    status, anom_body = http_get("/analytics/anomalies?window_days=14&only_anomalies=true", token)
    anomalies = anom_body.get("anomalies", [])
    total_anom = anom_body.get("total_anomalies", 0)
    anom_ok = status == 200 and total_anom >= 3 and len(anomalies) >= 3

    flagged_ids = [a.get("employee_id") for a in anomalies]
    has_all_threats = all(t in flagged_ids for t in THREAT_PERSONAS)

    record(
        section,
        "GET /analytics/anomalies (Flagged Outlier Cohort)",
        anom_ok and has_all_threats,
        f"total_flagged={total_anom}  top_anomalies={flagged_ids[:3]}",
    )

    # 6d — Anomaly schema & risk factor attribution
    if anomalies:
        top_a = anomalies[0]
        has_factors = len(top_a.get("contributing_risk_factors", [])) > 0
        has_features = len(top_a.get("features", {})) == 8
        schema_ok = has_factors and has_features and "anomaly_score" in top_a
        factors_labels = [f.get("feature_label") for f in top_a.get("contributing_risk_factors", [])]
        record(
            section,
            "  Anomaly Risk Factor Attribution Schema",
            schema_ok,
            f"factors={factors_labels[:2]}  raw_decision={top_a.get('raw_decision_score')}",
        )

    # 6e — GET /analytics/employee/emp_1001/baseline
    status, base1 = http_get("/analytics/employee/emp_1001/baseline?window_days=14", token)
    metrics1 = base1.get("metrics", [])
    base_ok1 = (
        status == 200
        and len(metrics1) == 8
        and base1.get("anomaly_score", 0) >= 80.0
        and base1.get("is_anomaly") is True
    )
    crit_metrics = [m.get("feature_label") for m in metrics1 if m.get("status") in ("CRITICAL", "ELEVATED")]
    record(
        section,
        "GET /analytics/employee/emp_1001/baseline (Deviations vs Population)",
        base_ok1,
        f"score={base1.get('anomaly_score')}  severity={base1.get('severity')}  elevated_metrics={crit_metrics}",
    )

    # 6f — GET /analytics/employee/emp_1004/baseline (Benign Baseline)
    status, base4 = http_get("/analytics/employee/emp_1004/baseline?window_days=14", token)
    metrics4 = base4.get("metrics", [])
    base_ok4 = (
        status == 200
        and len(metrics4) == 8
        and base4.get("anomaly_score", 100) < 50.0
        and base4.get("is_anomaly") is False
    )
    record(
        section,
        "GET /analytics/employee/emp_1004/baseline (Benign Baseline)",
        base_ok4,
        f"score={base4.get('anomaly_score')}  severity={base4.get('severity')}  is_anomaly={base4.get('is_anomaly')}",
    )

    # 6g — GET /analytics/summary
    status, sum_body = http_get("/analytics/summary", token)
    sum_ok = status == 200 and sum_body.get("total_employees", 0) >= 15
    record(
        section,
        "GET /analytics/summary (Fleet Posture Alignment)",
        sum_ok,
        f"total={sum_body.get('total_employees')}  avg_threat={sum_body.get('average_threat_score')}  critical={sum_body.get('critical_count')}",
    )


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

    col_w = 54

    print(f"\n{'━' * 74}")
    print(f"{BOLD}  MILESTONE 2 — ML INTEGRATION & SYSTEM VERIFICATION SUMMARY{RESET}")
    print(f"{'━' * 74}")
    print(f"  {'TEST NAME':<{col_w}}  {'STATUS':^8}  DETAIL")
    print(f"  {'-' * col_w}  {'-' * 8}  {'-' * 42}")

    prev_section = ""
    for r in results:
        if r["section"] != prev_section:
            print(f"\n  {BOLD}{r['section']}{RESET}")
            prev_section = r["section"]
        status_str = f"{GREEN}PASS{RESET}" if r["passed"] else f"{RED}FAIL{RESET}"
        name_trunc = r["name"][:col_w]
        detail = (r["detail"][:55] + "…") if len(r["detail"]) > 56 else r["detail"]
        print(f"  {name_trunc:<{col_w}}  {status_str:^8}  {DIM}{detail}{RESET}")

    print(f"\n{'━' * 74}")
    result_color = GREEN if failed == 0 else RED
    health_pct = round((passed / total) * 100, 1) if total > 0 else 0
    print(
        f"  {BOLD}System Health: {result_color}{health_pct}% ({passed}/{total} tests passed){RESET}"
        + (f"  {RED}({failed} FAILED){RESET}" if failed else f"  {GREEN}✓ Milestone 2 Complete & Verified{RESET}")
    )
    print(f"{'━' * 74}\n")
    return 0 if failed == 0 else 1


# ══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ══════════════════════════════════════════════════════════════════════════════

def main() -> int:
    print(f"\n{'━' * 74}")
    print(f"{BOLD}  ITBIS — Milestone 2: ML Model Integration & System Verification{RESET}")
    print(f"  Target: {BASE_URL}")
    print(f"{'━' * 74}")

    # 1. Pre-flight server check
    print(f"\n{info('Checking FastAPI backend server availability...')}")
    if not check_server_alive():
        print(f"\n  {fail('Backend server is NOT reachable at http://127.0.0.1:8000')}")
        print(f"  {warn('Please start the server first in another terminal:')}")
        print(f"  {CYAN}cd backend && uvicorn app.main:app --port 8000{RESET}")
        print(f"  {warn('Then re-run: python milestone2_verify.py')}\n")
        return 1

    print(f"  {ok('FastAPI backend server is UP and responding at http://127.0.0.1:8000')}")
    time.sleep(0.2)

    # 2. Run All Verification Sections
    admin_token = run_auth_checks()
    if not admin_token:
        print(f"\n  {fail('Verification aborted: Admin authentication failed. Run seed_data.py first.')}\n")
        return 1

    run_telemetry_checks(admin_token)
    run_ml_artifacts_checks()
    vectors = run_feature_engineering_checks()
    run_ml_inference_checks(vectors)
    run_api_endpoints_checks(admin_token)

    return print_summary()


if __name__ == "__main__":
    sys.exit(main())
