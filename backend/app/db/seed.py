"""Demo data generator.

Produces a CERT-dataset-shaped corpus so the dashboard is meaningful on first
boot and Milestone 2's baselines have something realistic to learn from. The
seed is fixed, so every environment gets the same data.
"""

import random
from datetime import date, datetime, timedelta

from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.models.activity import ActivityEvent
from app.models.employee import AccessPrivilege, Department, Device, Employee
from app.models.enums import (
    DeviceType,
    EmployeeStatus,
    EventSource,
    EventType,
    PrivilegeLevel,
    UserRole,
)
from app.models.user import User
from app.services.ingestion import is_after_hours

RNG = random.Random(20260809)

DEMO_PASSWORD = "Insider@2026"

DEMO_USERS = [
    ("admin@insiderthreat.io", "Lakshmikanth M", UserRole.ADMIN),
    ("manager@insiderthreat.io", "Priya Raghavan", UserRole.SECURITY_MANAGER),
    ("soc@insiderthreat.io", "Arjun Menon", UserRole.SOC_ENGINEER),
    ("analyst@insiderthreat.io", "Neha Kulkarni", UserRole.SECURITY_ANALYST),
]

DEPARTMENTS = [
    ("Engineering", "ENG"),
    ("Finance", "FIN"),
    ("Human Resources", "HR"),
    ("Sales", "SLS"),
    ("IT Operations", "ITOPS"),
    ("Legal & Compliance", "LGL"),
]

DESIGNATIONS = {
    "ENG": ["Software Engineer", "Senior Engineer", "QA Engineer", "Engineering Manager"],
    "FIN": ["Financial Analyst", "Accountant", "Finance Manager"],
    "HR": ["HR Executive", "Recruiter", "HR Manager"],
    "SLS": ["Sales Executive", "Account Manager", "Regional Sales Head"],
    "ITOPS": ["System Administrator", "Network Engineer", "Infrastructure Lead"],
    "LGL": ["Legal Counsel", "Compliance Officer"],
}

FIRST_NAMES = [
    "Aarav", "Diya", "Rohan", "Ananya", "Karthik", "Meera", "Vikram", "Sneha",
    "Aditya", "Ishita", "Nikhil", "Pooja", "Rahul", "Divya", "Sanjay", "Kavya",
    "Manish", "Ritu", "Suresh", "Anjali", "Harsh", "Nandini", "Varun", "Shreya",
    "Gautam",
]
LAST_NAMES = [
    "Sharma", "Nair", "Iyer", "Reddy", "Patel", "Chowdhury", "Desai", "Bose",
    "Rao", "Malhotra", "Kulkarni", "Verma", "Joshi", "Pillai", "Bhatt",
]

PRIVILEGE_POOL = [
    ("VPN Access", PrivilegeLevel.READ),
    ("Source Code Repository", PrivilegeLevel.WRITE),
    ("Customer Database", PrivilegeLevel.READ),
    ("Payroll System", PrivilegeLevel.READ),
    ("Production Servers", PrivilegeLevel.ADMIN),
    ("Financial Records", PrivilegeLevel.WRITE),
    ("HR Records", PrivilegeLevel.READ),
    ("Cloud Console", PrivilegeLevel.ADMIN),
]

# Ordinary staff generate mostly authentication and routine file activity.
BASELINE_WEIGHTS = {
    EventType.LOGIN: 26,
    EventType.LOGOUT: 24,
    EventType.FILE_DOWNLOAD: 14,
    EventType.FILE_UPLOAD: 8,
    EventType.EMAIL_SENT: 12,
    EventType.DATA_TRANSFER: 5,
    EventType.REMOTE_ACCESS: 5,
    EventType.FAILED_LOGIN: 3,
    EventType.USB_CONNECT: 2,
    EventType.PRIVILEGE_CHANGE: 1,
}

# A small cohort skews toward exfiltration-adjacent behaviour so the dashboard
# has something worth looking at -- and so Milestone 2 has a positive class.
ELEVATED_WEIGHTS = {
    EventType.LOGIN: 18,
    EventType.LOGOUT: 16,
    EventType.FILE_DOWNLOAD: 22,
    EventType.FILE_UPLOAD: 12,
    EventType.EMAIL_SENT: 8,
    EventType.DATA_TRANSFER: 12,
    EventType.REMOTE_ACCESS: 8,
    EventType.FAILED_LOGIN: 6,
    EventType.USB_CONNECT: 10,
    EventType.PRIVILEGE_CHANGE: 2,
}

SOURCE_BY_TYPE = {
    EventType.LOGIN: EventSource.ACTIVE_DIRECTORY,
    EventType.LOGOUT: EventSource.ACTIVE_DIRECTORY,
    EventType.FAILED_LOGIN: EventSource.ACTIVE_DIRECTORY,
    EventType.FILE_DOWNLOAD: EventSource.ENDPOINT_AGENT,
    EventType.FILE_UPLOAD: EventSource.ENDPOINT_AGENT,
    EventType.DATA_TRANSFER: EventSource.FIREWALL,
    EventType.EMAIL_SENT: EventSource.EMAIL_GATEWAY,
    EventType.USB_CONNECT: EventSource.ENDPOINT_AGENT,
    EventType.PRIVILEGE_CHANGE: EventSource.WINDOWS_EVENT_LOG,
    EventType.REMOTE_ACCESS: EventSource.VPN,
}

FILE_NAMES = [
    "q3_financials.xlsx", "customer_export.csv", "architecture.pdf",
    "salary_bands.xlsx", "contract_draft.docx", "source_bundle.zip",
    "audit_log.txt", "roadmap_2026.pptx",
]

DAYS_OF_HISTORY = 30
EVENTS_PER_EMPLOYEE = 200


def _pick_hour(elevated: bool) -> int:
    """Business hours dominate; elevated-risk users have a fatter night tail."""
    after_hours_chance = 0.32 if elevated else 0.09
    if RNG.random() < after_hours_chance:
        return RNG.choice([0, 1, 2, 3, 4, 5, 6, 21, 22, 23])
    return RNG.randint(8, 18)


def _event_details(event_type: EventType) -> dict | None:
    if event_type in (EventType.FILE_DOWNLOAD, EventType.FILE_UPLOAD):
        return {"file_name": RNG.choice(FILE_NAMES), "path": "/shared/finance"}
    if event_type == EventType.USB_CONNECT:
        return {"vendor": RNG.choice(["SanDisk", "Kingston", "Samsung"]), "capacity_gb": RNG.choice([16, 32, 64, 256])}
    if event_type == EventType.EMAIL_SENT:
        return {"recipient_domain": RNG.choice(["partner.com", "gmail.com", "internal"]), "attachments": RNG.randint(0, 3)}
    if event_type == EventType.PRIVILEGE_CHANGE:
        return {"change": RNG.choice(["group_added", "role_elevated"])}
    if event_type == EventType.FAILED_LOGIN:
        return {"reason": RNG.choice(["bad_password", "expired_account", "mfa_timeout"])}
    return None


def _bytes_for(event_type: EventType, elevated: bool) -> int:
    if event_type not in (
        EventType.FILE_DOWNLOAD,
        EventType.FILE_UPLOAD,
        EventType.DATA_TRANSFER,
    ):
        return 0
    ceiling = 900_000_000 if elevated else 90_000_000
    return RNG.randint(50_000, ceiling)


def seed_database(db: Session) -> None:
    for email, full_name, role in DEMO_USERS:
        db.add(
            User(
                email=email,
                full_name=full_name,
                hashed_password=hash_password(DEMO_PASSWORD),
                role=role,
            )
        )

    departments = [Department(name=name, code=code) for name, code in DEPARTMENTS]
    db.add_all(departments)
    db.flush()

    employees: list[Employee] = []
    used_names: set[str] = set()
    today = date.today()

    for index in range(25):
        department = departments[index % len(departments)]
        while True:
            full_name = f"{RNG.choice(FIRST_NAMES)} {RNG.choice(LAST_NAMES)}"
            if full_name not in used_names:
                used_names.add(full_name)
                break

        slug = full_name.lower().replace(" ", ".")
        employee = Employee(
            employee_code=f"EMP{1000 + index}",
            full_name=full_name,
            email=f"{slug}@insiderthreat.io",
            designation=RNG.choice(DESIGNATIONS[department.code]),
            status=EmployeeStatus.ACTIVE if index % 11 else EmployeeStatus.ON_LEAVE,
            joined_at=today - timedelta(days=RNG.randint(120, 2200)),
            department_id=department.id,
        )
        employees.append(employee)

    db.add_all(employees)
    db.flush()

    # First employee of each department manages the rest of that department.
    managers = {}
    for employee in employees:
        managers.setdefault(employee.department_id, employee)
    for employee in employees:
        manager = managers[employee.department_id]
        if manager.id != employee.id:
            employee.manager_id = manager.id

    devices: list[Device] = []
    for employee in employees:
        for slot in range(RNG.randint(1, 2)):
            devices.append(
                Device(
                    employee_id=employee.id,
                    hostname=f"{employee.employee_code.lower()}-{'lt' if slot == 0 else 'wk'}",
                    device_type=DeviceType.LAPTOP if slot == 0 else RNG.choice(
                        [DeviceType.DESKTOP, DeviceType.MOBILE]
                    ),
                    os=RNG.choice(["Windows 11", "Windows 10", "Ubuntu 22.04", "macOS 14"]),
                    mac_address=":".join(f"{RNG.randint(0, 255):02X}" for _ in range(6)),
                    is_managed=RNG.random() > 0.12,
                )
            )
        for name, level in RNG.sample(PRIVILEGE_POOL, RNG.randint(1, 3)):
            db.add(AccessPrivilege(employee_id=employee.id, name=name, level=level))

    db.add_all(devices)
    db.flush()

    devices_by_employee: dict[int, list[Device]] = {}
    for device in devices:
        devices_by_employee.setdefault(device.employee_id, []).append(device)

    elevated_ids = {employee.id for employee in RNG.sample(employees, 4)}

    events: list[ActivityEvent] = []
    # Anchored to midnight so the hour offset below sets the hour outright
    # instead of drifting by whatever time of day the seeder happens to run.
    window_start = (datetime.utcnow() - timedelta(days=DAYS_OF_HISTORY)).replace(
        hour=0, minute=0, second=0, microsecond=0
    )

    for employee in employees:
        elevated = employee.id in elevated_ids
        weights = ELEVATED_WEIGHTS if elevated else BASELINE_WEIGHTS
        types = list(weights.keys())
        type_weights = list(weights.values())
        employee_devices = devices_by_employee.get(employee.id, [])

        for _ in range(EVENTS_PER_EMPLOYEE):
            event_type = RNG.choices(types, weights=type_weights, k=1)[0]
            timestamp = window_start + timedelta(
                days=RNG.randint(0, DAYS_OF_HISTORY - 1),
                hours=_pick_hour(elevated),
                minutes=RNG.randint(0, 59),
                seconds=RNG.randint(0, 59),
            )
            events.append(
                ActivityEvent(
                    employee_id=employee.id,
                    device_id=RNG.choice(employee_devices).id if employee_devices else None,
                    event_type=event_type,
                    source=SOURCE_BY_TYPE[event_type],
                    timestamp=timestamp,
                    ip_address=f"10.{RNG.randint(0, 40)}.{RNG.randint(0, 255)}.{RNG.randint(1, 254)}",
                    bytes_transferred=_bytes_for(event_type, elevated),
                    is_after_hours=is_after_hours(timestamp),
                    details=_event_details(event_type),
                )
            )

    db.add_all(events)
    db.commit()
