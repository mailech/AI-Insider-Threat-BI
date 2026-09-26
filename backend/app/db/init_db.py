import random
from datetime import datetime, timedelta, timezone
from sqlalchemy.orm import Session

from backend.app.db.session import engine, Base, SessionLocal
from backend.app.core.security import get_password_hash
from backend.app.core.roles import UserRole
from backend.app.models.user import User
from backend.app.models.employee import Employee
from backend.app.models.feature import DailyBehavioralFeature
from backend.app.models.baseline import BehavioralBaseline
from backend.app.models.alert import Alert
from backend.app.models.incident import Incident, IncidentComment


def init_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    # Seed Default SOC Accounts if not present
    default_users = [
        {
            "username": "admin",
            "email": "admin@threatbi.soc",
            "full_name": "Chief Information Security Officer (Admin)",
            "password": "Password123!",
            "role": UserRole.ADMINISTRATOR.value
        },
        {
            "username": "manager",
            "email": "manager@threatbi.soc",
            "full_name": "Sarah Connor (SOC Manager)",
            "password": "Password123!",
            "role": UserRole.SECURITY_MANAGER.value
        },
        {
            "username": "soc_engineer",
            "email": "soc_engineer@threatbi.soc",
            "full_name": "David Miller (Lead SOC Engineer)",
            "password": "Password123!",
            "role": UserRole.SOC_ENGINEER.value
        },
        {
            "username": "analyst",
            "email": "analyst@threatbi.soc",
            "full_name": "Elena Rostova (Tier-2 Security Analyst)",
            "password": "Password123!",
            "role": UserRole.SECURITY_ANALYST.value
        }
    ]

    for u_data in default_users:
        existing = db.query(User).filter(User.username == u_data["username"]).first()
        if not existing:
            user = User(
                username=u_data["username"],
                email=u_data["email"],
                full_name=u_data["full_name"],
                hashed_password=get_password_hash(u_data["password"]),
                role=u_data["role"],
                is_active=True
            )
            db.add(user)
    db.commit()

    # Seed Sample CERT R4.2 Employees if empty
    if db.query(Employee).count() == 0:
        departments = ["Engineering", "Finance", "Human Resources", "Sales & Marketing", "IT Operations", "Executive"]
        roles_by_dept = {
            "Engineering": ["Senior Software Engineer", "DevOps Specialist", "Firmware Engineer", "QA Lead"],
            "Finance": ["Senior Financial Analyst", "Staff Accountant", "Payroll Administrator"],
            "Human Resources": ["HR Business Partner", "Talent Acquisition Specialist", "HR Generalist"],
            "Sales & Marketing": ["Account Executive", "Product Marketing Manager", "Sales Director"],
            "IT Operations": ["Systems Administrator", "Database Administrator", "Network Engineer"],
            "Executive": ["VP of Product", "Chief Financial Officer", "Director of Research"]
        }

        # Let's seed specific CERT employees including the prompt's example AAE0190
        sample_employees = [
            ("AAE0190", "Alexander A. Evans", "alexander.evans@dTA0190.org", "Engineering", "Senior Software Engineer", 82.0, "CRITICAL", 4, 3),
            ("BBM0812", "Benjamin B. Miller", "benjamin.miller@dTA0812.org", "IT Operations", "Database Administrator", 88.5, "CRITICAL", 6, 4),
            ("CJS0441", "Catherine J. Smith", "catherine.smith@dTA0441.org", "Finance", "Staff Accountant", 64.0, "HIGH", 3, 2),
            ("DLR0123", "Daniel L. Reynolds", "daniel.reynolds@dTA0123.org", "Engineering", "Firmware Engineer", 56.5, "HIGH", 2, 1),
            ("EGH0992", "Emily G. Harris", "emily.harris@dTA0992.org", "Human Resources", "HR Business Partner", 38.0, "MEDIUM", 1, 1),
            ("FWK0334", "Frank W. King", "frank.king@dTA0334.org", "Sales & Marketing", "Account Executive", 14.0, "LOW", 0, 0),
            ("GLP0771", "Grace L. Peterson", "grace.peterson@dTA0771.org", "IT Operations", "Network Engineer", 18.5, "LOW", 0, 0),
            ("HMC0519", "Henry M. Clark", "henry.clark@dTA0519.org", "Engineering", "DevOps Specialist", 72.0, "HIGH", 4, 2),
            ("IKW0228", "Isabella K. White", "isabella.white@dTA0228.org", "Executive", "VP of Product", 22.0, "LOW", 0, 0),
            ("JTR0654", "James T. Roberts", "james.roberts@dTA0654.org", "Finance", "Senior Financial Analyst", 45.0, "MEDIUM", 1, 0)
        ]

        # Generate 15 more regular employees
        for i in range(11, 26):
            uid = f"EMP{i:04d}"
            dept = departments[i % len(departments)]
            role = roles_by_dept[dept][i % len(roles_by_dept[dept])]
            risk = round(random.uniform(5.0, 32.0), 1)
            sev = "LOW" if risk < 25 else "MEDIUM"
            sample_employees.append((uid, f"Employee {uid}", f"{uid.lower()}@dTA{i:04d}.org", dept, role, risk, sev, 0, 0))

        base_date = datetime.now(timezone.utc).date() - timedelta(days=14)

        for uid, name, email, dept, role, risk, sev, anom_cnt, alt_cnt in sample_employees:
            emp = Employee(
                user_id=uid,
                full_name=name,
                email=email,
                department=dept,
                role=role,
                manager="Director Vance",
                devices=[f"PC-{uid}-01", f"PC-{uid}-02"],
                access_privileges=["CORP_NET", "EMAIL", "GIT_REPO"] + (["PROD_DB", "ADMIN_CONSOLE"] if dept in ["Engineering", "IT Operations"] else []),
                current_risk_score=risk,
                current_severity=sev,
                anomaly_count=anom_cnt,
                alert_count=alt_cnt,
                is_monitored=True,
                last_active_date=str(datetime.now(timezone.utc).date())
            )
            db.add(emp)

            # Create Behavioral Baseline
            metrics_baseline = [
                ("login_count", 2.1, 0.4, 2.0, 1.0, 3.0),
                ("file_activity_count", 15.0, 4.2, 14.0, 5.0, 30.0),
                ("sensitive_file_activity", 0.1, 0.3, 0.0, 0.0, 1.0),
                ("device_connect_count", 0.05, 0.2, 0.0, 0.0, 1.0),
                ("http_request_count", 180.0, 35.0, 175.0, 50.0, 300.0),
                ("email_count", 12.0, 3.5, 11.0, 2.0, 25.0),
                ("attachment_count", 1.2, 0.8, 1.0, 0.0, 4.0),
            ]
            for m_name, mean, std, med, min_v, max_v in metrics_baseline:
                b = BehavioralBaseline(
                    user_id=uid,
                    metric_name=m_name,
                    mean=mean,
                    std=std,
                    median=med,
                    q25=round(mean - std, 1),
                    q75=round(mean + std, 1),
                    min_val=min_v,
                    max_val=max_v,
                    normal_hours_start=8.5,
                    normal_hours_end=17.5,
                    sample_size=90
                )
                db.add(b)

            # Generate 14 days of historical daily features
            for d_idx in range(14):
                day_date = str(base_date + timedelta(days=d_idx))
                is_last_days = d_idx >= 10 and sev in ["HIGH", "CRITICAL"]

                # Anomalous spike for high/crit users on recent days
                logon_c = random.randint(1, 3)
                after_logon = 2 if (is_last_days and uid in ["AAE0190", "BBM0812"]) else (1 if is_last_days else 0)
                usb_c = 2 if (is_last_days and uid in ["AAE0190", "BBM0812"]) else 0
                file_c = random.randint(80, 220) if is_last_days else random.randint(10, 25)
                sens_c = random.randint(12, 35) if (is_last_days and uid in ["AAE0190", "BBM0812"]) else 0
                http_c = random.randint(250, 600) if is_last_days else random.randint(120, 220)
                susp_d = 3 if (is_last_days and uid in ["AAE0190", "BBM0812"]) else 0
                email_c = random.randint(20, 45) if is_last_days else random.randint(8, 16)
                att_c = random.randint(6, 18) if (is_last_days and uid in ["AAE0190", "BBM0812"]) else random.randint(0, 2)

                day_risk = risk if d_idx == 13 else round(risk * (0.3 + (d_idx / 13.0) * 0.7), 1)
                day_sev = "LOW" if day_risk < 25 else ("MEDIUM" if day_risk < 50 else ("HIGH" if day_risk < 75 else "CRITICAL"))
                is_anom = day_risk >= 50.0

                factors = []
                if after_logon > 0:
                    factors.append(f"After-hours login ({after_logon} events outside 08:30-17:30 baseline)")
                if file_c > 60:
                    factors.append(f"File activity significantly above baseline ({file_c} files accessed)")
                if usb_c > 0:
                    factors.append(f"Removable USB storage drive activity detected ({usb_c} connects)")
                if att_c > 4:
                    factors.append(f"Abnormal email attachment volume ({att_c} attachments)")
                if susp_d > 0:
                    factors.append(f"Outbound requests to unapproved cloud storage / mega.nz ({susp_d} requests)")

                feat = DailyBehavioralFeature(
                    user_id=uid,
                    date=day_date,
                    login_count=logon_c,
                    logout_count=logon_c,
                    after_hours_logon=after_logon,
                    weekend_logon=1 if (d_idx % 7 in [5, 6] and is_last_days) else 0,
                    unique_pcs=2 if is_last_days else 1,
                    avg_login_hour=21.4 if after_logon > 0 else 9.1,
                    device_connect_count=usb_c,
                    device_disconnect_count=usb_c,
                    after_hours_device=usb_c if after_logon > 0 else 0,
                    weekend_device=0,
                    file_activity_count=file_c,
                    unique_files=file_c,
                    sensitive_file_activity=sens_c,
                    after_hours_file=file_c if after_logon > 0 else 0,
                    weekend_file=0,
                    http_request_count=http_c,
                    unique_domains=random.randint(15, 40),
                    after_hours_http=http_c if after_logon > 0 else 0,
                    weekend_http=0,
                    suspicious_domain_count=susp_d,
                    email_count=email_c,
                    attachment_count=att_c,
                    recipient_count=email_c * 2,
                    avg_email_size=4.5 if att_c > 4 else 0.8,
                    after_hours_email=email_c if after_logon > 0 else 0,
                    weekend_email=0,
                    activity_deviation_score=round(day_risk / 100.0, 3),
                    is_anomaly=is_anom,
                    anomaly_score=round(min(1.0, day_risk / 90.0), 3),
                    risk_score=day_risk,
                    severity=day_sev,
                    contributing_factors=factors or ["Normal baseline behavior"],
                    raw_metrics={"logon_c": logon_c, "file_c": file_c, "http_c": http_c}
                )
                db.add(feat)

        db.commit()

        # Seed Alerts for critical employees
        alert_1 = Alert(
            alert_id="ALT-2026-0091",
            user_id="AAE0190",
            timestamp=f"{str(datetime.now(timezone.utc).date())}T21:45:00Z",
            severity="CRITICAL",
            risk_score=82.0,
            anomaly_score=0.912,
            reasons=[
                "After-hours login at 21:45:00 (baseline normal hours: 08:30-17:30)",
                "File activity significantly above baseline (184 files vs. 15 avg)",
                "Removable USB storage drive connected (PC-AAE0190-01)",
                "Email attachment volume spike (14 attachments sent to personal Gmail)"
            ],
            related_activities=[
                {"event": "LOGON", "time": "21:45:10", "pc": "PC-AAE0190-01"},
                {"event": "DEVICE_CONNECT", "time": "21:52:00", "device": "SanDisk_USB_Drive"},
                {"event": "FILE_COPY", "time": "22:04:15", "files": "confidential_src.zip"},
                {"event": "EMAIL_SENT", "time": "22:15:30", "to": "alex_personal@gmail.com"}
            ],
            status="NEW",
            assigned_analyst="Elena Rostova (Tier-2 Security Analyst)",
            notes="Requires immediate review. Potential source code intellectual property exfiltration."
        )
        alert_2 = Alert(
            alert_id="ALT-2026-0089",
            user_id="BBM0812",
            timestamp=f"{str(datetime.now(timezone.utc).date())}T22:10:00Z",
            severity="CRITICAL",
            risk_score=88.5,
            anomaly_score=0.954,
            reasons=[
                "Privilege misuse: DBA downloaded 32 sensitive customer financial records after-hours",
                "Unusual file access volume exceeding 4 standard deviations from baseline",
                "Outbound HTTP web POST requests to untrusted file sharing service mega.nz"
            ],
            related_activities=[
                {"event": "DB_EXPORT", "time": "22:10:14", "query": "SELECT * FROM cust_billing"},
                {"event": "HTTP_POST", "time": "22:25:30", "domain": "mega.nz", "bytes": 48500000}
            ],
            status="INVESTIGATING",
            assigned_analyst="David Miller (Lead SOC Engineer)"
        )
        alert_3 = Alert(
            alert_id="ALT-2026-0085",
            user_id="CJS0441",
            timestamp=f"{str(datetime.now(timezone.utc).date() - timedelta(days=1))}T19:30:00Z",
            severity="HIGH",
            risk_score=64.0,
            anomaly_score=0.742,
            reasons=[
                "Abnormal after-hours payroll data access",
                "Attachment count spike (8 spreadsheets emailed outside corporate domain)"
            ],
            status="RESOLVED",
            assigned_analyst="Sarah Connor (SOC Manager)",
            notes="Confirmed authorized quarterly audit task with finance VP."
        )
        db.add_all([alert_1, alert_2, alert_3])
        db.commit()

        # Seed Sample Incident Case
        incident_1 = Incident(
            incident_id="INC-2026-0412",
            title="Potential IP Source Code Exfiltration via USB & Webmail - Alexander Evans (AAE0190)",
            user_id="AAE0190",
            severity="CRITICAL",
            status="IN_PROGRESS",
            assigned_analyst="Elena Rostova (Tier-2 Security Analyst)",
            description="Employee Alexander Evans (Senior Software Engineer) exhibited abnormal after-hours logins (21:45 PM), copied 184 files including sensitive proprietary codebase archives to an unauthorized USB drive, and sent outbound emails with encrypted archives to personal webmail.",
            evidence_references=["ALT-2026-0091", "SHA256: 4a8f9c2d1e0b...", "USB: SanDisk_Ultra_32GB", "URL: wetransfer.com"],
            root_cause="Imminent resignation notice correlated with mass file extraction.",
            resolution=None
        )
        db.add(incident_1)
        db.commit()

        # Add initial incident comment
        comment_1 = IncidentComment(
            incident_id="INC-2026-0412",
            author="Elena Rostova (Tier-2 Security Analyst)",
            comment="Initial triage completed. High confidence of intentional exfiltration. Escalated to SOC Manager and Legal.",
            timestamp=datetime.now(timezone.utc)
        )
        db.add(comment_1)
        db.commit()

    db.close()
