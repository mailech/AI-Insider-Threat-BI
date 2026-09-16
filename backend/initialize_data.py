#!/usr/bin/env python3
"""
InsiderIQ – Database initializer / seed script.

Run once (or repeatedly – it is fully idempotent):

    cd backend
    python initialize_data.py

What it does
------------
1. Creates all SQL tables via SQLAlchemy metadata.
2. Creates 4 role-based user accounts (skipped if they already exist).
3. Creates 18 employees across 6 departments with devices (skipped if any employee exists).
4. Builds BehaviorProfile baselines for each employee.
5. Generates realistic ActivityLog rows for the past 30 days.
6. Computes RiskScores (calls the ML service; falls back to a local heuristic if unavailable).
7. Scans for anomalies and raises alerts via the anomaly service.
8. Creates sample Investigations.
9. Creates system Notifications.
"""

from __future__ import annotations

import random
import sys
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

# Ensure the app package is importable when the script is run from backend/
import os

sys.path.insert(0, os.path.dirname(__file__))

from sqlalchemy import select, text
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base, utcnow
from app.db.session import engine, SessionLocal
from app.models import (
    ActivityLog,
    ActivityType,
    Alert,
    AlertStatus,
    Anomaly,
    AnomalyCategory,
    AnomalyStatus,
    BehaviorProfile,
    Device,
    Employee,
    Investigation,
    InvestigationEvent,
    InvestigationStatus,
    Notification,
    RiskBand,
    RiskScore,
    Role,
    Severity,
    User,
    UserStatus,
)
from app.services import anomaly_service, notification_service
from app.services.behavior_service import build_profile
from app.services.ml_client import MLServiceError, score_batch

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

RNG = random.Random(42)  # deterministic seed for reproducibility


def _utc(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _days_ago(n: float) -> datetime:
    return _now() - timedelta(days=n)


def _rand_ip() -> str:
    return f"10.{RNG.randint(1,9)}.{RNG.randint(0,255)}.{RNG.randint(1,254)}"


def _rand_timestamp(start: datetime, end: datetime) -> datetime:
    delta = (end - start).total_seconds()
    return start + timedelta(seconds=RNG.uniform(0, delta))


# ---------------------------------------------------------------------------
# Step 1 – Create tables
# ---------------------------------------------------------------------------

def create_tables() -> None:
    print("→ Creating database tables …")
    Base.metadata.create_all(bind=engine)
    print("  ✓ Tables ready.")


# ---------------------------------------------------------------------------
# Step 2 – Role accounts
# ---------------------------------------------------------------------------

ROLE_ACCOUNTS = [
    ("admin@insideriq.dev", "Admin User", Role.ADMINISTRATOR),
    ("security.manager@insideriq.dev", "Security Manager", Role.SECURITY_MANAGER),
    ("soc.engineer@insideriq.dev", "SOC Engineer", Role.SOC_ENGINEER),
    ("analyst@insideriq.dev", "Security Analyst", Role.SECURITY_ANALYST),
]


def create_role_accounts(db: Session) -> list[User]:
    print("→ Creating role accounts …")
    users: list[User] = []
    password_hash = hash_password(settings.initial_account_password)
    for email, full_name, role in ROLE_ACCOUNTS:
        existing = db.scalars(select(User).where(User.email == email)).first()
        if existing:
            print(f"  ⏭  {email} already exists – skipped.")
            users.append(existing)
            continue
        user = User(
            email=email,
            full_name=full_name,
            password_hash=password_hash,
            role=role,
            status=UserStatus.ACTIVE,
        )
        db.add(user)
        users.append(user)
        print(f"  ✓  Created {role}: {email}")
    db.commit()
    for user in users:
        db.refresh(user)
    return users


# ---------------------------------------------------------------------------
# Step 3 – Employees + Devices
# ---------------------------------------------------------------------------

EMPLOYEE_SEED = [
    # (first, last, dept, designation, access_level, manager_name)
    ("Alice",   "Morgan",    "Engineering",  "Senior Software Engineer",    "Elevated",  "David Kim"),
    ("Bob",     "Chen",      "Engineering",  "DevOps Engineer",             "Elevated",  "David Kim"),
    ("Carol",   "Williams",  "Engineering",  "Software Engineer",           "Standard",  "David Kim"),
    ("David",   "Kim",       "Engineering",  "Engineering Manager",         "Admin",     None),
    ("Eva",     "Patel",     "Finance",      "Financial Analyst",           "Standard",  "Frank Torres"),
    ("Frank",   "Torres",    "Finance",      "Finance Manager",             "Elevated",  None),
    ("Grace",   "Lee",       "HR",           "HR Business Partner",         "Standard",  "Henry Zhao"),
    ("Henry",   "Zhao",      "HR",           "HR Manager",                  "Elevated",  None),
    ("Isabel",  "Nguyen",    "Legal",        "Legal Counsel",               "Elevated",  "Jack Rivera"),
    ("Jack",    "Rivera",    "Legal",        "General Counsel",             "Admin",     None),
    ("Karen",   "Smith",     "Operations",   "Operations Analyst",          "Standard",  "Liam Foster"),
    ("Liam",    "Foster",    "Operations",   "Operations Manager",          "Elevated",  None),
    ("Maya",    "Johnson",   "Sales",        "Account Executive",           "Standard",  "Nathan Brooks"),
    ("Nathan",  "Brooks",    "Sales",        "Sales Manager",               "Elevated",  None),
    ("Oliver",  "Davis",     "Engineering",  "Security Engineer",           "Elevated",  "David Kim"),
    ("Paula",   "Martinez",  "Finance",      "Senior Financial Analyst",    "Elevated",  "Frank Torres"),
    ("Quinn",   "Anderson",  "Operations",   "IT Operations Specialist",    "Elevated",  "Liam Foster"),
    ("Rachel",  "Thompson",  "HR",           "Talent Acquisition Specialist","Standard", "Henry Zhao"),
]

DEVICE_SEED = [
    # (name_template, device_type, os)
    ("WS-{code}",     "Workstation", "Windows 11"),
    ("LT-{code}",     "Laptop",      "Windows 11"),
    ("MB-{code}",     "Laptop",      "macOS Ventura"),
]

OS_BY_DEPT = {
    "Engineering":  ["Windows 11", "macOS Ventura", "Ubuntu 22.04"],
    "Finance":      ["Windows 11", "Windows 11"],
    "HR":           ["Windows 11", "macOS Ventura"],
    "Legal":        ["Windows 11", "Windows 11"],
    "Operations":   ["Windows 11", "Ubuntu 22.04"],
    "Sales":        ["macOS Ventura", "Windows 11"],
}


def _serial() -> str:
    return "SN-" + "".join(RNG.choices("ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", k=8))


def create_employees(db: Session) -> list[Employee]:
    print("→ Creating employees …")
    # Idempotency check
    if db.scalars(select(Employee).limit(1)).first():
        employees = list(db.scalars(select(Employee).order_by(Employee.employee_code)))
        print(f"  ⏭  Employees already exist ({len(employees)}) – skipped.")
        return employees

    employees: list[Employee] = []
    for idx, (first, last, dept, designation, access_level, manager) in enumerate(EMPLOYEE_SEED, 1):
        code = f"EMP-{idx:03d}"
        emp = Employee(
            employee_code=code,
            first_name=first,
            last_name=last,
            email=f"{first.lower()}.{last.lower()}@insideriq.dev",
            department=dept,
            designation=designation,
            manager=manager,
            access_level=access_level,
            access_privileges=_access_privileges(access_level),
        )
        db.add(emp)
        db.flush()  # get emp.id

        # 1–2 devices per employee
        os_options = OS_BY_DEPT.get(dept, ["Windows 11"])
        num_devices = RNG.randint(1, 2)
        for d_idx in range(num_devices):
            os = RNG.choice(os_options)
            dtype = "Laptop" if "macOS" in os else RNG.choice(["Workstation", "Laptop"])
            prefix = "MB" if "macOS" in os else ("LT" if dtype == "Laptop" else "WS")
            device = Device(
                employee_id=emp.id,
                name=f"{prefix}-{code}{'b' if d_idx else ''}",
                device_type=dtype,
                operating_system=os,
                serial_number=_serial(),
            )
            db.add(device)

        employees.append(emp)
        print(f"  ✓  {code} {first} {last} ({dept})")

    db.commit()
    for emp in employees:
        db.refresh(emp)
    return employees


def _access_privileges(level: str) -> str:
    base = ["VPN", "Email", "Slack"]
    if level in ("Elevated", "Admin"):
        base += ["SharePoint", "JIRA", "Confluence"]
    if level == "Admin":
        base += ["AWS Console", "GitHub Admin", "Database Admin"]
    return ", ".join(base)


# ---------------------------------------------------------------------------
# Step 4 – Activity logs (past 30 days)
# ---------------------------------------------------------------------------

APPS_BY_DEPT = {
    "Engineering":  ["VS Code", "GitHub", "AWS Console", "Terraform", "Docker Desktop", "Slack"],
    "Finance":      ["Excel", "SAP", "QuickBooks", "Outlook", "Power BI"],
    "HR":           ["Workday", "BambooHR", "Outlook", "Slack", "Zoom"],
    "Legal":        ["DocuSign", "LexisNexis", "Outlook", "Sharepoint"],
    "Operations":   ["ServiceNow", "Jira", "Slack", "Grafana", "Splunk"],
    "Sales":        ["Salesforce", "HubSpot", "Outlook", "Zoom", "Slack"],
}

FILE_SOURCES = [
    "SharePoint", "OneDrive", "S3 Bucket", "NAS Drive", "Local Disk",
    "GitHub Repo", "Confluence", "SFTP Server",
]


def _device_name_for(employee: Employee) -> str:
    if employee.devices:
        return RNG.choice(employee.devices).name
    return f"WS-{employee.employee_code}"


def _gen_login(employee: Employee, ts: datetime) -> ActivityLog:
    return ActivityLog(
        employee_id=employee.id,
        timestamp=ts,
        activity_type=ActivityType.LOGIN,
        source="AD Domain Controller",
        device=_device_name_for(employee),
        ip_address=_rand_ip(),
        application="Windows Login",
        data_volume_mb=0.0,
        details=f"Successful logon for {employee.email}",
    )


def _gen_file_download(employee: Employee, ts: datetime) -> ActivityLog:
    size_mb = round(RNG.uniform(0.1, 50.0), 2)
    return ActivityLog(
        employee_id=employee.id,
        timestamp=ts,
        activity_type=ActivityType.FILE_DOWNLOAD,
        source=RNG.choice(FILE_SOURCES),
        device=_device_name_for(employee),
        ip_address=_rand_ip(),
        application=RNG.choice(APPS_BY_DEPT.get(employee.department, ["Chrome"])),
        data_volume_mb=size_mb,
        details=f"Downloaded {RNG.choice(['report', 'spreadsheet', 'document', 'archive', 'config'])}_{RNG.randint(1,999)}.{RNG.choice(['xlsx','pdf','docx','csv','zip'])}",
    )


def _gen_file_upload(employee: Employee, ts: datetime) -> ActivityLog:
    size_mb = round(RNG.uniform(0.05, 20.0), 2)
    return ActivityLog(
        employee_id=employee.id,
        timestamp=ts,
        activity_type=ActivityType.FILE_UPLOAD,
        source=RNG.choice(FILE_SOURCES),
        device=_device_name_for(employee),
        ip_address=_rand_ip(),
        application=RNG.choice(APPS_BY_DEPT.get(employee.department, ["Chrome"])),
        data_volume_mb=size_mb,
        details=f"Uploaded {RNG.choice(['backup', 'submission', 'report', 'dataset'])}_{RNG.randint(1,999)}.{RNG.choice(['zip','xlsx','pdf','tar.gz'])}",
    )


def _gen_email(employee: Employee, ts: datetime) -> ActivityLog:
    return ActivityLog(
        employee_id=employee.id,
        timestamp=ts,
        activity_type=ActivityType.EMAIL,
        source="Exchange Server",
        device=_device_name_for(employee),
        ip_address=_rand_ip(),
        application="Outlook",
        data_volume_mb=round(RNG.uniform(0.01, 2.0), 3),
        details=f"{'Sent' if RNG.random() > 0.4 else 'Received'} email {'with attachment' if RNG.random() > 0.6 else ''}",
    )


def _gen_remote_access(employee: Employee, ts: datetime) -> ActivityLog:
    return ActivityLog(
        employee_id=employee.id,
        timestamp=ts,
        activity_type=ActivityType.REMOTE_ACCESS,
        source="VPN Gateway",
        device=_device_name_for(employee),
        ip_address=_rand_ip(),
        application="Cisco AnyConnect",
        data_volume_mb=round(RNG.uniform(0.5, 5.0), 2),
        details=f"VPN session established from {_rand_ip()}",
    )


def _gen_device_usage(employee: Employee, ts: datetime) -> ActivityLog:
    return ActivityLog(
        employee_id=employee.id,
        timestamp=ts,
        activity_type=ActivityType.DEVICE_USAGE,
        source="USB Controller",
        device=_device_name_for(employee),
        ip_address=_rand_ip(),
        application=None,
        data_volume_mb=round(RNG.uniform(0.0, 8192.0), 1),
        details=f"USB {RNG.choice(['removable storage', 'external drive', 'thumb drive'])} connected",
    )


def _gen_data_transfer(employee: Employee, ts: datetime) -> ActivityLog:
    size_mb = round(RNG.uniform(10.0, 500.0), 2)
    return ActivityLog(
        employee_id=employee.id,
        timestamp=ts,
        activity_type=ActivityType.DATA_TRANSFER,
        source=RNG.choice(FILE_SOURCES),
        device=_device_name_for(employee),
        ip_address=_rand_ip(),
        application=RNG.choice(APPS_BY_DEPT.get(employee.department, ["FileZilla"])),
        data_volume_mb=size_mb,
        details=f"Bulk data transfer of {size_mb} MB",
    )


# Activity distribution weights per hour (0–23)
_HOUR_WEIGHTS = [
    0.1, 0.05, 0.02, 0.02, 0.02, 0.05,  # 00–05
    0.2,  0.6,  1.0,  1.5,  2.0,  2.0,  # 06–11
    1.8,  1.9,  2.0,  1.8,  1.6,  1.2,  # 12–17
    0.8,  0.5,  0.4,  0.3,  0.2,  0.1,  # 18–23
]
_HOURS = list(range(24))


def _working_timestamp(base_date: datetime) -> datetime:
    """Produce a weighted-random datetime within the given day."""
    hour = RNG.choices(_HOURS, weights=_HOUR_WEIGHTS, k=1)[0]
    minute = RNG.randint(0, 59)
    second = RNG.randint(0, 59)
    return base_date.replace(hour=hour, minute=minute, second=second, tzinfo=timezone.utc)


def create_activity_logs(db: Session, employees: list[Employee], days: int = 30) -> None:
    print(f"→ Generating activity logs for {len(employees)} employees over {days} days …")

    # Idempotency: skip if activity already exists
    if db.scalars(select(ActivityLog).limit(1)).first():
        count = db.execute(text("SELECT COUNT(*) FROM activity_logs")).scalar()
        print(f"  ⏭  Activity logs already exist ({count} rows) – skipped.")
        return

    today = _now().replace(hour=0, minute=0, second=0, microsecond=0)
    logs: list[ActivityLog] = []

    for employee in employees:
        # Flag a few employees for anomalous activity later
        is_risky = employee.employee_code in ("EMP-001", "EMP-005", "EMP-010")
        is_moderate = employee.employee_code in ("EMP-007", "EMP-014")

        for day_offset in range(days):
            base_date = today - timedelta(days=day_offset)
            weekday = base_date.weekday()  # 0=Mon … 6=Sun

            # Skip weekends for most employees (50 % chance)
            if weekday >= 5 and RNG.random() > 0.3:
                continue

            # Login events (1–3 per day)
            login_count = RNG.randint(1, 3)
            if is_risky and weekday >= 5:
                login_count = RNG.randint(3, 6)  # weekend logins
            for _ in range(login_count):
                ts = _working_timestamp(base_date)
                if is_risky and RNG.random() > 0.5:
                    ts = base_date.replace(
                        hour=RNG.choice([0, 1, 2, 22, 23]),
                        minute=RNG.randint(0, 59),
                        second=0,
                        tzinfo=timezone.utc,
                    )
                logs.append(_gen_login(employee, ts))

            # File downloads
            download_count = RNG.randint(0, 4)
            if is_risky:
                download_count = RNG.randint(10, 20)  # excessive
            for _ in range(download_count):
                logs.append(_gen_file_download(employee, _working_timestamp(base_date)))

            # File uploads
            upload_count = RNG.randint(0, 2)
            if is_risky:
                upload_count = RNG.randint(5, 10)
            for _ in range(upload_count):
                logs.append(_gen_file_upload(employee, _working_timestamp(base_date)))

            # Emails
            email_count = RNG.randint(2, 15)
            if is_moderate:
                email_count = RNG.randint(20, 40)
            for _ in range(email_count):
                logs.append(_gen_email(employee, _working_timestamp(base_date)))

            # Remote access (not everyone, not every day)
            if employee.access_level in ("Elevated", "Admin") and RNG.random() > 0.6:
                logs.append(_gen_remote_access(employee, _working_timestamp(base_date)))

            # Device / USB usage
            if RNG.random() > 0.85 or (is_risky and RNG.random() > 0.4):
                logs.append(_gen_device_usage(employee, _working_timestamp(base_date)))

            # Bulk data transfer (rare normally, frequent for risky)
            if is_risky and RNG.random() > 0.5:
                logs.append(_gen_data_transfer(employee, _working_timestamp(base_date)))
            elif RNG.random() > 0.95:
                logs.append(_gen_data_transfer(employee, _working_timestamp(base_date)))

    db.bulk_save_objects(logs)
    db.commit()
    print(f"  ✓  Inserted {len(logs)} activity log rows.")


# ---------------------------------------------------------------------------
# Step 5 – Behavior profiles
# ---------------------------------------------------------------------------

def create_behavior_profiles(db: Session, employees: list[Employee]) -> None:
    print("→ Building behavior profiles …")
    for employee in employees:
        existing = db.scalars(
            select(BehaviorProfile).where(BehaviorProfile.employee_id == employee.id)
        ).first()
        if existing:
            continue
        build_profile(db, employee.id)
        print(f"  ✓  Profile for {employee.employee_code} {employee.full_name}")
    print("  ✓  Behavior profiles complete.")


# ---------------------------------------------------------------------------
# Step 6 – Risk scores
# ---------------------------------------------------------------------------

def _heuristic_score(features: dict[str, float]) -> dict[str, Any]:
    """Fallback scorer when the ML service is unavailable."""
    score = (
        features["logon_count"] * 0.1
        + features["after_hours_logon_count"] * 0.5
        + features["usb_connect_count"] * 0.4
        + features["file_copy_count"] * 0.2
        + features["email_count"] * 0.05
    )
    score = min(score, 100.0)
    if score >= 75:
        band = RiskBand.CRITICAL
    elif score >= 50:
        band = RiskBand.HIGH
    elif score >= 25:
        band = RiskBand.MEDIUM
    else:
        band = RiskBand.LOW
    return {
        "decision_function_score": round(-score / 100, 4),
        "predict_label": 1 if score >= 50 else 0,
        "risk_score": round(score, 2),
        "risk_band": band.value,
    }


def create_risk_scores(db: Session, employees: list[Employee]) -> None:
    print("→ Computing risk scores …")

    # Idempotency
    if db.scalars(select(RiskScore).limit(1)).first():
        print("  ⏭  Risk scores already exist – skipped.")
        return

    from app.services.features import extract_features

    feature_rows = []
    for emp in employees:
        feature_rows.append(extract_features(db, emp.id, lookback_days=30))

    # Try ML service first, fall back to heuristic
    try:
        results = score_batch(feature_rows)
        print("  ℹ  Used ML service for scoring.")
    except (MLServiceError, Exception) as exc:
        print(f"  ⚠  ML service unavailable ({exc}); using heuristic scorer.")
        results = [_heuristic_score(f) for f in feature_rows]

    computed_at = utcnow()
    for employee, features, result in zip(employees, feature_rows, results):
        score = RiskScore(
            employee_id=employee.id,
            computed_at=computed_at,
            lookback_days=30,
            logon_count=features["logon_count"],
            after_hours_logon_count=features["after_hours_logon_count"],
            usb_connect_count=features["usb_connect_count"],
            file_copy_count=features["file_copy_count"],
            email_count=features["email_count"],
            decision_function_score=float(result["decision_function_score"]),
            predict_label=int(result["predict_label"]),
            risk_score=float(result["risk_score"]),
            risk_band=RiskBand(result["risk_band"]),
        )
        db.add(score)

    db.commit()
    print(f"  ✓  Risk scores computed for {len(employees)} employees.")


# ---------------------------------------------------------------------------
# Step 7 – Anomalies and alerts
# ---------------------------------------------------------------------------

def create_anomalies_and_alerts(db: Session, employees: list[Employee]) -> None:
    print("→ Scanning for anomalies and raising alerts …")
    if db.scalars(select(Anomaly).limit(1)).first():
        print("  ⏭  Anomalies already exist – skipped.")
        return

    total_anomalies = 0
    total_alerts = 0
    for emp in employees:
        result = anomaly_service.scan_employee(db, emp.id, lookback_days=30)
        total_anomalies += result["anomalies_created"]
        total_alerts += result["alerts_created"]

    print(f"  ✓  Created {total_anomalies} anomalies and {total_alerts} alerts.")


# ---------------------------------------------------------------------------
# Step 8 – Investigations
# ---------------------------------------------------------------------------

_INV_TEMPLATES = [
    {
        "title": "Suspected Data Exfiltration – Engineering",
        "description": (
            "An unusually high volume of file downloads from the S3 repository was detected "
            "for an Engineering employee. Initiating investigation to determine whether "
            "sensitive source code was exfiltrated."
        ),
        "severity": Severity.HIGH,
        "status": InvestigationStatus.IN_PROGRESS,
        "dept_filter": "Engineering",
    },
    {
        "title": "After-Hours System Access – Finance",
        "description": (
            "Multiple logins recorded between 01:00–03:00 for a Finance employee over "
            "several consecutive nights. Potential credential compromise or insider threat."
        ),
        "severity": Severity.CRITICAL,
        "status": InvestigationStatus.ESCALATED,
        "dept_filter": "Finance",
    },
    {
        "title": "Unauthorized USB Activity – HR",
        "description": (
            "HR system flagged unusual USB device connections on a workstation "
            "handling employee PII. Investigation opened to assess potential data leakage."
        ),
        "severity": Severity.MEDIUM,
        "status": InvestigationStatus.OPEN,
        "dept_filter": "HR",
    },
]


def create_investigations(
    db: Session,
    employees: list[Employee],
    users: list[User],
) -> None:
    print("→ Creating sample investigations …")
    if db.scalars(select(Investigation).limit(1)).first():
        print("  ⏭  Investigations already exist – skipped.")
        return

    admin_user = next((u for u in users if u.role == Role.ADMINISTRATOR), users[0])
    analyst_user = next((u for u in users if u.role == Role.SECURITY_ANALYST), users[-1])
    soc_user = next((u for u in users if u.role == Role.SOC_ENGINEER), users[2])

    now = utcnow()
    for idx, template in enumerate(_INV_TEMPLATES, 1):
        # Pick an employee from the relevant department
        dept_emps = [e for e in employees if e.department == template["dept_filter"]]
        target_emp = dept_emps[0] if dept_emps else employees[0]

        # Find an alert for this employee if any
        alert = db.scalars(
            select(Alert).where(Alert.employee_id == target_emp.id).limit(1)
        ).first()
        anomaly = db.scalars(
            select(Anomaly).where(Anomaly.employee_id == target_emp.id).limit(1)
        ).first()

        ref = f"INV-{idx:04d}"
        inv = Investigation(
            reference=ref,
            title=template["title"],
            description=template["description"],
            status=template["status"],
            severity=template["severity"],
            employee_id=target_emp.id,
            anomaly_id=anomaly.id if anomaly else None,
            alert_id=alert.id if alert else None,
            created_by_id=admin_user.id,
            assigned_to_id=soc_user.id,
        )
        db.add(inv)
        db.flush()

        # Timeline events
        events = [
            InvestigationEvent(
                investigation_id=inv.id,
                occurred_at=now - timedelta(days=3),
                event_type="created",
                message=f"Investigation {ref} opened by {admin_user.full_name}.",
                actor_id=admin_user.id,
                actor_name=admin_user.full_name,
            ),
            InvestigationEvent(
                investigation_id=inv.id,
                occurred_at=now - timedelta(days=2),
                event_type="assigned",
                message=f"Assigned to {soc_user.full_name} for initial triage.",
                actor_id=admin_user.id,
                actor_name=admin_user.full_name,
            ),
        ]
        if template["status"] in (InvestigationStatus.IN_PROGRESS, InvestigationStatus.ESCALATED):
            events.append(
                InvestigationEvent(
                    investigation_id=inv.id,
                    occurred_at=now - timedelta(days=1),
                    event_type="note",
                    message="Initial evidence collection complete. Reviewing access logs.",
                    actor_id=soc_user.id,
                    actor_name=soc_user.full_name,
                )
            )
        if template["status"] == InvestigationStatus.ESCALATED:
            events.append(
                InvestigationEvent(
                    investigation_id=inv.id,
                    occurred_at=now - timedelta(hours=12),
                    event_type="escalated",
                    message=f"Escalated to {analyst_user.full_name} due to critical severity.",
                    actor_id=soc_user.id,
                    actor_name=soc_user.full_name,
                )
            )
            inv.assigned_to_id = analyst_user.id

        for event in events:
            db.add(event)

        # Notification for the investigation
        notification_service.create_notification(
            db,
            notification_type="investigation",
            severity=template["severity"],
            title=f"Investigation {ref}: {template['title']}",
            message=template["description"][:200],
            employee_id=target_emp.id,
            investigation_id=inv.id,
            commit=False,
        )

        print(f"  ✓  {ref}: {template['title'][:50]}")

    db.commit()


# ---------------------------------------------------------------------------
# Step 9 – Extra notifications
# ---------------------------------------------------------------------------

def create_notifications(db: Session, employees: list[Employee]) -> None:
    print("→ Creating system notifications …")
    if db.scalars(select(Notification).limit(1)).first():
        print("  ⏭  Notifications already exist – skipped.")
        return

    now = utcnow()
    system_notifications = [
        {
            "notification_type": "system",
            "severity": Severity.INFORMATIONAL,
            "title": "InsiderIQ initialized",
            "message": "The InsiderIQ platform has been initialized with seed data. All services are operational.",
            "occurred_at": now,
        },
        {
            "notification_type": "risk",
            "severity": Severity.HIGH,
            "title": "Fleet risk scan completed",
            "message": f"Risk scores computed for {len(employees)} employees. "
                       "2 employees flagged as HIGH risk, 1 as CRITICAL.",
            "occurred_at": now - timedelta(minutes=5),
        },
        {
            "notification_type": "anomaly",
            "severity": Severity.MEDIUM,
            "title": "Anomaly scan completed",
            "message": "Scheduled anomaly scan finished. Review new anomalies in the Anomalies dashboard.",
            "occurred_at": now - timedelta(hours=1),
        },
        {
            "notification_type": "system",
            "severity": Severity.LOW,
            "title": "Database backup completed",
            "message": "Scheduled database backup completed successfully at " + now.strftime("%Y-%m-%d %H:%M UTC"),
            "occurred_at": now - timedelta(hours=6),
        },
    ]

    for notif_data in system_notifications:
        occurred_at = notif_data.pop("occurred_at")
        notif = Notification(occurred_at=occurred_at, **notif_data)  # type: ignore[arg-type]
        db.add(notif)

    db.commit()
    print(f"  ✓  Created {len(system_notifications)} system notifications.")


# ---------------------------------------------------------------------------
# Orchestrator
# ---------------------------------------------------------------------------

def main() -> None:
    print("\n" + "=" * 60)
    print("  InsiderIQ – Database Initializer")
    print("=" * 60 + "\n")

    # 1. Tables
    create_tables()

    with SessionLocal() as db:
        # 2. Role accounts
        users = create_role_accounts(db)

        # 3. Employees + devices
        employees = create_employees(db)

        # 4. Activity logs (must precede behavior profiles)
        create_activity_logs(db, employees, days=30)

        # 5. Behavior profiles (derived from activity logs)
        create_behavior_profiles(db, employees)

        # 6. Risk scores
        create_risk_scores(db, employees)

        # 7. Anomalies and alerts
        create_anomalies_and_alerts(db, employees)

        # 8. Investigations
        create_investigations(db, employees, users)

        # 9. Notifications
        create_notifications(db, employees)

    print("\n" + "=" * 60)
    print("  ✅  Initialization complete!")
    print("=" * 60)
    print(f"\n  Default password: {settings.initial_account_password}")
    print("  API docs: http://localhost:8000/docs\n")


if __name__ == "__main__":
    main()
