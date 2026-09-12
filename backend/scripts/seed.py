"""Seed the platform with a realistic demo dataset.

Generates departments, employees, assets and 60 days of CERT-style activity
telemetry, then plants four classic insider-threat scenarios:

  * data exfiltration before resignation (notice period, mass download + USB)
  * privilege abuse by an administrator
  * credential probing / unauthorised access attempts
  * after-hours mass file transfer to an external destination

Usage:  python -m scripts.seed [--employees 40] [--days 60] [--reset]
"""
from __future__ import annotations

import argparse
import random
import sys
from datetime import date, datetime, time, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import delete, select  # noqa: E402

from app.core.security import hash_password  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.session import SessionLocal, engine  # noqa: E402
from app.models.activity import ActivityEvent  # noqa: E402
from app.models.alert import Alert  # noqa: E402
from app.models.anomaly import Anomaly  # noqa: E402
from app.models.behavior import BehaviorBaseline, PeerGroupStat  # noqa: E402
from app.models.employee import Asset, Department, Employee  # noqa: E402
from app.models.enums import ActivityType, EmploymentStatus, LogSource, Role  # noqa: E402
from app.models.incident import Evidence, Incident, IncidentNote, TimelineEntry  # noqa: E402
from app.models.risk import RiskScore  # noqa: E402
from app.models.user import User  # noqa: E402
from app.ml import features as F  # noqa: E402

random.seed(1337)
MB = 1024 * 1024

DEPARTMENTS = [
    ("Engineering", "ENG", 1.0),
    ("Finance", "FIN", 1.3),
    ("Human Resources", "HR", 1.2),
    ("Sales", "SLS", 1.1),
    ("IT Operations", "ITO", 1.4),
    ("Legal", "LGL", 1.25),
    ("Research", "RND", 1.35),
]

DESIGNATIONS = {
    "Engineering": ["Software Engineer", "Senior Engineer", "Engineering Manager"],
    "Finance": ["Financial Analyst", "Accountant", "Finance Manager"],
    "Human Resources": ["HR Executive", "HR Business Partner", "HR Manager"],
    "Sales": ["Account Executive", "Sales Manager", "Solutions Consultant"],
    "IT Operations": ["System Administrator", "Network Engineer", "IT Manager"],
    "Legal": ["Legal Counsel", "Compliance Officer"],
    "Research": ["Research Scientist", "Data Scientist", "Research Lead"],
}

FIRST_NAMES = [
    "Aarav", "Meera", "Rohan", "Divya", "Kabir", "Ananya", "Vikram", "Neha", "Arjun", "Priya",
    "Sana", "Rahul", "Ishita", "Karthik", "Leela", "Nikhil", "Farah", "Dev", "Tara", "Omar",
    "Zoya", "Aditya", "Ritika", "Manish", "Sneha", "Yash", "Pooja", "Imran", "Kavya", "Suresh",
    "Reema", "Naveen", "Aisha", "Varun", "Nandini", "Gaurav", "Lakshmi", "Sameer", "Trisha", "Rakesh",
]
LAST_NAMES = [
    "Sharma", "Iyer", "Khan", "Patel", "Nair", "Verma", "Reddy", "Bose", "Gupta", "Menon",
    "Chopra", "Das", "Kulkarni", "Joshi", "Sinha", "Rao", "Mehta", "Bhat", "Pillai", "Ahuja",
]

APPLICATIONS = ["Outlook", "Chrome", "Slack", "SAP", "Salesforce", "VS Code", "Excel", "Jira", "Tableau", "Teams"]
RESOURCES = [
    "/finance/forecast_q3.xlsx", "/hr/payroll_master.csv", "/legal/contracts/msa_2026.pdf",
    "/engineering/source/core-service", "/research/models/pricing_v4.pkl", "/sales/pipeline_export.csv",
    "/shared/policies/security_policy.pdf", "/finance/invoices/2026", "/research/patents/draft_17.docx",
    "/customers/accounts_master.db", "/it/credentials/vault_export.kdbx", "/engineering/design/architecture.pdf",
]
SENSITIVE = {"/hr/payroll_master.csv", "/finance/forecast_q3.xlsx", "/customers/accounts_master.db",
             "/it/credentials/vault_export.kdbx", "/research/models/pricing_v4.pkl", "/research/patents/draft_17.docx"}
EXTERNAL_DOMAINS = ["gmail.com", "protonmail.com", "outlook.com", "yandex.com", "competitor-corp.com"]
COUNTRIES = ["IN", "US", "GB", "SG", "DE"]
PLATFORM_USERS = [
    ("admin@itbis.io", "Platform Administrator", Role.ADMINISTRATOR, "Admin@12345"),
    ("analyst@itbis.io", "Sara Analyst", Role.SECURITY_ANALYST, "Analyst@12345"),
    ("soc@itbis.io", "Dev SOC Engineer", Role.SOC_ENGINEER, "SocEng@12345"),
    ("manager@itbis.io", "Ravi Manager", Role.SECURITY_MANAGER, "Manager@12345"),
]


def reset_database(db) -> None:
    """Wipe operational data so the seed is reproducible."""
    for model in (
        Evidence, TimelineEntry, IncidentNote, Incident, Alert, Anomaly,
        RiskScore, BehaviorBaseline, PeerGroupStat, ActivityEvent, Asset, Employee, Department,
    ):
        db.execute(delete(model))
    db.commit()


def ensure_users(db) -> None:
    """Create the demo accounts, and repair the role of any that has drifted.

    Each demo account exists to demonstrate exactly one role, so if someone
    changes a role through the admin console, re-seeding puts it back.
    """
    for email, name, role, password in PLATFORM_USERS:
        existing = db.execute(select(User).where(User.email == email)).scalar_one_or_none()
        if existing:
            if existing.role != role.value:
                print(f"  restoring {email}: {existing.role} -> {role.value}")
                existing.role = role.value
            continue
        db.add(
            User(
                email=email,
                full_name=name,
                hashed_password=hash_password(password),
                role=role.value,
                is_verified=True,
            )
        )
    db.commit()


def make_employees(db, count: int) -> list[Employee]:
    departments = []
    for name, code, weight in DEPARTMENTS:
        dept = db.execute(select(Department).where(Department.name == name)).scalar_one_or_none()
        if dept is None:
            dept = Department(name=name, code=code, risk_weight=weight, description=f"{name} department")
            db.add(dept)
        departments.append(dept)
    db.flush()

    employees: list[Employee] = []
    used_names: set[str] = set()
    for index in range(count):
        dept = departments[index % len(departments)]
        while True:
            full_name = f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}"
            if full_name not in used_names:
                used_names.add(full_name)
                break
        designation = random.choice(DESIGNATIONS[dept.name])
        privileged = designation in {"System Administrator", "IT Manager", "Finance Manager", "HR Manager"}
        employee = Employee(
            employee_code=f"EMP{1001 + index}",
            full_name=full_name,
            email=f"{full_name.split()[0].lower()}.{full_name.split()[1].lower()}@company.com",
            department_id=dept.id,
            designation=designation,
            location=random.choice(["Bengaluru", "Mumbai", "Pune", "Remote", "Hyderabad"]),
            employment_status=EmploymentStatus.ACTIVE.value,
            joined_on=date.today() - timedelta(days=random.randint(120, 2200)),
            access_level="privileged" if privileged else random.choice(["standard", "standard", "elevated"]),
            privileges="vpn,file_share" + (",admin_console,vault" if privileged else ""),
            is_privileged=privileged,
        )
        db.add(employee)
        employees.append(employee)
    db.flush()

    # Managers within each department.
    by_dept: dict[int, list[Employee]] = {}
    for employee in employees:
        by_dept.setdefault(employee.department_id, []).append(employee)
    for members in by_dept.values():
        lead = members[0]
        for member in members[1:]:
            member.manager_id = lead.id

    for employee in employees:
        db.add(
            Asset(
                employee_id=employee.id,
                asset_tag=f"LAP-{employee.employee_code[-4:]}",
                device_type="laptop",
                hostname=f"WS-{employee.employee_code[-4:]}",
                os=random.choice(["Windows 11", "Windows 10", "macOS 15", "Ubuntu 24.04"]),
                ip_address=f"10.20.{random.randint(1, 40)}.{random.randint(2, 250)}",
                mac_address=":".join(f"{random.randint(0, 255):02x}" for _ in range(6)),
                assigned_on=employee.joined_on,
            )
        )
    db.commit()
    return employees


def event(employee: Employee, activity: ActivityType, when: datetime, **kwargs) -> ActivityEvent:
    source = kwargs.pop("log_source", LogSource.ENDPOINT_SECURITY)
    row = ActivityEvent(
        employee_id=employee.id,
        activity_type=activity.value,
        log_source=source.value if isinstance(source, LogSource) else str(source),
        event_time=when.astimezone(timezone.utc),
        device_id=kwargs.pop("device_id", f"LAP-{employee.employee_code[-4:]}"),
        ip_address=kwargs.pop("ip_address", f"10.20.{employee.id % 40 + 1}.{employee.id % 200 + 2}"),
        hostname=kwargs.pop("hostname", f"WS-{employee.employee_code[-4:]}"),
        **kwargs,
    )
    F.enrich_event_flags(row)
    return row


def workday_events(employee: Employee, day: date, profile: dict) -> list[ActivityEvent]:
    """A normal working day for one employee, jittered around their own habits."""
    rows: list[ActivityEvent] = []
    weekend = day.weekday() >= 5
    if weekend and random.random() > profile["weekend_prob"]:
        return rows

    start_hour = int(random.gauss(profile["start_hour"], 0.8))
    start_hour = max(5, min(start_hour, 21))
    login_at = datetime.combine(day, time(hour=start_hour, minute=random.randint(0, 59)), tzinfo=timezone.utc)
    rows.append(event(employee, ActivityType.LOGIN, login_at, log_source=LogSource.ACTIVE_DIRECTORY))

    if random.random() < 0.12:
        rows.append(
            event(employee, ActivityType.FAILED_LOGIN, login_at - timedelta(minutes=random.randint(1, 6)),
                  log_source=LogSource.ACTIVE_DIRECTORY, success=False)
        )
    if random.random() < profile["vpn_prob"]:
        rows.append(
            event(employee, ActivityType.VPN_SESSION, login_at + timedelta(minutes=random.randint(1, 30)),
                  log_source=LogSource.VPN, duration_seconds=random.randint(1800, 25000),
                  country=random.choice(COUNTRIES))
        )

    session_length = random.randint(6, 10)
    for _ in range(int(random.gauss(profile["daily_events"], profile["daily_events"] * 0.25))):
        offset = timedelta(minutes=random.randint(0, session_length * 60))
        when = login_at + offset
        roll = random.random()
        if roll < 0.34:
            resource = random.choice(RESOURCES)
            rows.append(
                event(employee, ActivityType.FILE_ACCESS, when, log_source=LogSource.WINDOWS_EVENT,
                      resource=resource, application=random.choice(APPLICATIONS),
                      sensitivity="confidential" if resource in SENSITIVE else "internal",
                      file_count=1)
            )
        elif roll < 0.56:
            resource = random.choice(RESOURCES)
            rows.append(
                event(employee, ActivityType.FILE_DOWNLOAD, when, log_source=LogSource.PROXY,
                      resource=resource, application="Chrome",
                      bytes_transferred=abs(random.gauss(profile["download_mb"], 4)) * MB,
                      sensitivity="confidential" if resource in SENSITIVE else "internal",
                      file_count=random.randint(1, 3))
            )
        elif roll < 0.70:
            rows.append(
                event(employee, ActivityType.EMAIL_SENT, when, log_source=LogSource.EMAIL_SECURITY,
                      destination=f"colleague{random.randint(1, 40)}@company.com",
                      bytes_transferred=random.randint(2000, 900000), file_count=random.randint(0, 2))
            )
        elif roll < 0.76 and random.random() < profile["external_email_prob"]:
            rows.append(
                event(employee, ActivityType.EMAIL_EXTERNAL, when, log_source=LogSource.EMAIL_SECURITY,
                      destination=f"partner{random.randint(1, 9)}@{random.choice(EXTERNAL_DOMAINS)}",
                      bytes_transferred=random.randint(10000, 3_000_000), is_external=True, file_count=1)
            )
        elif roll < 0.88:
            rows.append(
                event(employee, ActivityType.APP_USAGE, when, resource=None,
                      application=random.choice(APPLICATIONS), duration_seconds=random.randint(120, 5400))
            )
        elif roll < 0.94:
            rows.append(
                event(employee, ActivityType.FILE_UPLOAD, when, log_source=LogSource.DLP,
                      resource=random.choice(RESOURCES), application="Chrome",
                      bytes_transferred=abs(random.gauss(profile["download_mb"] * 0.4, 3)) * MB,
                      file_count=1)
            )
        else:
            rows.append(
                event(employee, ActivityType.NETWORK_CONNECTION, when, log_source=LogSource.FIREWALL,
                      destination=f"192.168.{random.randint(1, 250)}.{random.randint(1, 250)}",
                      bytes_transferred=random.randint(1000, 250000))
            )

    if employee.is_privileged and random.random() < 0.08:
        rows.append(
            event(employee, ActivityType.PRIVILEGE_CHANGE, login_at + timedelta(hours=random.randint(1, 6)),
                  log_source=LogSource.ACTIVE_DIRECTORY, resource="/it/admin_console",
                  sensitivity="restricted")
        )
    if random.random() < profile["usb_prob"]:
        rows.append(
            event(employee, ActivityType.USB_CONNECT, login_at + timedelta(hours=random.randint(1, 7)),
                  log_source=LogSource.ENDPOINT_SECURITY, is_removable_media=True)
        )

    rows.append(
        event(employee, ActivityType.LOGOUT, login_at + timedelta(hours=session_length),
              log_source=LogSource.ACTIVE_DIRECTORY)
    )
    return rows


def scenario_exfiltration_before_exit(employee: Employee, end: date) -> list[ActivityEvent]:
    """Departing employee mass-downloads sensitive files and copies them to USB."""
    employee.employment_status = EmploymentStatus.NOTICE_PERIOD.value
    employee.exit_on = end + timedelta(days=20)
    rows: list[ActivityEvent] = []
    for day_offset in (4, 3, 2):
        day = end - timedelta(days=day_offset)
        base = datetime.combine(day, time(hour=21, minute=12), tzinfo=timezone.utc)
        rows.append(event(employee, ActivityType.LOGIN, base, log_source=LogSource.ACTIVE_DIRECTORY))
        for index in range(random.randint(28, 42)):
            resource = random.choice(list(SENSITIVE))
            rows.append(
                event(employee, ActivityType.FILE_DOWNLOAD, base + timedelta(minutes=index * 3),
                      log_source=LogSource.PROXY, resource=resource, application="Chrome",
                      bytes_transferred=random.uniform(18, 55) * MB, sensitivity="restricted",
                      file_count=random.randint(2, 6))
            )
        rows.append(
            event(employee, ActivityType.USB_CONNECT, base + timedelta(hours=1),
                  log_source=LogSource.ENDPOINT_SECURITY, device_id="USB-UNKNOWN-77",
                  is_removable_media=True)
        )
        for index in range(random.randint(10, 18)):
            rows.append(
                event(employee, ActivityType.USB_FILE_COPY, base + timedelta(hours=1, minutes=index * 4),
                      log_source=LogSource.ENDPOINT_SECURITY, device_id="USB-UNKNOWN-77",
                      resource=random.choice(list(SENSITIVE)),
                      bytes_transferred=random.uniform(25, 90) * MB, sensitivity="restricted",
                      is_removable_media=True, file_count=random.randint(3, 12))
            )
        for index in range(random.randint(6, 12)):
            rows.append(
                event(employee, ActivityType.EMAIL_EXTERNAL, base + timedelta(hours=2, minutes=index * 7),
                      log_source=LogSource.EMAIL_SECURITY,
                      destination=f"{employee.full_name.split()[0].lower()}.personal@{random.choice(EXTERNAL_DOMAINS)}",
                      bytes_transferred=random.uniform(4, 22) * MB, is_external=True,
                      sensitivity="confidential", file_count=random.randint(1, 4))
            )
    return rows


def scenario_privilege_abuse(employee: Employee, end: date) -> list[ActivityEvent]:
    """Privileged administrator touching HR/finance data outside their remit."""
    employee.is_privileged = True
    employee.access_level = "privileged"
    rows: list[ActivityEvent] = []
    for day_offset in (6, 5, 1):
        day = end - timedelta(days=day_offset)
        base = datetime.combine(day, time(hour=2, minute=40), tzinfo=timezone.utc)
        rows.append(
            event(employee, ActivityType.REMOTE_ACCESS, base, log_source=LogSource.VPN,
                  country="RU", duration_seconds=7200, ip_address="203.0.113.44")
        )
        for index in range(random.randint(4, 8)):
            rows.append(
                event(employee, ActivityType.PRIVILEGE_CHANGE, base + timedelta(minutes=index * 9),
                      log_source=LogSource.ACTIVE_DIRECTORY, resource="/it/credentials/vault_export.kdbx",
                      sensitivity="restricted", application="Admin Console")
            )
        for index in range(random.randint(12, 20)):
            rows.append(
                event(employee, ActivityType.FILE_ACCESS, base + timedelta(minutes=index * 5),
                      log_source=LogSource.WINDOWS_EVENT, resource=random.choice(list(SENSITIVE)),
                      sensitivity="restricted", file_count=1)
            )
    return rows


def scenario_credential_probing(employee: Employee, end: date) -> list[ActivityEvent]:
    """Repeated failed logins and denied resource access - credential misuse."""
    rows: list[ActivityEvent] = []
    for day_offset in (7, 3):
        day = end - timedelta(days=day_offset)
        base = datetime.combine(day, time(hour=23, minute=5), tzinfo=timezone.utc)
        for index in range(random.randint(9, 16)):
            rows.append(
                event(employee, ActivityType.FAILED_LOGIN, base + timedelta(minutes=index * 2),
                      log_source=LogSource.ACTIVE_DIRECTORY, success=False,
                      ip_address="198.51.100.23", device_id="LAP-UNKNOWN-12")
            )
        for index in range(random.randint(5, 9)):
            rows.append(
                event(employee, ActivityType.UNAUTHORIZED_ACCESS, base + timedelta(minutes=30 + index * 4),
                      log_source=LogSource.WINDOWS_EVENT, resource=random.choice(list(SENSITIVE)),
                      success=False, sensitivity="restricted", device_id="LAP-UNKNOWN-12")
            )
    return rows


def scenario_after_hours_transfer(employee: Employee, end: date) -> list[ActivityEvent]:
    """Weekend bulk transfer of customer data to an external host."""
    rows: list[ActivityEvent] = []
    day = end - timedelta(days=2)
    while day.weekday() < 5:
        day -= timedelta(days=1)
    base = datetime.combine(day, time(hour=3, minute=20), tzinfo=timezone.utc)
    rows.append(event(employee, ActivityType.REMOTE_ACCESS, base, log_source=LogSource.VPN, country="SG"))
    for index in range(random.randint(45, 70)):
        rows.append(
            event(employee, ActivityType.DATA_TRANSFER, base + timedelta(minutes=index * 2),
                  log_source=LogSource.FIREWALL, resource="/customers/accounts_master.db",
                  destination="files.competitor-corp.com", bytes_transferred=random.uniform(30, 120) * MB,
                  is_external=True, sensitivity="restricted", file_count=random.randint(1, 5))
        )
    return rows


def generate_activity(db, employees: list[Employee], days: int) -> int:
    """Generate baseline behaviour for everyone, then plant the threat scenarios."""
    end = datetime.now(timezone.utc).date()
    start = end - timedelta(days=days)
    rows: list[ActivityEvent] = []

    profiles = {}
    for employee in employees:
        profiles[employee.id] = {
            "start_hour": random.choice([8, 9, 9, 10, 10, 11]),
            "daily_events": random.randint(14, 34),
            "download_mb": random.uniform(3, 14),
            "weekend_prob": random.uniform(0.02, 0.18),
            "vpn_prob": random.uniform(0.05, 0.4),
            "usb_prob": random.uniform(0.0, 0.06),
            "external_email_prob": random.uniform(0.1, 0.5),
        }

    for employee in employees:
        day = start
        while day <= end:
            rows.extend(workday_events(employee, day, profiles[employee.id]))
            day += timedelta(days=1)

    # Plant four insider-threat scenarios on distinct employees.
    threat_actors = random.sample(employees, 4)
    scenarios = [
        scenario_exfiltration_before_exit,
        scenario_privilege_abuse,
        scenario_credential_probing,
        scenario_after_hours_transfer,
    ]
    planted = []
    for actor, scenario in zip(threat_actors, scenarios):
        rows.extend(scenario(actor, end))
        actor.on_watchlist = scenario is scenario_exfiltration_before_exit
        planted.append((actor.employee_code, actor.full_name, scenario.__name__))

    db.add_all(rows)
    db.commit()

    print("\nPlanted insider-threat scenarios:")
    for code, name, scenario_name in planted:
        print(f"  - {code:<8} {name:<22} {scenario_name}")
    return len(rows)


def seed_investigations(db) -> int:
    """Open investigations on the top-risk employees so the workflow modules,
    dashboards and reports all have realistic data to display."""
    from app.models.enums import IncidentStatus, Severity
    from app.services import investigations as service

    analyst = db.execute(select(User).where(User.email == "analyst@itbis.io")).scalar_one()
    manager = db.execute(select(User).where(User.email == "manager@itbis.io")).scalar_one()

    top = db.execute(
        select(Employee).order_by(Employee.current_risk_score.desc()).limit(3)
    ).scalars().all()

    created = 0
    for index, employee in enumerate(top):
        alerts = db.execute(
            select(Alert).where(Alert.employee_id == employee.id).order_by(Alert.priority).limit(6)
        ).scalars().all()
        anomalies = db.execute(
            select(Anomaly)
            .where(Anomaly.employee_id == employee.id)
            .order_by(Anomaly.score.desc())
            .limit(8)
        ).scalars().all()
        if not anomalies:
            continue

        severity = Severity.CRITICAL.value if index == 0 else Severity.HIGH.value
        incident = service.create_incident(
            db,
            employee=employee,
            title=f"Suspected insider activity - {employee.full_name}",
            summary=(
                f"Behavioural analytics flagged {len(anomalies)} anomalies for {employee.full_name} "
                f"({employee.employee_code}). Current insider risk score is "
                f"{employee.current_risk_score:.1f} ({employee.current_risk_category})."
            ),
            category=anomalies[0].category,
            severity=severity,
            created_by=analyst,
            assigned_to_id=analyst.id,
            alert_ids=[a.id for a in alerts],
            anomaly_ids=[a.id for a in anomalies],
        )
        created += 1

        if index == 0:
            # A confirmed case that has been worked end to end.
            service.transition(db, incident, IncidentStatus.INVESTIGATING.value, analyst,
                               "Analyst began triage of the download and USB activity.")
            service.add_note(db, incident, "Confirmed bulk copy of restricted files to an "
                                           "unrecognised USB device over three consecutive nights.", analyst)
            service.escalate(db, incident, manager.id,
                             "Confirmed exfiltration pattern; escalating for HR and legal review.", analyst)
            service.transition(db, incident, IncidentStatus.CONTAINED.value, manager,
                               "Account access restricted and device recalled.")
            service.transition(db, incident, IncidentStatus.RESOLVED.value, manager,
                               "Data recovered; disciplinary process initiated.")
            incident.outcome = "confirmed_threat"
            incident.root_cause = "Departing employee copying restricted data to removable media"
            incident.resolution = "Access revoked, device recovered, HR and legal notified."
        elif index == 1:
            service.transition(db, incident, IncidentStatus.INVESTIGATING.value, analyst,
                               "Correlating privileged access events with change tickets.")
            service.add_note(db, incident, "Awaiting confirmation from IT Operations on the "
                                           "change request backing these privilege modifications.", analyst)
    db.commit()
    return created


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the insider threat platform with demo data")
    parser.add_argument("--employees", type=int, default=40)
    parser.add_argument("--days", type=int, default=60)
    parser.add_argument("--reset", action="store_true", help="wipe existing operational data first")
    parser.add_argument("--skip-analytics", action="store_true", help="only load raw data")
    args = parser.parse_args()

    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if args.reset:
            print("Resetting operational data ...")
            reset_database(db)

        ensure_users(db)
        print(f"Creating {args.employees} employees across {len(DEPARTMENTS)} departments ...")
        employees = make_employees(db, args.employees)

        print(f"Generating ~{args.days} days of activity telemetry ...")
        total = generate_activity(db, employees, args.days)
        print(f"  {total:,} activity events written")

        if args.skip_analytics:
            print("Skipping analytics as requested.")
            return

        from app.ml import anomaly as anomaly_engine
        from app.ml import baseline as baseline_engine
        from app.ml import risk as risk_engine
        from app.services import alerts as alert_service

        print("Building behavioural baselines and peer groups ...")
        result = baseline_engine.build_all_baselines(db, lookback_days=args.days)
        print(f"  {result['baselines_built']} baselines, {result['peer_groups_updated']} peer groups")

        print("Running anomaly detection ...")
        detection = anomaly_engine.run_detection(db, lookback_days=min(args.days, 45))
        anomalies = detection["anomalies"]
        print(f"  {len(anomalies)} anomalies detected")

        print("Computing insider risk scores ...")
        scores = risk_engine.recompute_all(db)
        db.commit()

        print("Generating alerts ...")
        created = alert_service.generate_alerts(db, anomalies)
        db.commit()
        print(f"  {len(created)} alerts raised")

        print("Opening investigations on the highest-risk employees ...")
        opened = seed_investigations(db)
        print(f"  {opened} incidents created")

        print("Recomputing risk with investigation history ...")
        risk_engine.recompute_all(db)
        db.commit()

        distribution = risk_engine.risk_distribution(db)
        top = db.execute(
            select(Employee).order_by(Employee.current_risk_score.desc()).limit(5)
        ).scalars().all()

        print("\nRisk distribution:", distribution)
        print("\nTop risk employees:")
        for employee in top:
            print(
                f"  {employee.employee_code:<8} {employee.full_name:<22} "
                f"{employee.current_risk_score:6.2f}  {employee.current_risk_category}"
            )
        print("\nSeed complete. Sign in with:")
        for email, _, role, password in PLATFORM_USERS:
            print(f"  {email:<24} {password:<16} ({role.value})")


if __name__ == "__main__":
    main()
