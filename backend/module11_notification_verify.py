#!/usr/bin/env python3
"""
ITBIS — Module 11: Notification System Verification
====================================================
Validates the notification dispatch layer:

  1. In-app and email alert notifications for CRITICAL risk incidents
  2. Escalation notifications when an incident remains unassigned beyond threshold

Run from backend/ (PostgreSQL required; API server optional):
    python module11_notification_verify.py
"""

from __future__ import annotations

import json
import sys
from datetime import datetime, timedelta
from typing import Any

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

# ── ANSI helpers ──────────────────────────────────────────────────────────────
GREEN = "\033[92m"
RED = "\033[91m"
CYAN = "\033[96m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

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


def print_payload_logs(logs: list[dict[str, Any]], title: str) -> None:
    print(f"\n{BOLD}  Simulated Notification Payloads — {title}{RESET}")
    if not logs:
        print(f"  {DIM}(none){RESET}")
        return
    for idx, payload in enumerate(logs, start=1):
        print(f"\n  {DIM}── payload #{idx} ──{RESET}")
        print(json.dumps(payload, indent=2, default=str))


def run_verification() -> int:
    from app.db.init_db import init_db
    from app.db.session import SessionLocal
    from app.models.domain import (
        Employee,
        Incident,
        IncidentSeverityEnum,
        IncidentStatusEnum,
        User,
    )
    from app.services.notification_service import (
        DEFAULT_ESCALATION_THRESHOLD_MINUTES,
        NotificationChannel,
        NotificationType,
        clear_simulated_delivery_log,
        dispatch_critical_alert_notifications,
        get_simulated_delivery_log,
        scan_unassigned_incident_escalations,
    )
    from app.api.v1.endpoints.incidents import auto_trigger_incident

    section("Module 11 — Notification System Verification")
    print(f"  Escalation SLA threshold: {DEFAULT_ESCALATION_THRESHOLD_MINUTES} minutes")

    init_db()
    db = SessionLocal()

    try:
        # ── Setup: resolve a test employee and ensure SOC users exist ────────
        critical_emp = db.query(Employee).filter(Employee.emp_id == "emp_1002").first()
        escalation_emp = db.query(Employee).filter(Employee.emp_id == "emp_1001").first()
        if critical_emp is None or escalation_emp is None:
            critical_emp = escalation_emp = db.query(Employee).first()
        if critical_emp is None:
            print(f"{RED}No employees found — run seed_data.py first.{RESET}")
            return 1

        soc_users = db.query(User).filter(User.is_active.is_(True)).count()
        record("SOC platform users available for delivery", soc_users > 0, f"count={soc_users}")

        # ── Test 1: CRITICAL alert — in-app + email ──────────────────────────
        section("Test 1 — CRITICAL Risk Alert Notifications")
        clear_simulated_delivery_log()

        # Ensure a fresh CREATE path so the auto-trigger notification hook fires
        # reliably across repeated runs (not only on first upsert).
        open_for_critical_emp = (
            db.query(Incident)
            .filter(
                Incident.employee_id == critical_emp.id,
                Incident.status.in_(
                    [IncidentStatusEnum.NEW, IncidentStatusEnum.UNDER_INVESTIGATION]
                ),
            )
            .all()
        )
        if open_for_critical_emp:
            now = datetime.utcnow()
            for inc in open_for_critical_emp:
                inc.status = IncidentStatusEnum.RESOLVED
                inc.resolved_at = now
                inc.updated_at = now
            db.commit()

        critical_incident = auto_trigger_incident(emp=critical_emp, threat_score=94, db=db)
        record(
            "Auto-trigger created CRITICAL incident (score=94)",
            critical_incident is not None
            and critical_incident.severity is IncidentSeverityEnum.CRITICAL,
            (
                f"id={critical_incident.id if critical_incident else 'n/a'}  "
                f"severity={critical_incident.severity.value if critical_incident else 'n/a'}"
            ),
        )

        critical_logs = get_simulated_delivery_log()
        in_app_critical = [
            p for p in critical_logs
            if p["channel"] == NotificationChannel.IN_APP.value
            and p["notification_type"] == NotificationType.CRITICAL_ALERT.value
        ]
        email_critical = [
            p for p in critical_logs
            if p["channel"] == NotificationChannel.EMAIL.value
            and p["notification_type"] == NotificationType.CRITICAL_ALERT.value
        ]

        record(
            "In-app notifications dispatched for CRITICAL alert",
            len(in_app_critical) > 0,
            f"count={len(in_app_critical)}",
        )
        record(
            "Email notifications dispatched for CRITICAL alert",
            len(email_critical) > 0,
            f"count={len(email_critical)}",
        )
        record(
            "All CRITICAL payloads reference the incident",
            all(p.get("incident_id") == critical_incident.id for p in critical_logs)  # type: ignore[union-attr]
            if critical_incident and critical_logs
            else False,
            f"incident_id={critical_incident.id if critical_incident else 'n/a'}",
        )

        print_payload_logs(critical_logs, "CRITICAL Risk Alert")

        # ── Test 2: Escalation for unassigned incident past threshold ────────
        section("Test 2 — Unassigned Incident Escalation Notifications")
        clear_simulated_delivery_log()

        stale_created_at = datetime.utcnow() - timedelta(
            minutes=DEFAULT_ESCALATION_THRESHOLD_MINUTES + 15
        )
        stale_incident = Incident(
            title=f"[M11 TEST] Stale unassigned incident — {escalation_emp.emp_id}",
            description="Module 11 verification — escalation SLA breach test case.",
            status=IncidentStatusEnum.NEW,
            severity=IncidentSeverityEnum.HIGH,
            threat_score=82,
            employee_id=escalation_emp.id,
            assigned_to_id=None,
            trigger_reason="M11_ESCALATION_TEST",
            triggered_at=stale_created_at,
            created_at=stale_created_at,
            updated_at=stale_created_at,
        )
        db.add(stale_incident)
        db.commit()
        db.refresh(stale_incident)

        escalation_dispatched = scan_unassigned_incident_escalations(
            db,
            threshold_minutes=DEFAULT_ESCALATION_THRESHOLD_MINUTES,
        )
        escalation_logs = get_simulated_delivery_log()

        in_app_escalation = [
            p for p in escalation_logs
            if p["channel"] == NotificationChannel.IN_APP.value
            and p["notification_type"] == NotificationType.ESCALATION.value
            and p.get("incident_id") == stale_incident.id
        ]
        email_escalation = [
            p for p in escalation_logs
            if p["channel"] == NotificationChannel.EMAIL.value
            and p["notification_type"] == NotificationType.ESCALATION.value
            and p.get("incident_id") == stale_incident.id
        ]

        record(
            "Escalation scan dispatched notifications",
            len(escalation_dispatched) > 0,
            f"total={len(escalation_dispatched)}",
        )
        record(
            "In-app escalation notifications sent",
            len(in_app_escalation) > 0,
            f"count={len(in_app_escalation)}",
        )
        record(
            "Email escalation notifications sent",
            len(email_escalation) > 0,
            f"count={len(email_escalation)}",
        )
        record(
            "Escalation metadata includes unassigned duration",
            all(
                (p.get("metadata") or {}).get("unassigned_minutes", 0)
                >= DEFAULT_ESCALATION_THRESHOLD_MINUTES
                for p in email_escalation
            ),
            f"threshold={DEFAULT_ESCALATION_THRESHOLD_MINUTES} min",
        )

        # Duplicate scan must not re-fire for the same test incident
        clear_simulated_delivery_log()
        rescan_all = scan_unassigned_incident_escalations(
            db,
            threshold_minutes=DEFAULT_ESCALATION_THRESHOLD_MINUTES,
        )
        rescan_for_test_incident = [
            p for p in get_simulated_delivery_log()
            if p.get("incident_id") == stale_incident.id
        ]
        record(
            "Duplicate escalation suppressed for test incident",
            len(rescan_for_test_incident) == 0,
            f"redispatched_for_test_incident={len(rescan_for_test_incident)} "
            f"(other_stale_in_db={len(rescan_all)})",
        )

        test_escalation_logs = [
            p for p in escalation_logs if p.get("incident_id") == stale_incident.id
        ]
        print_payload_logs(test_escalation_logs, f"Unassigned Incident #{stale_incident.id} Escalation")

        # ── Direct-dispatch sanity: HIGH severity must not alert ─────────────
        section("Sanity — Non-CRITICAL Incidents Do Not Alert")
        clear_simulated_delivery_log()
        high_only = Incident(
            title="[M11 TEST] HIGH severity — no notification expected",
            description="Sanity check",
            status=IncidentStatusEnum.NEW,
            severity=IncidentSeverityEnum.HIGH,
            threat_score=80,
            employee_id=escalation_emp.id,
            trigger_reason="M11_SANITY",
            triggered_at=datetime.utcnow(),
        )
        db.add(high_only)
        db.commit()
        db.refresh(high_only)
        direct = dispatch_critical_alert_notifications(incident=high_only, db=db)
        record(
            "HIGH severity incident produces zero CRITICAL notifications",
            len(direct) == 0 and len(get_simulated_delivery_log()) == 0,
            "expected=0",
        )

    finally:
        db.close()

    # ── Summary ──────────────────────────────────────────────────────────────
    passed = sum(1 for r in results if r["passed"])
    total = len(results)
    pct = (passed / total * 100) if total else 0.0

    section("Summary")
    print(f"  Checks passed: {passed}/{total} ({pct:.1f}%)")
    if passed == total:
        print(f"\n  {GREEN}{BOLD}All Module 11 notification checks passed.{RESET}\n")
        return 0

    print(f"\n  {RED}{BOLD}Some Module 11 notification checks failed.{RESET}\n")
    for r in results:
        if not r["passed"]:
            print(f"  {RED}✗{RESET} {r['name']}" + (f" — {r['detail']}" if r["detail"] else ""))
    return 1


if __name__ == "__main__":
    raise SystemExit(run_verification())
