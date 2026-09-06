"""
Seed script: creates demo users (one per role), a set of employees, and
several weeks of synthetic activity events -- including a few employees
with deliberately injected anomalous behavior so the anomaly detection,
risk scoring, and alerting pipeline has something to find on first run.

Run with:  python -m app.seed
"""
import random
from datetime import datetime, timedelta

from faker import Faker

from app.database import SessionLocal, Base, engine
from app import models
from app.auth import hash_password
from app.services import baseline_service, anomaly_service, risk_service, alert_service

fake = Faker()
random.seed(42)

DEPARTMENTS = ["Finance", "Engineering", "HR", "Sales", "IT Security", "Legal"]
RESOURCES = [
    "shared_drive", "email_system", "internal_wiki", "customer_pii",
    "payroll_db", "source_code_repo", "finance_ledger", "hr_records", "crm_app",
]


def seed_users(db):
    users = [
        ("analyst@company.com", "Ava Analyst", "security_analyst"),
        ("soc@company.com", "Sam SOC", "soc_engineer"),
        ("manager@company.com", "Mira Manager", "security_manager"),
        ("admin@company.com", "Alex Admin", "administrator"),
    ]
    for email, name, role in users:
        if db.query(models.User).filter(models.User.email == email).first():
            continue
        db.add(models.User(
            email=email, full_name=name, role=role,
            hashed_password=hash_password("Password123!"),
        ))
    db.commit()
    print("Seeded demo users (password for all: Password123!)")


def seed_employees(db, count=25):
    if db.query(models.Employee).count() > 0:
        return db.query(models.Employee).all()

    employees = []
    for i in range(count):
        emp = models.Employee(
            employee_code=f"EMP{1000+i}",
            full_name=fake.name(),
            department=random.choice(DEPARTMENTS),
            designation=random.choice(["Analyst", "Engineer", "Manager", "Specialist", "Lead"]),
            manager=fake.name(),
            device_info=f"Laptop-{fake.word().upper()}-{i}",
            access_privileges=",".join(random.sample(
                ["read", "write", "admin", "finance_access", "hr_access", "code_access"], k=2)),
            is_privileged_user=random.random() < 0.2,
        )
        db.add(emp)
        employees.append(emp)
    db.commit()
    for e in employees:
        db.refresh(e)
    print(f"Seeded {len(employees)} employees")
    return employees


def seed_activity_events(db, employees, days=45):
    if db.query(models.ActivityEvent).count() > 0:
        return

    # pick a few employees to behave anomalously
    risky_employees = random.sample(employees, k=min(4, len(employees)))
    risky_ids = {e.id for e in risky_employees}

    now = datetime.utcnow()
    events = []
    for emp in employees:
        is_risky = emp.id in risky_ids
        for day_offset in range(days):
            day = now - timedelta(days=day_offset)
            if day.weekday() >= 5 and random.random() > 0.1:
                continue  # mostly skip weekends

            num_events = random.randint(3, 10)
            for _ in range(num_events):
                normal_hour = random.gauss(10, 1.5)
                hour = int(max(0, min(23, normal_hour)))

                if is_risky and random.random() < 0.25:
                    hour = random.choice([1, 2, 3, 23])  # odd hours

                event_time = day.replace(
                    hour=hour, minute=random.randint(0, 59), second=0, microsecond=0
                )
                event_type = random.choices(
                    ["login", "file_download", "file_upload", "data_transfer",
                     "email", "privilege_change", "remote_access", "usb"],
                    weights=[25, 20, 12, 12, 20, 3, 5, 3],
                )[0]

                volume = 0.0
                if event_type in ("file_download", "file_upload", "data_transfer"):
                    volume = max(0.1, random.gauss(40, 15))
                    if is_risky and random.random() < 0.3:
                        volume *= random.uniform(4, 10)  # exfiltration-style spike

                is_after_hours = hour < 7 or hour > 20
                is_remote = event_type == "remote_access" or (is_risky and random.random() < 0.3)

                resource = random.choice(RESOURCES)
                if is_risky and random.random() < 0.3:
                    resource = random.choice(["payroll_db", "customer_pii", "source_code_repo"])

                events.append(models.ActivityEvent(
                    employee_id=emp.id,
                    event_type=event_type,
                    timestamp=event_time,
                    source_ip=fake.ipv4(),
                    device=emp.device_info,
                    resource=resource,
                    data_volume_mb=round(volume, 2),
                    is_after_hours=is_after_hours,
                    is_remote=is_remote,
                ))

    db.bulk_save_objects(events)
    db.commit()
    print(f"Seeded {len(events)} activity events over {days} days "
          f"({len(risky_ids)} employees with injected anomalous behavior)")


def run_pipeline(db):
    baseline_service.build_all_baselines(db)
    anomaly_count = anomaly_service.detect_anomalies_all(db)
    scores = risk_service.compute_risk_scores_all(db)
    alerts = alert_service.generate_alerts_from_risk_scores(db)
    print(f"Pipeline complete: {anomaly_count} anomalies, "
          f"{len(scores)} risk scores, {len(alerts)} alerts generated")


def main():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_users(db)
        employees = seed_employees(db)
        seed_activity_events(db, employees)
        run_pipeline(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
