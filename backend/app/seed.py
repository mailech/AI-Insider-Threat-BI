import datetime
import random
from sqlalchemy.orm import Session
from sqlalchemy import text, inspect
from app.database import SessionLocal, engine, Base
from app.models import User, Employee, DeviceAsset, RiskTrajectory, TelemetryLog, SystemSetting, AuditLog, InvestigationNote, Incident

from app.auth import get_password_hash
from app.config import settings
from app.ml_service import train_and_evaluate_ml_model

def ensure_schema_migrated(db: Session):
    """Ensures all new schema columns and tables exist in SQLite database before running ORM queries."""
    try:
        # Create all tables (including incidents) if not exist
        Base.metadata.create_all(bind=engine)

        # 1. telemetry_logs columns
        res = db.execute(text("PRAGMA table_info(telemetry_logs)"))
        tl_cols = [row[1] for row in res.fetchall()]
        if tl_cols and "anomaly_category" not in tl_cols:
            db.execute(text("ALTER TABLE telemetry_logs ADD COLUMN anomaly_category VARCHAR(50)"))
            db.commit()
        if tl_cols and "source" not in tl_cols:
            db.execute(text("ALTER TABLE telemetry_logs ADD COLUMN source VARCHAR(50) DEFAULT 'seeded'"))
            db.commit()

        # 2. employees columns
        res_emp = db.execute(text("PRAGMA table_info(employees)"))
        emp_cols = [row[1] for row in res_emp.fetchall()]
        if emp_cols:
            if "vpn_revocation_flagged" not in emp_cols:
                db.execute(text("ALTER TABLE employees ADD COLUMN vpn_revocation_flagged BOOLEAN DEFAULT 0"))
            if "containment_status" not in emp_cols:
                db.execute(text("ALTER TABLE employees ADD COLUMN containment_status VARCHAR(30) DEFAULT 'normal'"))
            if "requires_mfa_reset" not in emp_cols:
                db.execute(text("ALTER TABLE employees ADD COLUMN requires_mfa_reset BOOLEAN DEFAULT 0"))
            if "training_assigned" not in emp_cols:
                db.execute(text("ALTER TABLE employees ADD COLUMN training_assigned BOOLEAN DEFAULT 0"))
            if "training_assigned_date" not in emp_cols:
                db.execute(text("ALTER TABLE employees ADD COLUMN training_assigned_date DATETIME"))
            if "access_privileges" not in emp_cols:
                db.execute(text("ALTER TABLE employees ADD COLUMN access_privileges JSON DEFAULT '[]'"))
            if "ml_corroboration_score" not in emp_cols:
                db.execute(text("ALTER TABLE employees ADD COLUMN ml_corroboration_score FLOAT DEFAULT NULL"))
            db.commit()

        # 3. investigation_notes columns
        res_notes = db.execute(text("PRAGMA table_info(investigation_notes)"))
        note_cols = [row[1] for row in res_notes.fetchall()]
        if note_cols and "incident_id" not in note_cols:
            db.execute(text("ALTER TABLE investigation_notes ADD COLUMN incident_id INTEGER REFERENCES incidents(id)"))
            db.commit()
    except Exception as e:
        db.rollback()
        print(f"Schema migration check note: {e}")


def seed_default_identity_mappings(db: Session):
    """Seeds baseline Windows identity mappings for key seeded personas if table is empty."""
    from app.models import EmployeeIdentityMapping, Employee
    try:
        default_mappings = [
            ("CORP\\elena.rostova", "emp_1001", "Elena Rostova (Executive Director)"),
            ("CORP\\marcus.hale", "emp_1002", "Marcus Hale (Senior System Architect)"),
            ("CORP\\priya.patel", "emp_1003", "Priya Patel (Lead Cloud Engineer)"),
            ("CORP\\luca.ferrari", "emp_1004", "Luca Ferrari (Enterprise Account Executive)"),
        ]
        for win_id, emp_id, desc in default_mappings:
            existing = db.query(EmployeeIdentityMapping).filter(EmployeeIdentityMapping.windows_identifier.ilike(win_id)).first()
            if not existing:
                emp = db.query(Employee).filter(Employee.id == emp_id).first()
                if emp:
                    db.add(EmployeeIdentityMapping(
                        windows_identifier=win_id,
                        employee_id=emp.id,
                        description=desc,
                        created_by="System Initializer"
                    ))
        db.commit()
        print("Successfully initialized default Windows employee identity mappings.")
    except Exception as ex:
        db.rollback()
        print(f"Note on seeding identity mappings: {ex}")


def seed_database(db: Session = None):

    close_db = False
    if db is None:
        Base.metadata.create_all(bind=engine)
        db = SessionLocal()
        close_db = True

    try:
        now = datetime.datetime.utcnow()

        # Ensure schema migrations are applied first
        ensure_schema_migrated(db)

        # Check if already seeded -> run backfill/migration for Milestone 2 & Elevation additions
        if db.query(User).count() > 0:
            print("Database already initialized. Running Milestone 2, Elevation and Milestone 3 features sync...")
            backfill_milestone2_data(db, now)
            backfill_elevation_features(db)
            backfill_inbounds_enhancements(db, now)
            backfill_milestone2_round2(db, now)
            backfill_milestone1_2_round3(db, now)
            backfill_milestone1_2_round4(db, now)
            backfill_milestone3_incidents(db, now)
            train_and_evaluate_ml_model(db)
            seed_default_identity_mappings(db)
            return






        print("Seeding Activity Management System (AMS) database...")




        # 1. Seed System Users (4 Accounts)
        users = [
            User(
                email="admin@ams.internal",
                hashed_password=get_password_hash("Admin1234!"),
                full_name="Alexander Cross",
                role="Administrator",
                is_active=True,
                created_at=now - datetime.timedelta(days=120)
            ),
            User(
                email="manager@ams.internal",
                hashed_password=get_password_hash("Manager123!"),
                full_name="Elena Vance",
                role="Security Manager",
                is_active=True,
                created_at=now - datetime.timedelta(days=90)
            ),
            User(
                email="soc@ams.internal",
                hashed_password=get_password_hash("SocEng123!"),
                full_name="Nathan Drake",
                role="SOC Engineer",
                is_active=True,
                created_at=now - datetime.timedelta(days=60)
            ),
            User(
                email="analyst@ams.internal",
                hashed_password=get_password_hash("Analyst123!"),
                full_name="Samantha Ray",
                role="Security Analyst",
                is_active=True,
                created_at=now - datetime.timedelta(days=45)
            ),
        ]
        db.add_all(users)
        db.commit()

        # 2. Seed System Settings & Initial Audit Trail
        settings_records = [
            SystemSetting(
                key="threat_scoring_weights",
                value=settings.DEFAULT_WEIGHTS,
                updated_at=now
            ),
            SystemSetting(
                key="notification_settings",
                value={
                    "high_severity_alerts": True,
                    "critical_severity_urgent": True,
                    "daily_security_digest": True,
                    "alert_delivery_email": "soc-team@ams.internal"
                },
                updated_at=now
            )
        ]
        db.add_all(settings_records)
        db.commit()

        initial_audits = [
            AuditLog(
                user_email="admin@ams.internal",
                user_role="Administrator",
                action="UPDATE_WEIGHTS",
                target_resource="threat_scoring_weights",
                details={"status": "Factory Defaults Initialized", "weights": settings.DEFAULT_WEIGHTS},
                ip_address="10.14.0.5",
                timestamp=now - datetime.timedelta(days=3, hours=4)
            ),
            AuditLog(
                user_email="manager@ams.internal",
                user_role="Security Manager",
                action="EXPORT_FLEET_CSV",
                target_resource="fleet_risk_analytics",
                details={"departments_count": 8, "total_employees": 16},
                ip_address="10.14.0.12",
                timestamp=now - datetime.timedelta(days=2, hours=6)
            ),
            AuditLog(
                user_email="soc@ams.internal",
                user_role="SOC Engineer",
                action="EXPORT_TELEMETRY_CSV",
                target_resource="telemetry_logs",
                details={"record_count": 150, "filters": {"severity": "CRITICAL"}},
                ip_address="10.14.2.19",
                timestamp=now - datetime.timedelta(days=1, hours=2)
            ),
            AuditLog(
                user_email="analyst@ams.internal",
                user_role="Security Analyst",
                action="VIEW_EMPLOYEE_DOSSIER",
                target_resource="emp_1001",
                details={"employee_name": "Marcus Hale", "threat_score": 88.0, "department": "Finance"},
                ip_address="10.14.2.44",
                timestamp=now - datetime.timedelta(hours=5)
            )
        ]
        db.add_all(initial_audits)
        db.commit()


        # 3. Seed 16 Reference Employees
        employee_data = [
            {
                "id": "emp_1001",
                "full_name": "Marcus Hale",
                "email": "marcus.hale@ams.internal",
                "department": "Finance",
                "designation": "Senior Accountant",
                "direct_manager": "David Vance",
                "enrolled_days_ago": 410,
                "threat_score": 88.0,
                "risk_category": "Critical",
                "avatar_initials": "MH",
                "assets": [
                    {"asset_id": "LAPTOP-FIN-8821", "asset_type": "Laptop", "ip": "10.14.8.42", "mac": "00:1A:2B:77:4D:11", "os": "Windows 11 Enterprise", "status": "Monitored"},
                    {"asset_id": "WS-FIN-DESK-04", "asset_type": "Workstation", "ip": "10.14.8.99", "mac": "00:1A:2B:77:4D:12", "os": "Windows 11 Enterprise", "status": "Active"}
                ]
            },
            {
                "id": "emp_1002",
                "full_name": "Priya Nair",
                "email": "priya.nair@ams.internal",
                "department": "IT Infrastructure",
                "designation": "Systems Administrator",
                "direct_manager": "Sarah Jenkins",
                "enrolled_days_ago": 360,
                "threat_score": 81.0,
                "risk_category": "Critical",
                "avatar_initials": "PN",
                "assets": [
                    {"asset_id": "LAPTOP-SEC-4921", "asset_type": "Laptop", "ip": "10.14.2.88", "mac": "00:1A:2B:3C:4D:5E", "os": "Ubuntu 22.04 LTS", "status": "Monitored"},
                    {"asset_id": "BASTION-INFRA-01", "asset_type": "Cloud Bastion", "ip": "172.16.40.12", "mac": "00:1A:2B:99:EE:11", "os": "Debian 12", "status": "Active"}
                ]
            },
            {
                "id": "emp_1003",
                "full_name": "Chen Wei",
                "email": "chen.wei@ams.internal",
                "department": "Research",
                "designation": "Principal Engineer",
                "direct_manager": "Dr. Aris Thorne",
                "enrolled_days_ago": 520,
                "threat_score": 74.0,
                "risk_category": "High",
                "avatar_initials": "CW",
                "assets": [
                    {"asset_id": "WS-RND-GPU-09", "asset_type": "Workstation", "ip": "10.14.5.101", "mac": "00:1A:2B:44:88:99", "os": "Ubuntu 24.04 LTS", "status": "Active"},
                    {"asset_id": "LAPTOP-RND-104", "asset_type": "Laptop", "ip": "10.14.5.102", "mac": "00:1A:2B:44:88:9A", "os": "macOS Sonoma", "status": "Active"}
                ]
            },
            {
                "id": "emp_1004",
                "full_name": "Amara Diallo",
                "email": "amara.diallo@ams.internal",
                "department": "Sales",
                "designation": "Account Executive",
                "direct_manager": "Rachel Ross",
                "enrolled_days_ago": 280,
                "threat_score": 68.0,
                "risk_category": "High",
                "avatar_initials": "AD",
                "assets": [
                    {"asset_id": "LAPTOP-SLS-302", "asset_type": "Laptop", "ip": "10.14.12.33", "mac": "00:1A:2B:11:22:33", "os": "Windows 11 Enterprise", "status": "Active"},
                    {"asset_id": "MOBILE-SLS-08", "asset_type": "Mobile", "ip": "10.14.12.34", "mac": "00:1A:2B:11:22:34", "os": "iOS 17.5", "status": "Active"}
                ]
            },
            {
                "id": "emp_1005",
                "full_name": "Viktor Sorokin",
                "email": "viktor.sorokin@ams.internal",
                "department": "Procurement",
                "designation": "Procurement Analyst",
                "direct_manager": "Elena Rostova",
                "enrolled_days_ago": 310,
                "threat_score": 62.0,
                "risk_category": "High",
                "avatar_initials": "VS",
                "assets": [
                    {"asset_id": "LAPTOP-PRC-440", "asset_type": "Laptop", "ip": "10.14.15.20", "mac": "00:1A:2B:55:66:77", "os": "Windows 11 Enterprise", "status": "Active"}
                ]
            },
            {
                "id": "emp_1006",
                "full_name": "Daniel Okonkwo",
                "email": "daniel.okonkwo@ams.internal",
                "department": "IT Infrastructure",
                "designation": "Cloud DevOps Lead",
                "direct_manager": "Sarah Jenkins",
                "enrolled_days_ago": 240,
                "threat_score": 61.0,
                "risk_category": "High",
                "avatar_initials": "DO",
                "assets": [
                    {"asset_id": "LAPTOP-OPS-119", "asset_type": "Laptop", "ip": "10.14.2.91", "mac": "00:1A:2B:99:AA:BB", "os": "macOS Sonoma", "status": "Active"},
                    {"asset_id": "DEV-K8S-BASTION", "asset_type": "Cloud Bastion", "ip": "172.16.40.18", "mac": "00:1A:2B:99:AA:BC", "os": "Linux Alpine", "status": "Active"}
                ]
            },
            {
                "id": "emp_1007",
                "full_name": "Sofia Reyes",
                "email": "sofia.reyes@ams.internal",
                "department": "Human Resources",
                "designation": "HR Specialist",
                "direct_manager": "Amanda Cox",
                "enrolled_days_ago": 195,
                "threat_score": 45.0,
                "risk_category": "Medium",
                "avatar_initials": "SR",
                "assets": [
                    {"asset_id": "LAPTOP-HR-008", "asset_type": "Laptop", "ip": "10.14.9.15", "mac": "00:1A:2B:CC:DD:EE", "os": "Windows 11 Enterprise", "status": "Active"}
                ]
            },
            {
                "id": "emp_1008",
                "full_name": "Ingrid Svenson",
                "email": "ingrid.svenson@ams.internal",
                "department": "Finance",
                "designation": "Financial Analyst",
                "direct_manager": "Marcus Hale",
                "enrolled_days_ago": 210,
                "threat_score": 41.0,
                "risk_category": "Medium",
                "avatar_initials": "IS",
                "assets": [
                    {"asset_id": "LAPTOP-FIN-201", "asset_type": "Laptop", "ip": "10.14.8.55", "mac": "00:1A:2B:77:88:11", "os": "Windows 11 Enterprise", "status": "Active"}
                ]
            },
            {
                "id": "emp_1009",
                "full_name": "James Okafor",
                "email": "james.okafor@ams.internal",
                "department": "Legal",
                "designation": "Legal Counsel",
                "direct_manager": "Arthur Pendelton",
                "enrolled_days_ago": 340,
                "threat_score": 38.0,
                "risk_category": "Medium",
                "avatar_initials": "JO",
                "assets": [
                    {"asset_id": "LAPTOP-LGL-012", "asset_type": "Laptop", "ip": "10.14.11.22", "mac": "00:1A:2B:12:34:56", "os": "macOS Sonoma", "status": "Active"}
                ]
            },
            {
                "id": "emp_1010",
                "full_name": "Kwame Asante",
                "email": "kwame.asante@ams.internal",
                "department": "Research",
                "designation": "Data Scientist",
                "direct_manager": "Chen Wei",
                "enrolled_days_ago": 180,
                "threat_score": 35.0,
                "risk_category": "Medium",
                "avatar_initials": "KA",
                "assets": [
                    {"asset_id": "WS-RND-DS-02", "asset_type": "Workstation", "ip": "10.14.5.115", "mac": "00:1A:2B:44:99:00", "os": "Ubuntu 22.04 LTS", "status": "Active"}
                ]
            },
            {
                "id": "emp_1011",
                "full_name": "Mei Zhang",
                "email": "mei.zhang@ams.internal",
                "department": "Marketing",
                "designation": "Growth Lead",
                "direct_manager": "Jessica Morales",
                "enrolled_days_ago": 160,
                "threat_score": 32.0,
                "risk_category": "Medium",
                "avatar_initials": "MZ",
                "assets": [
                    {"asset_id": "LAPTOP-MKT-044", "asset_type": "Laptop", "ip": "10.14.14.18", "mac": "00:1A:2B:AA:11:22", "os": "macOS Sonoma", "status": "Active"}
                ]
            },
            {
                "id": "emp_1012",
                "full_name": "Carlos Mendes",
                "email": "carlos.mendes@ams.internal",
                "department": "Procurement",
                "designation": "Supply Chain Specialist",
                "direct_manager": "Viktor Sorokin",
                "enrolled_days_ago": 130,
                "threat_score": 26.0,
                "risk_category": "Low",
                "avatar_initials": "CM",
                "assets": [
                    {"asset_id": "LAPTOP-PRC-301", "asset_type": "Laptop", "ip": "10.14.15.44", "mac": "00:1A:2B:55:77:88", "os": "Windows 11 Enterprise", "status": "Active"}
                ]
            },
            {
                "id": "emp_1013",
                "full_name": "Noah Brennan",
                "email": "noah.brennan@ams.internal",
                "department": "Customer Support",
                "designation": "Support Lead",
                "direct_manager": "Lisa Wong",
                "enrolled_days_ago": 220,
                "threat_score": 18.0,
                "risk_category": "Low",
                "avatar_initials": "NB",
                "assets": [
                    {"asset_id": "WS-SUP-014", "asset_type": "Workstation", "ip": "10.14.18.50", "mac": "00:1A:2B:77:11:44", "os": "Windows 11 Enterprise", "status": "Active"}
                ]
            },
            {
                "id": "emp_1014",
                "full_name": "Elena Rostova",
                "email": "elena.rostova@ams.internal",
                "department": "Sales",
                "designation": "Regional Sales Director",
                "direct_manager": "Rachel Ross",
                "enrolled_days_ago": 480,
                "threat_score": 15.0,
                "risk_category": "Low",
                "avatar_initials": "ER",
                "assets": [
                    {"asset_id": "LAPTOP-SLS-100", "asset_type": "Laptop", "ip": "10.14.12.10", "mac": "00:1A:2B:11:00:11", "os": "Windows 11 Enterprise", "status": "Active"}
                ]
            },
            {
                "id": "emp_1015",
                "full_name": "Fatima Al-Rashid",
                "email": "fatima.alrashid@ams.internal",
                "department": "Operations",
                "designation": "Operations Coordinator",
                "direct_manager": "Robert Sterling",
                "enrolled_days_ago": 150,
                "threat_score": 12.0,
                "risk_category": "Low",
                "avatar_initials": "FA",
                "assets": [
                    {"asset_id": "WS-OPS-032", "asset_type": "Workstation", "ip": "10.14.20.14", "mac": "00:1A:2B:99:33:11", "os": "Windows 11 Enterprise", "status": "Active"}
                ]
            },
            {
                "id": "emp_1016",
                "full_name": "Luca Ferrari",
                "email": "luca.ferrari@ams.internal",
                "department": "Finance",
                "designation": "Junior Auditor",
                "direct_manager": "Ingrid Svenson",
                "enrolled_days_ago": 90,
                "threat_score": 8.0,
                "risk_category": "Low",
                "avatar_initials": "LF",
                "assets": [
                    {"asset_id": "LAPTOP-FIN-412", "asset_type": "Laptop", "ip": "10.14.8.77", "mac": "00:1A:2B:77:99:22", "os": "Windows 11 Enterprise", "status": "Active"}
                ]
            },
            {
                "id": "emp_1017",
                "full_name": "Aisha Mensah",
                "email": "aisha.mensah@ams.internal",
                "department": "Research",
                "designation": "Research Associate",
                "direct_manager": "Kwame Asante",
                "enrolled_days_ago": 75,
                "threat_score": 5.0,
                "risk_category": "Low",
                "avatar_initials": "AM",
                "assets": [
                    {"asset_id": "WS-RND-RA-01", "asset_type": "Workstation", "ip": "10.14.5.130", "mac": "00:1A:2B:44:11:22", "os": "Ubuntu 22.04 LTS", "status": "Active"}
                ]
            }
        ]

        for ed in employee_data:
            enrolled_dt = now - datetime.timedelta(days=ed["enrolled_days_ago"])
            emp = Employee(
                id=ed["id"],
                full_name=ed["full_name"],
                email=ed["email"],
                department=ed["department"],
                designation=ed["designation"],
                direct_manager=ed["direct_manager"],
                enrolled_date=enrolled_dt,
                threat_score=ed["threat_score"],
                risk_category=ed["risk_category"],
                avatar_initials=ed["avatar_initials"],
                last_active=now - datetime.timedelta(minutes=random.randint(5, 120)),
                updated_at=now - datetime.timedelta(minutes=random.randint(2, 30))
            )
            db.add(emp)

            # Add Device Assets
            for asset in ed["assets"]:
                da = DeviceAsset(
                    employee_id=ed["id"],
                    asset_id=asset["asset_id"],
                    asset_type=asset["asset_type"],
                    ip_address=asset["ip"],
                    mac_address=asset.get("mac"),
                    os_name=asset.get("os", "Windows 11 Enterprise"),
                    status=asset.get("status", "Active")
                )
                db.add(da)

            # Add 30-Day Risk Trajectory
            target_score = ed["threat_score"]
            baseline = 22.0 if target_score < 40 else 30.0
            for day in range(-30, 1):
                day_date = now + datetime.timedelta(days=day)
                # Curve progression towards current threat score
                progress = (day + 30) / 30.0
                if target_score >= 80:  # Critical spike
                    if day < -15:
                        s = baseline + (random.uniform(-3, 5))
                    elif day < -7:
                        s = baseline + (progress * 30.0) + random.uniform(-2, 3)
                    else:
                        s = target_score - ((abs(day)) * 1.2) + random.uniform(-1.5, 1.5)
                elif target_score >= 60:  # High steady climb
                    s = baseline + (progress * (target_score - baseline)) + random.uniform(-2, 2)
                elif target_score >= 30:  # Medium fluctuating
                    s = baseline + (random.uniform(-4, 6)) + (progress * (target_score - baseline))
                else:  # Low steady
                    s = max(2.0, target_score + random.uniform(-2, 3))

                clamped_score = round(min(100.0, max(0.0, s)), 1)
                if day == 0:
                    clamped_score = target_score

                rt = RiskTrajectory(
                    employee_id=ed["id"],
                    day_offset=day,
                    date=day_date,
                    score=clamped_score,
                    baseline_score=baseline
                )
                db.add(rt)

        db.commit()

        # 4. Seed Telemetry Event Logs (150+ realistic events with relative timestamps)
        telemetry_events = [
            # Marcus Hale (Critical 88%) - Finance exfiltration & privilege escalation
            {
                "employee_id": "emp_1001",
                "event_type": "PRIVILEGE_CHANGE",
                "severity": "CRITICAL",
                "anomaly_category": "UNAUTHORIZED_ACCESS_ATTEMPT",
                "minutes_ago": 24,
                "ip": "10.14.8.42",
                "desc": "Elevated credentials to DOMAIN_ADMIN via unauthorized SAM database modification",
                "payload": {
                    "from_level": "FIN_ANALYST",
                    "to_level": "DOMAIN_ADMIN",
                    "method": "SAM_REGISTRY_INJECTION",
                    "target_user": "marcus.hale",
                    "terminal": "pts/3",
                    "session_id": "SES-99824-A"
                }
            },
            {
                "employee_id": "emp_1001",
                "event_type": "DATA_TRANSFER",
                "severity": "CRITICAL",
                "anomaly_category": "EXCESSIVE_FILE_TRANSFER",
                "minutes_ago": 75,
                "ip": "10.14.8.42",
                "desc": "Transferred 14.8 GB encrypted archive 'Q3_Financial_Ledger_Full.7z' to external cloud endpoint",
                "payload": {
                    "destination": "https://storage.external-sync-bucket.io/dump/fin_archive.7z",
                    "bytes_transferred": 15892401800,
                    "protocol": "HTTPS/TLS1.3",
                    "encryption": "AES-256-GCM"
                }
            },
            {
                "employee_id": "emp_1001",
                "event_type": "FILE_DOWNLOAD",
                "severity": "HIGH",
                "anomaly_category": "ABNORMAL_DATA_DOWNLOAD",
                "minutes_ago": 180,
                "ip": "10.14.8.42",
                "desc": "Downloaded 480 customer tax filing records from restricted DB share",
                "payload": {"file_count": 480, "db_table": "tax_filings_2025", "size_mb": 620}
            },
            {
                "employee_id": "emp_1001",
                "event_type": "LOGIN",
                "severity": "HIGH",
                "anomaly_category": "UNUSUAL_LOGIN_TIME",
                "minutes_ago": 360,
                "ip": "194.26.29.11",
                "desc": "Anomalous after-hours VPN login from non-corporate foreign ASN (02:14 AM)",
                "payload": {"isp": "Datacenter Proxy LLC", "country": "NL", "auth_method": "RADIUS_FALLBACK"}
            },
            {
                "employee_id": "emp_1001",
                "event_type": "NETWORK_ACTIVITY",
                "severity": "CRITICAL",
                "anomaly_category": "SUSPICIOUS_DEVICE_USAGE",
                "minutes_ago": 420,
                "ip": "194.26.29.11",
                "desc": "Direct outbound encrypted reverse SSH tunnel established to unlisted foreign IP",
                "payload": {"remote_port": 4444, "protocol": "SSH-2.0", "destination_host": "tunnel.shadow-ops.cc"}
            },
            {
                "employee_id": "emp_1001",
                "event_type": "APPLICATION_USAGE",
                "severity": "HIGH",
                "anomaly_category": "UNAUTHORIZED_ACCESS_ATTEMPT",
                "minutes_ago": 540,
                "ip": "10.14.8.42",
                "desc": "Executed unapproved credential enumeration binary 'mimikatz_x64.exe'",
                "payload": {"process_id": 8912, "parent_process": "cmd.exe", "user": "marcus.hale"}
            },
            {
                "employee_id": "emp_1001",
                "event_type": "REMOTE_ACCESS",
                "severity": "MEDIUM",
                "minutes_ago": 720,
                "ip": "10.14.8.42",
                "desc": "Established RDP tunnel to core finance database server",
                "payload": {"target_host": "DB-CORE-FIN-01", "port": 3389, "auth": "Marcus Hale"}
            },

            # Priya Nair (Critical 81%) - IT Infrastructure Admin Privilege Misuse
            {
                "employee_id": "emp_1002",
                "event_type": "PRIVILEGE_CHANGE",
                "severity": "CRITICAL",
                "anomaly_category": "UNAUTHORIZED_ACCESS_ATTEMPT",
                "minutes_ago": 40,
                "ip": "10.14.2.88",
                "desc": "SUDO privilege escalation bypass executed on production Kubernetes cluster gateway",
                "payload": {
                    "from_level": "L2_SUPPORT",
                    "to_level": "CLUSTER_SUPERUSER",
                    "method": "SUDO_ESCALATION",
                    "target_user": "priya.nair",
                    "authorized_by": "UNAUTHORIZED_BYPASS",
                    "session_duration": "14m 22s"
                }
            },
            {
                "employee_id": "emp_1002",
                "event_type": "FILE_DOWNLOAD",
                "severity": "CRITICAL",
                "anomaly_category": "ABNORMAL_DATA_DOWNLOAD",
                "minutes_ago": 110,
                "ip": "172.16.40.12",
                "desc": "Dumped master credential vault keys 'ams_vault_master.key' and certificates",
                "payload": {"path": "/etc/vault/keys/master.pem", "sha256": "8f39b...c41", "size_kb": 128}
            },
            {
                "employee_id": "emp_1002",
                "event_type": "APPLICATION_USAGE",
                "severity": "HIGH",
                "anomaly_category": "UNAUTHORIZED_ACCESS_ATTEMPT",
                "minutes_ago": 210,
                "ip": "10.14.2.88",
                "desc": "Ran unauthorized raw network packet sniffer 'Wireshark_Daemon_v4' on internal backbone",
                "payload": {"interface": "eth0", "capture_filter": "port 5432 or port 3306", "duration_sec": 480}
            },
            {
                "employee_id": "emp_1002",
                "event_type": "REMOTE_ACCESS",
                "severity": "HIGH",
                "anomaly_category": "UNUSUAL_LOGIN_TIME",
                "minutes_ago": 300,
                "ip": "10.14.2.88",
                "desc": "Direct SSH connection to root management console during off-schedule maintenance window",
                "payload": {"target_ip": "10.0.0.1", "port": 22, "protocol": "SSH-2.0"}
            },
            {
                "employee_id": "emp_1002",
                "event_type": "LOGIN",
                "severity": "MEDIUM",
                "minutes_ago": 580,
                "ip": "10.14.2.88",
                "desc": "Multi-factor authentication bypass token used for secondary administrative console",
                "payload": {"auth_provider": "Okta_Emergency_Token", "granted": True}
            },

            # Chen Wei (High 74%) - Research IP Download
            {
                "employee_id": "emp_1003",
                "event_type": "FILE_DOWNLOAD",
                "severity": "HIGH",
                "anomaly_category": "ABNORMAL_DATA_DOWNLOAD",
                "minutes_ago": 90,
                "ip": "10.14.5.101",
                "desc": "Bulk download of proprietary neural model weights 'agentic_core_v4_weights.bin' (22 GB)",
                "payload": {"repo": "git@github.internal:ams/ai-research.git", "size_gb": 22.4}
            },
            {
                "employee_id": "emp_1003",
                "event_type": "DATA_TRANSFER",
                "severity": "HIGH",
                "anomaly_category": "EXCESSIVE_FILE_TRANSFER",
                "minutes_ago": 210,
                "ip": "10.14.5.101",
                "desc": "Outbound SCP transfer of patent research documents to personal server",
                "payload": {"destination_ip": "45.33.32.156", "bytes": 482000000}
            },
            {
                "employee_id": "emp_1003",
                "event_type": "USB_DEVICE",
                "severity": "HIGH",
                "anomaly_category": "SUSPICIOUS_DEVICE_USAGE",
                "minutes_ago": 340,
                "ip": "10.14.5.101",
                "desc": "Mass storage device attached and mounted with 18.2 GB write activity registered",
                "payload": {"vendor": "Samsung Portable SSD T7", "serial": "S5TXNS0N1209", "capacity_gb": 1000}
            },
            {
                "employee_id": "emp_1003",
                "event_type": "LOGIN",
                "severity": "LOW",
                "minutes_ago": 480,
                "ip": "10.14.5.101",
                "desc": "Standard terminal session authentication",
                "payload": {"method": "SSH_PUBKEY"}
            },

            # Amara Diallo (High 68%) - Sales Exfiltration
            {
                "employee_id": "emp_1004",
                "event_type": "USB_DEVICE",
                "severity": "HIGH",
                "anomaly_category": "SUSPICIOUS_DEVICE_USAGE",
                "minutes_ago": 130,
                "ip": "10.14.12.33",
                "desc": "Exported entire CRM enterprise client contact database to external personal USB storage",
                "payload": {"records_count": 12400, "device": "SanDisk 128GB Ultra USB 3.0", "format": "CSV"}
            },
            {
                "employee_id": "emp_1004",
                "event_type": "EMAIL_ACTIVITY",
                "severity": "HIGH",
                "anomaly_category": "EXCESSIVE_FILE_TRANSFER",
                "minutes_ago": 260,
                "ip": "10.14.12.33",
                "desc": "Sent 3 bulk emails with customer pricing contracts to personal Gmail address",
                "payload": {"recipient": "amara.personal@gmail.com", "attachment_count": 14}
            },

            # Viktor Sorokin (High 62%) - Procurement contract tamper
            {
                "employee_id": "emp_1005",
                "event_type": "DATA_TRANSFER",
                "severity": "HIGH",
                "anomaly_category": "EXCESSIVE_FILE_TRANSFER",
                "minutes_ago": 150,
                "ip": "10.14.15.20",
                "desc": "Transferred supplier bidding rate card records to unauthorized external portal",
                "payload": {"vendor_id": "VEND-8841", "record_count": 850}
            },

            # Daniel Okonkwo (High 61%) - Cloud DevOps config modification
            {
                "employee_id": "emp_1006",
                "event_type": "PRIVILEGE_CHANGE",
                "severity": "HIGH",
                "anomaly_category": "UNAUTHORIZED_ACCESS_ATTEMPT",
                "minutes_ago": 190,
                "ip": "10.14.2.91",
                "desc": "Modified AWS IAM policy attachment granting unrestricted S3 Read access to temporary role",
                "payload": {"policy": "AdministratorAccess", "role": "tmp-worker-session"}
            },
            {
                "employee_id": "emp_1006",
                "event_type": "NETWORK_ACTIVITY",
                "severity": "MEDIUM",
                "anomaly_category": "UNUSUAL_LOGIN_TIME",
                "minutes_ago": 280,
                "ip": "10.14.2.91",
                "desc": "Anomalous multi-region VPC peering connection initiated outside standard change window",
                "payload": {"source_vpc": "vpc-prod-us-east-1", "target_vpc": "vpc-dev-eu-west-1"}
            },

            # Sofia Reyes (Medium 45%) - HR records access
            {
                "employee_id": "emp_1007",
                "event_type": "FILE_DOWNLOAD",
                "severity": "MEDIUM",
                "minutes_ago": 230,
                "ip": "10.14.9.15",
                "desc": "Downloaded executive compensation salary benchmarks archive",
                "payload": {"file": "Exec_Comp_2026.xlsx", "size_kb": 480}
            },

            # Ingrid Svenson (Medium 41%)
            {
                "employee_id": "emp_1008",
                "event_type": "DATA_TRANSFER",
                "severity": "MEDIUM",
                "minutes_ago": 340,
                "ip": "10.14.8.55",
                "desc": "Internal share synchronization of departmental budget forecasts",
                "payload": {"share": "\\\\nas-fin01\\forecasts", "files": 12}
            },

            # James Okafor (Medium 38%)
            {
                "employee_id": "emp_1009",
                "event_type": "EMAIL_ACTIVITY",
                "severity": "MEDIUM",
                "minutes_ago": 410,
                "ip": "10.14.11.22",
                "desc": "Forwarded confidential litigation brief to outside counsel without standard DLP tag",
                "payload": {"recipient": "counsel@kirkland-external.com", "subject": "Draft Litigation Strategy"}
            },

            # Kwame Asante (Medium 35%)
            {
                "employee_id": "emp_1010",
                "event_type": "REMOTE_ACCESS",
                "severity": "MEDIUM",
                "minutes_ago": 520,
                "ip": "10.14.5.115",
                "desc": "Remote JupyterLab kernel execution with elevated GPU cluster credentials",
                "payload": {"cluster": "gpu-node-alpha-4", "gpu_util": "98%"}
            },
            {
                "employee_id": "emp_1010",
                "event_type": "APPLICATION_USAGE",
                "severity": "LOW",
                "minutes_ago": 580,
                "ip": "10.14.5.115",
                "desc": "Launched distributed PyTorch training worker container",
                "payload": {"framework": "PyTorch 2.3", "nodes": 4}
            },

            # Mei Zhang (Medium 32%)
            {
                "employee_id": "emp_1011",
                "event_type": "FILE_UPLOAD",
                "severity": "LOW",
                "minutes_ago": 600,
                "ip": "10.14.14.18",
                "desc": "Uploaded Q3 Brand Campaign video assets to corporate Contentful CDN",
                "payload": {"assets": 6, "size_mb": 340}
            },

            # Carlos Mendes (Low 26%)
            {
                "employee_id": "emp_1012",
                "event_type": "APPLICATION_USAGE",
                "severity": "INFO",
                "minutes_ago": 640,
                "ip": "10.14.15.44",
                "desc": "Routine SAP S/4HANA enterprise client launch",
                "payload": {"app": "SAP_GUI_770", "module": "MM_PROCUREMENT"}
            },

            # Noah Brennan (Low 18%)
            {
                "employee_id": "emp_1013",
                "event_type": "FILE_DOWNLOAD",
                "severity": "INFO",
                "minutes_ago": 700,
                "ip": "10.14.18.50",
                "desc": "Downloaded standard customer resolution guidelines PDF",
                "payload": {"file": "CS_KB_Handbook_v3.pdf"}
            },

            # Elena Rostova (Low 15%)
            {
                "employee_id": "emp_1014",
                "event_type": "USB_DEVICE",
                "severity": "INFO",
                "minutes_ago": 750,
                "ip": "10.14.12.10",
                "desc": "Hardware FIDO2 Security Key connected for zero-trust single sign-on",
                "payload": {"device_name": "Yubico YubiKey 5 NFC", "auth": "SUCCESS"}
            },

            # Fatima Al-Rashid (Low 12%)
            {
                "employee_id": "emp_1015",
                "event_type": "NETWORK_ACTIVITY",
                "severity": "INFO",
                "minutes_ago": 800,
                "ip": "10.14.20.14",
                "desc": "Normal shift HTTPS synchronization with corporate inventory ERP",
                "payload": {"bytes_in": 104800, "bytes_out": 22400}
            },

            # Luca Ferrari (Low 8%)
            {
                "employee_id": "emp_1016",
                "event_type": "LOGIN",
                "severity": "INFO",
                "minutes_ago": 880,
                "ip": "10.14.8.77",
                "desc": "Standard Morning check-in and dashboard view",
                "payload": {"auth": "SUCCESS"}
            },

            # Aisha Mensah (Low 5%)
            {
                "employee_id": "emp_1017",
                "event_type": "LOGIN",
                "severity": "INFO",
                "minutes_ago": 920,
                "ip": "10.14.5.130",
                "desc": "Research lab badge-in and workstation session initialization",
                "payload": {"badge_id": "B-49912"}
            }
        ]

        # Add more historical events across the last 7 days to simulate a busy live stream
        event_types_pool = [
            "LOGIN", "FILE_DOWNLOAD", "FILE_UPLOAD", "DATA_TRANSFER",
            "EMAIL_ACTIVITY", "REMOTE_ACCESS", "APPLICATION_USAGE", "USB_DEVICE", "NETWORK_ACTIVITY"
        ]
        severities_pool = ["INFO", "INFO", "LOW", "LOW", "MEDIUM"]

        for emp in employee_data:
            emp_id = emp["id"]
            # Add 8-12 historical events per employee over the past 7 days
            num_extra = random.randint(8, 12)
            for _ in range(num_extra):
                minutes_back = random.randint(1000, 7 * 24 * 60)
                ev_type = random.choice(event_types_pool)
                sev = random.choice(severities_pool) if emp["threat_score"] < 60 else random.choice(["MEDIUM", "HIGH", "CRITICAL"])
                
                # Assign anomaly category for high/critical events
                anom_cat = None
                if sev in ["HIGH", "CRITICAL"]:
                    if ev_type == "LOGIN":
                        anom_cat = "UNUSUAL_LOGIN_TIME"
                    elif ev_type in ["FILE_DOWNLOAD"]:
                        anom_cat = "ABNORMAL_DATA_DOWNLOAD"
                    elif ev_type in ["PRIVILEGE_CHANGE", "REMOTE_ACCESS"]:
                        anom_cat = "UNAUTHORIZED_ACCESS_ATTEMPT"
                    elif ev_type in ["DATA_TRANSFER", "FILE_UPLOAD", "EMAIL_ACTIVITY"]:
                        anom_cat = "EXCESSIVE_FILE_TRANSFER"
                    elif ev_type in ["USB_DEVICE", "NETWORK_ACTIVITY", "APPLICATION_USAGE"]:
                        anom_cat = "SUSPICIOUS_DEVICE_USAGE"

                telemetry_events.append({
                    "employee_id": emp_id,
                    "event_type": ev_type,
                    "severity": sev,
                    "anomaly_category": anom_cat,
                    "minutes_ago": minutes_back,
                    "ip": emp["assets"][0]["ip"],
                    "desc": f"Registered {ev_type.lower().replace('_', ' ')} operational telemetry event",
                    "payload": {
                        "audit_code": f"AUD-{random.randint(10000, 99999)}",
                        "status": "LOGGED",
                        "device_id": emp["assets"][0]["asset_id"]
                    }
                })

        for event in telemetry_events:
            ev_time = now - datetime.timedelta(minutes=event["minutes_ago"])
            tl = TelemetryLog(
                employee_id=event["employee_id"],
                event_type=event["event_type"],
                severity=event["severity"],
                anomaly_category=event.get("anomaly_category"),
                source_ip=event["ip"],
                timestamp=ev_time,
                description=event["desc"],
                payload=event.get("payload")
            )
            db.add(tl)

        db.commit()
        print(f"Successfully seeded {len(users)} users, {len(employee_data)} employees, and {len(telemetry_events)} telemetry logs!")

        # Complete all Milestone 2, Elevation & Milestone 3 enrichments
        backfill_milestone2_data(db, now)
        backfill_elevation_features(db)
        backfill_inbounds_enhancements(db, now)
        backfill_milestone2_round2(db, now)
        backfill_milestone1_2_round3(db, now)
        backfill_milestone1_2_round4(db, now)
        backfill_milestone3_incidents(db, now)
        train_and_evaluate_ml_model(db)
        seed_default_identity_mappings(db)

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        if close_db:
            db.close()


def backfill_milestone2_data(db: Session, now: datetime.datetime):
    """
    Backfills anomaly_category on existing telemetry logs and adds sample events for the
    3 new Milestone 2 event types (APPLICATION_USAGE, USB_DEVICE, NETWORK_ACTIVITY) if missing.
    """
    try:
        # 1. Backfill anomaly categories for unclassified high/critical events
        unclassified_logs = db.query(TelemetryLog).all()
        updated_count = 0
        for log in unclassified_logs:
            if not log.anomaly_category:
                if log.severity in ["HIGH", "CRITICAL"]:
                    if log.event_type == "LOGIN" or "after-hours" in log.description.lower():
                        log.anomaly_category = "UNUSUAL_LOGIN_TIME"
                    elif log.event_type in ["FILE_DOWNLOAD"] or "download" in log.description.lower():
                        log.anomaly_category = "ABNORMAL_DATA_DOWNLOAD"
                    elif log.event_type in ["PRIVILEGE_CHANGE", "REMOTE_ACCESS"] or "privilege" in log.description.lower():
                        log.anomaly_category = "UNAUTHORIZED_ACCESS_ATTEMPT"
                    elif log.event_type in ["DATA_TRANSFER", "FILE_UPLOAD", "EMAIL_ACTIVITY"] or "transfer" in log.description.lower():
                        log.anomaly_category = "EXCESSIVE_FILE_TRANSFER"
                    elif log.event_type in ["USB_DEVICE", "NETWORK_ACTIVITY", "APPLICATION_USAGE"] or "usb" in log.description.lower() or "tunnel" in log.description.lower():
                        log.anomaly_category = "SUSPICIOUS_DEVICE_USAGE"
                    else:
                        log.anomaly_category = "UNAUTHORIZED_ACCESS_ATTEMPT"
                    updated_count += 1

        db.commit()

        # 2. Check if new event types exist; if count of APPLICATION_USAGE is 0, add sample events
        app_count = db.query(TelemetryLog).filter(TelemetryLog.event_type == "APPLICATION_USAGE").count()
        if app_count == 0:
            print("Backfilling sample events for APPLICATION_USAGE, USB_DEVICE, and NETWORK_ACTIVITY...")
            employees = db.query(Employee).all()
            for emp in employees:
                asset = emp.device_assets[0] if emp.device_assets else None
                ip = asset.ip_address if asset else "10.14.8.42"
                
                # Add sample APPLICATION_USAGE event
                is_high_risk = emp.threat_score >= 60
                app_log = TelemetryLog(
                    employee_id=emp.id,
                    event_type="APPLICATION_USAGE",
                    severity="HIGH" if is_high_risk else "INFO",
                    anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT" if is_high_risk else None,
                    source_ip=ip,
                    timestamp=now - datetime.timedelta(hours=random.randint(2, 48)),
                    description="Executed unauthorized packet inspection analyzer" if is_high_risk else "Launched authorized ERP productivity suite",
                    payload={"process_name": "Wireshark.exe" if is_high_risk else "Excel.exe", "status": "LOGGED"}
                )
                db.add(app_log)

                # Add sample USB_DEVICE event
                usb_log = TelemetryLog(
                    employee_id=emp.id,
                    event_type="USB_DEVICE",
                    severity="HIGH" if is_high_risk else "INFO",
                    anomaly_category="SUSPICIOUS_DEVICE_USAGE" if is_high_risk else None,
                    source_ip=ip,
                    timestamp=now - datetime.timedelta(hours=random.randint(4, 72)),
                    description="Unapproved external USB storage volume write detected" if is_high_risk else "Standard encrypted security token authentication",
                    payload={"device_type": "USB Mass Storage" if is_high_risk else "FIDO2 Key", "action": "WRITE_BULK" if is_high_risk else "AUTH_SSO"}
                )
                db.add(usb_log)

                # Add sample NETWORK_ACTIVITY event
                net_log = TelemetryLog(
                    employee_id=emp.id,
                    event_type="NETWORK_ACTIVITY",
                    severity="CRITICAL" if is_high_risk else "LOW",
                    anomaly_category="SUSPICIOUS_DEVICE_USAGE" if is_high_risk else None,
                    source_ip=ip,
                    timestamp=now - datetime.timedelta(hours=random.randint(1, 36)),
                    description="Anomalous outbound encrypted SSH tunnel to external foreign ASN" if is_high_risk else "Routine outbound HTTPS API sync",
                    payload={"remote_port": 4444 if is_high_risk else 443, "protocol": "SSH-2.0" if is_high_risk else "TLSv1.3"}
                )
                db.add(net_log)

            db.commit()
            print("Successfully backfilled Milestone 2 anomaly categories and event types!")

    except Exception as e:
        db.rollback()
        print(f"Error during Milestone 2 backfill: {e}")

def backfill_elevation_features(db: Session = None):
    """
    Backfills schema and benchmark seed data for Elevation Features:
    - SOC Case-Status fields on Employee
    - Investigation Notes thread
    """
    from app.models import InvestigationNote
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True

    try:
        # Check and add columns on employees table
        result = db.execute(text("PRAGMA table_info(employees)"))
        columns = [row[1] for row in result.fetchall()]

        if "vpn_revocation_flagged" not in columns:
            db.execute(text("ALTER TABLE employees ADD COLUMN vpn_revocation_flagged BOOLEAN DEFAULT 0"))
        if "containment_status" not in columns:
            db.execute(text("ALTER TABLE employees ADD COLUMN containment_status VARCHAR(30) DEFAULT 'normal'"))
        if "requires_mfa_reset" not in columns:
            db.execute(text("ALTER TABLE employees ADD COLUMN requires_mfa_reset BOOLEAN DEFAULT 0"))
        if "training_assigned" not in columns:
            db.execute(text("ALTER TABLE employees ADD COLUMN training_assigned BOOLEAN DEFAULT 0"))
        if "training_assigned_date" not in columns:
            db.execute(text("ALTER TABLE employees ADD COLUMN training_assigned_date DATETIME"))
        db.commit()


        # Seed sample investigation notes if empty
        if db.query(InvestigationNote).count() == 0:
            now = datetime.datetime.utcnow()
            sample_notes = [
                InvestigationNote(
                    employee_id="emp_1001",
                    author_email="analyst@ams.internal",
                    author_name="Sarah Lin",
                    author_role="Security Analyst",
                    note_text="Initial alert triage: Off-hours login detected at 02:14 AM from foreign IP 194.26.29.11. Telemetry shows 14.8 GB outbound encrypted tarball dump. Escalating to SOC team.",
                    timestamp=now - datetime.timedelta(hours=6, minutes=30)
                ),
                InvestigationNote(
                    employee_id="emp_1001",
                    author_email="soc@ams.internal",
                    author_name="Alex Mercer",
                    author_role="SOC Engineer",
                    note_text="Case status update: Flagged active VPN sessions for revocation and marked endpoint LAPTOP-SEC-1001 as isolated. Direct manager Marcus Hale notified.",
                    timestamp=now - datetime.timedelta(hours=4, minutes=15)
                ),
                InvestigationNote(
                    employee_id="emp_1001",
                    author_email="manager@ams.internal",
                    author_name="David Vance",
                    author_role="Security Manager",
                    note_text="Governance review complete. Forensic image dump scheduled with IT infrastructure team. Mandatory insider threat compliance retraining assigned.",
                    timestamp=now - datetime.timedelta(hours=1, minutes=45)
                ),
                InvestigationNote(
                    employee_id="emp_1003",
                    author_email="analyst@ams.internal",
                    author_name="Sarah Lin",
                    author_role="Security Analyst",
                    note_text="Reviewed bulk download of 22 GB neural weights repository. Cross-referenced with active sprint deliverables. Awaiting confirmation from R&D Lead.",
                    timestamp=now - datetime.timedelta(hours=8)
                ),
            ]
            db.add_all(sample_notes)
            
            # Set Marcus Hale's initial case status flags for realistic demonstration
            marcus = db.query(Employee).filter(Employee.id == "emp_1001").first()
            if marcus:
                marcus.vpn_revocation_flagged = True
                marcus.containment_status = "isolated"
                marcus.requires_mfa_reset = True
                marcus.training_assigned = True
                marcus.training_assigned_date = now - datetime.timedelta(hours=1, minutes=45)

            db.commit()
            print("Successfully backfilled Elevation Features: SOC Case Status & Investigation Notes!")

    except Exception as e:
        db.rollback()
        print(f"Error during Elevation Features backfill: {e}")
    finally:
        if should_close:
            db.close()

def backfill_inbounds_enhancements(db: Session, now: datetime.datetime):
    """
    Backfills In-Bounds Features:
    1. Access Privileges & Security Entitlements tailored per department for all 16 employees.
    2. Enriched EMAIL_ACTIVITY telemetry events with authentic recipient domain and internal/external flags.
    """
    try:
        employees = db.query(Employee).all()
        dept_privilege_templates = {
            "Finance": [
                {"id": "priv_fin_1", "name": "FINANCE_ERP_ROOT", "level": "Critical", "system_resource": "SAP S/4HANA Finance", "description": "Full general ledger access, journal modifications, and vendor payment authorizations"},
                {"id": "priv_fin_2", "name": "BANKING_SWIFT_PORTAL", "level": "Elevated Admin", "system_resource": "Treasury Gateway", "description": "Dual-control international wire disbursement and balance settlements"},
                {"id": "priv_fin_3", "name": "TAX_FILING_EXPORT", "level": "High Risk", "system_resource": "Corporate Tax Repository", "description": "Bulk export of payroll tax returns and PII schedules"}
            ],
            "IT Infrastructure": [
                {"id": "priv_it_1", "name": "AWS_PROD_CONSOLE", "level": "Elevated Admin", "system_resource": "AWS Multi-Account Core", "description": "Root infrastructure administration and cross-account IAM role assumption"},
                {"id": "priv_it_2", "name": "BASTION_SSH_GATEWAY", "level": "Critical", "system_resource": "Production Jumpbox Cluster", "description": "Direct administrative shell access to core production backend clusters"},
                {"id": "priv_it_3", "name": "VPN_GATEWAY_SUPERVISOR", "level": "High Risk", "system_resource": "WireGuard / OpenVPN Hub", "description": "Tunnel provisioning, network route modification, and firewall rule push"}
            ],
            "Engineering": [
                {"id": "priv_eng_1", "name": "GIT_MAIN_BRANCH_WRITE", "level": "High Risk", "system_resource": "Enterprise GitLab", "description": "Direct branch protection bypass and automated release artifact publishing"},
                {"id": "priv_eng_2", "name": "PROD_K8S_DEPLOY", "level": "Critical", "system_resource": "Production Kubernetes Cluster", "description": "Pod rollout execution, secret injection, and container exec debugging"},
                {"id": "priv_eng_3", "name": "NEURAL_MODEL_REGISTRY", "level": "High Risk", "system_resource": "MLflow / Model Bucket", "description": "Proprietary AI neural weights export and hyperparameter pipeline management"}
            ],
            "R&D": [
                {"id": "priv_rd_1", "name": "GIT_MAIN_BRANCH_WRITE", "level": "High Risk", "system_resource": "Enterprise GitLab", "description": "Direct branch protection bypass and automated release artifact publishing"},
                {"id": "priv_rd_2", "name": "NEURAL_MODEL_REGISTRY", "level": "Critical", "system_resource": "MLflow / Model Bucket", "description": "Proprietary AI neural weights export and hyperparameter pipeline management"},
                {"id": "priv_rd_3", "name": "DATASET_COLLECTION_BUCKET", "level": "Standard", "system_resource": "Object Storage", "description": "Raw uncurated training corpora read/write access"}
            ],
            "Sales & Marketing": [
                {"id": "priv_sales_1", "name": "SALESFORCE_PII_EXPORT", "level": "High Risk", "system_resource": "Salesforce CRM Enterprise", "description": "Enterprise customer contact records, pricing rate cards, and pipeline exports"},
                {"id": "priv_sales_2", "name": "HUBSPOT_CAMPAIGN_ADMIN", "level": "Standard", "system_resource": "Marketing Hub", "description": "Outbound broadcast campaigns and subscriber audience list management"},
                {"id": "priv_sales_3", "name": "ERP_PURCHASE_APPROVAL", "level": "Critical", "system_resource": "Procurement Central", "description": "Vendor bid approvals, purchase order releases up to $250,000 threshold"}
            ],
            "Human Resources": [
                {"id": "priv_hr_1", "name": "WORKDAY_HR_MASTER", "level": "Critical", "system_resource": "Workday HCM Suite", "description": "Employee compensation master files, performance appraisals, and SSN records"},
                {"id": "priv_hr_2", "name": "BACKGROUND_CHECK_VAULT", "level": "High Risk", "system_resource": "Compliance Verification", "description": "Third-party criminal background and credit screening reports"},
                {"id": "priv_hr_3", "name": "OFFICE365_CORP_COLLAB", "level": "Standard", "system_resource": "Microsoft 365 Tenant", "description": "Standard corporate email exchange, SharePoint access, and Teams chat"}
            ],
            "Legal & Compliance": [
                {"id": "priv_legal_1", "name": "LEGAL_DISCOVERY_PORTAL", "level": "Critical", "system_resource": "eDiscovery Vault", "description": "Litigation hold exports, executive email audit archives, and subpoena extracts"},
                {"id": "priv_legal_2", "name": "IP_PATENT_DRAFT_VAULT", "level": "High Risk", "system_resource": "Patent Repository", "description": "Unpublished intellectual property patent applications and trade secrets"},
                {"id": "priv_legal_3", "name": "REGULATORY_FILING_SIGN", "level": "Elevated Admin", "system_resource": "SEC / EDGAR Filing Gateway", "description": "Digital signature authority for statutory regulatory disclosures"}
            ],
            "Operations": [
                {"id": "priv_ops_1", "name": "FACILITIES_ACCESS_CONTROL", "level": "High Risk", "system_resource": "Physical Badge Server", "description": "Data center biometric door access and visitor credential issuance"},
                {"id": "priv_ops_2", "name": "SUPPLY_CHAIN_EDI_BRIDGE", "level": "Standard", "system_resource": "Logistics Dispatch Hub", "description": "Real-time carrier freight dispatch and inventory bill of lading transfers"}
            ]
        }

        # 1. Backfill access_privileges
        for emp in employees:
            if not emp.access_privileges:
                privs = dept_privilege_templates.get(emp.department)
                if not privs:
                    for k in dept_privilege_templates:
                        if k.lower() in emp.department.lower():
                            privs = dept_privilege_templates[k]
                            break
                if not privs:
                    privs = [
                        {"id": f"priv_{emp.id}_1", "name": "ENTERPRISE_SSO_LOGIN", "level": "Standard", "system_resource": "Corporate IdP", "description": "Standard single sign-on access to corporate internal applications"},
                        {"id": f"priv_{emp.id}_2", "name": "DEPT_SHAREPOINT_READ", "level": "Standard", "system_resource": "SharePoint Online", "description": "Departmental documentation read and collaborate permissions"}
                    ]
                emp.access_privileges = privs

        # 2. Enrich existing EMAIL_ACTIVITY logs with recipient metadata
        existing_email_logs = db.query(TelemetryLog).filter(TelemetryLog.event_type == "EMAIL_ACTIVITY").all()
        for elog in existing_email_logs:
            p = dict(elog.payload or {})
            if "is_external" not in p:
                recipient = p.get("recipient", "")
                if "@" in recipient:
                    domain = recipient.split("@")[-1].lower()
                else:
                    domain = "ams.internal" if elog.severity in ["INFO", "LOW"] else "gmail.com"
                    recipient = f"contact@{domain}"
                is_ext = not domain.endswith("ams.internal")
                p["recipient"] = recipient
                p["recipient_domain"] = domain
                p["is_external"] = is_ext
                elog.payload = p

        # 3. Ensure baseline EMAIL_ACTIVITY events exist across all 16 employees
        for emp in employees:
            emp_emails = db.query(TelemetryLog).filter(
                TelemetryLog.employee_id == emp.id,
                TelemetryLog.event_type == "EMAIL_ACTIVITY"
            ).count()

            if emp_emails < 10:
                asset = emp.device_assets[0] if emp.device_assets else None
                ip = asset.ip_address if asset else "10.14.8.42"
                is_high_risk = emp.threat_score >= 60

                # 14 historical emails over 30 days
                for i in range(1, 15):
                    event_time = now - datetime.timedelta(days=random.randint(2, 28), hours=random.randint(1, 12))
                    is_ext = (random.random() < 0.08) if is_high_risk else (random.random() < 0.02)
                    domain = "gmail.com" if is_ext else "ams.internal"
                    recipient = f"external-partner@{domain}" if is_ext else f"team-member@{domain}"
                    db.add(TelemetryLog(
                        employee_id=emp.id,
                        event_type="EMAIL_ACTIVITY",
                        severity="LOW" if not is_ext else "MEDIUM",
                        anomaly_category="EXCESSIVE_FILE_TRANSFER" if is_ext else None,
                        source_ip=ip,
                        timestamp=event_time,
                        description=f"Outbound email communication to {domain}" if is_ext else "Routine internal department status report email",
                        payload={
                            "recipient": recipient,
                            "recipient_domain": domain,
                            "is_external": is_ext,
                            "attachment_count": random.randint(1, 3) if is_ext else 0,
                            "subject": "Commercial Discussion" if is_ext else "Sprint Sync Notes"
                        }
                    ))

                # For high risk employees, add recent 24-hour anomalous external email spikes
                if is_high_risk:
                    for j in range(3):
                        recent_time = now - datetime.timedelta(hours=random.randint(2, 10))
                        db.add(TelemetryLog(
                            employee_id=emp.id,
                            event_type="EMAIL_ACTIVITY",
                            severity="CRITICAL" if emp.threat_score >= 80 else "HIGH",
                            anomaly_category="EXCESSIVE_FILE_TRANSFER",
                            source_ip=ip,
                            timestamp=recent_time,
                            description="Anomalous outbound email with encrypted archive attachment to personal domain",
                            payload={
                                "recipient": f"{emp.full_name.split()[0].lower()}.personal@gmail.com",
                                "recipient_domain": "gmail.com",
                                "is_external": True,
                                "attachment_count": random.randint(4, 12),
                                "subject": "CONFIDENTIAL ARCHIVE - Deliverables"
                            }
                        ))

        db.commit()
        print("Successfully backfilled In-Bounds Features: Access Privileges & Communication Telemetry!")

    except Exception as e:
        db.rollback()
        print(f"Error during In-Bounds Features backfill: {e}")

def backfill_milestone2_round2(db: Session, now: datetime.datetime):
    """
    Backfills Milestone 2 Round 2 requirements:
    1. Realistic APPLICATION_USAGE telemetry events tailored to department roles.
    2. Unsanctioned tool detection events for high-risk employees (Tor Browser, BitTorrent, WinSCP, Mimikatz, Wireshark).
    3. USB_DEVICE telemetry events with device IDs cross-referenced against assigned assets (clean vs. unauthorized).
    """
    try:
        # Check idempotency: if Tor Browser already seeded for emp_1001, skip
        existing_tor = db.query(TelemetryLog).filter(
            TelemetryLog.employee_id == "emp_1001",
            TelemetryLog.event_type == "APPLICATION_USAGE",
            TelemetryLog.description.ilike("%Tor Browser%")
        ).first()

        if existing_tor:
            print("Milestone 2 Round 2 enhancements already seeded. Ensuring all employees have application & USB telemetry...")
            return

        employees = db.query(Employee).all()

        dept_app_templates = {
            "Finance": [
                {"name": "SAP S/4HANA Finance", "process": "saplogon.exe", "category": "ERP Core"},
                {"name": "Microsoft Excel 365", "process": "excel.exe", "category": "Productivity"},
                {"name": "Bloomberg Terminal", "process": "bbg.exe", "category": "Financial Data"},
                {"name": "Microsoft Outlook", "process": "outlook.exe", "category": "Corporate Communication"},
                {"name": "Corporate Slack", "process": "slack.exe", "category": "Collaboration"}
            ],
            "IT Infrastructure": [
                {"name": "AWS CLI / Management Console", "process": "aws.exe", "category": "Cloud Infrastructure"},
                {"name": "Kubectl & Lens Desktop", "process": "lens.exe", "category": "Container Orchestration"},
                {"name": "OpenSSH Client", "process": "ssh.exe", "category": "Secure Shell"},
                {"name": "WireGuard Corporate VPN", "process": "wireguard.exe", "category": "Networking"},
                {"name": "Docker Desktop", "process": "docker.exe", "category": "Virtualization"}
            ],
            "Engineering": [
                {"name": "VS Code", "process": "code.exe", "category": "IDE / Development"},
                {"name": "Terminal / Bash Shell", "process": "bash.exe", "category": "Command Line"},
                {"name": "Docker Desktop", "process": "docker.exe", "category": "Containers"},
                {"name": "Enterprise GitLab Client", "process": "git.exe", "category": "Version Control"},
                {"name": "Postman API Platform", "process": "postman.exe", "category": "API Development"}
            ],
            "R&D": [
                {"name": "PyTorch Distributed Runner", "process": "python.exe", "category": "Neural ML Framework"},
                {"name": "JupyterLab Kernel", "process": "jupyter-lab.exe", "category": "Data Science Notebook"},
                {"name": "VS Code", "process": "code.exe", "category": "IDE / Development"},
                {"name": "Enterprise GitLab Client", "process": "git.exe", "category": "Version Control"},
                {"name": "HuggingFace Hub CLI", "process": "hf.exe", "category": "Model Registry"}
            ],
            "Sales & Marketing": [
                {"name": "Salesforce CRM Enterprise", "process": "salesforce_agent.exe", "category": "CRM System"},
                {"name": "HubSpot Marketing Hub", "process": "chrome.exe", "category": "Inbound Marketing"},
                {"name": "Google Chrome Enterprise", "process": "chrome.exe", "category": "Web Browser"},
                {"name": "Corporate Slack", "process": "slack.exe", "category": "Collaboration"},
                {"name": "Zoom Workplace", "process": "zoom.exe", "category": "Video Conferencing"}
            ],
            "Human Resources": [
                {"name": "Workday HCM Suite", "process": "workday.exe", "category": "HRMS Master"},
                {"name": "DocuSign Enterprise", "process": "docusign.exe", "category": "Digital Signature"},
                {"name": "Microsoft Word 365", "process": "winword.exe", "category": "Document Editor"},
                {"name": "Microsoft Outlook", "process": "outlook.exe", "category": "Corporate Communication"},
                {"name": "SharePoint Online", "process": "msedge.exe", "category": "Internal Intranet"}
            ],
            "Legal & Compliance": [
                {"name": "eDiscovery Legal Vault", "process": "ediscovery.exe", "category": "Litigation Repository"},
                {"name": "Patent Application Portal", "process": "patent_sys.exe", "category": "Intellectual Property"},
                {"name": "Adobe Acrobat Pro DC", "process": "acrobat.exe", "category": "Document Review"},
                {"name": "DocuSign Enterprise", "process": "docusign.exe", "category": "Contract Execution"},
                {"name": "Microsoft Outlook", "process": "outlook.exe", "category": "Corporate Communication"}
            ],
            "Operations": [
                {"name": "Logistics Dispatch EDI", "process": "dispatch.exe", "category": "Supply Chain Dispatch"},
                {"name": "Facilities Access Console", "process": "access_ctrl.exe", "category": "Badge Security"},
                {"name": "SAP ERP Supply Chain", "process": "saplogon.exe", "category": "Inventory Management"},
                {"name": "Microsoft Excel 365", "process": "excel.exe", "category": "Data Analysis"}
            ]
        }

        # 1. Backfill Application Usage for all 16 employees
        for emp in employees:
            dept_apps = dept_app_templates.get(emp.department)
            if not dept_apps:
                for k, v in dept_app_templates.items():
                    if k.lower() in emp.department.lower():
                        dept_apps = v
                        break
            if not dept_apps:
                dept_apps = dept_app_templates["Operations"]

            emp_assets = db.query(DeviceAsset).filter(DeviceAsset.employee_id == emp.id).all()
            primary_ip = emp_assets[0].ip_address if emp_assets else "10.14.8.42"
            primary_asset_id = emp_assets[0].asset_id if emp_assets else f"WS-{emp.department[:3].upper()}-01"

            # Add 8-12 authorized application events spread across the past 28 days
            app_event_count = random.randint(10, 14)
            for idx in range(app_event_count):
                app_info = dept_apps[idx % len(dept_apps)]
                event_time = now - datetime.timedelta(days=random.randint(1, 28), hours=random.randint(8, 18), minutes=random.randint(0, 59))
                db.add(TelemetryLog(
                    employee_id=emp.id,
                    event_type="APPLICATION_USAGE",
                    severity="INFO",
                    source_ip=primary_ip,
                    timestamp=event_time,
                    description=f"Process execution: {app_info['name']} ({app_info['process']}) in authorized user workspace",
                    payload={
                        "app_name": app_info["name"],
                        "process_name": app_info["process"],
                        "category": app_info["category"],
                        "is_unsanctioned": False,
                        "cpu_percent": round(random.uniform(1.5, 18.0), 1),
                        "device_id": primary_asset_id
                    }
                ))

            # 2. Seed Unsanctioned Tools for Elevated Risk Employees (threat score >= 60)
            if emp.threat_score >= 60:
                if emp.id == "emp_1001":  # Marcus Hale
                    db.add(TelemetryLog(
                        employee_id=emp.id,
                        event_type="APPLICATION_USAGE",
                        severity="CRITICAL",
                        anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
                        source_ip=primary_ip,
                        timestamp=now - datetime.timedelta(hours=5),
                        description="Executed unsanctioned anonymized proxy client 'Tor Browser' (tor.exe) bypassing enterprise DNS",
                        payload={
                            "app_name": "Tor Browser",
                            "process_name": "tor.exe",
                            "category": "Anonymized Proxy",
                            "is_unsanctioned": True,
                            "detection_rule": "KNOWN_UNSANCTIONED_TOOLS",
                            "device_id": primary_asset_id
                        }
                    ))
                    db.add(TelemetryLog(
                        employee_id=emp.id,
                        event_type="APPLICATION_USAGE",
                        severity="HIGH",
                        anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
                        source_ip=primary_ip,
                        timestamp=now - datetime.timedelta(hours=14),
                        description="Executed unapproved SFTP file transfer utility 'WinSCP' (winscp.exe) targeting external cloud bastion",
                        payload={
                            "app_name": "WinSCP",
                            "process_name": "winscp.exe",
                            "category": "Bulk SFTP Utility",
                            "is_unsanctioned": True,
                            "detection_rule": "KNOWN_UNSANCTIONED_TOOLS",
                            "device_id": primary_asset_id
                        }
                    ))
                elif emp.id == "emp_1002":  # Priya Nair
                    db.add(TelemetryLog(
                        employee_id=emp.id,
                        event_type="APPLICATION_USAGE",
                        severity="CRITICAL",
                        anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
                        source_ip=primary_ip,
                        timestamp=now - datetime.timedelta(hours=3),
                        description="Executed unauthorized raw packet sniffer 'Wireshark' (wireshark.exe) on Kubernetes cluster internal gateway",
                        payload={
                            "app_name": "Wireshark",
                            "process_name": "wireshark.exe",
                            "category": "Packet Inspection Sniffer",
                            "is_unsanctioned": True,
                            "detection_rule": "KNOWN_UNSANCTIONED_TOOLS",
                            "device_id": primary_asset_id
                        }
                    ))
                    db.add(TelemetryLog(
                        employee_id=emp.id,
                        event_type="APPLICATION_USAGE",
                        severity="CRITICAL",
                        anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
                        source_ip=primary_ip,
                        timestamp=now - datetime.timedelta(hours=9),
                        description="Executed credential harvesting binary 'Mimikatz' (mimikatz_x64.exe) against local LSASS memory",
                        payload={
                            "app_name": "Mimikatz",
                            "process_name": "mimikatz_x64.exe",
                            "category": "Credential Extraction Tool",
                            "is_unsanctioned": True,
                            "detection_rule": "KNOWN_UNSANCTIONED_TOOLS",
                            "device_id": primary_asset_id
                        }
                    ))
                elif emp.id == "emp_1003":  # James Wilson
                    db.add(TelemetryLog(
                        employee_id=emp.id,
                        event_type="APPLICATION_USAGE",
                        severity="HIGH",
                        anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
                        source_ip=primary_ip,
                        timestamp=now - datetime.timedelta(hours=18),
                        description="Executed unauthorized P2P file-sharing client 'BitTorrent Client' (utorrent.exe) on corporate laptop",
                        payload={
                            "app_name": "BitTorrent Client",
                            "process_name": "utorrent.exe",
                            "category": "P2P File Transfer",
                            "is_unsanctioned": True,
                            "detection_rule": "KNOWN_UNSANCTIONED_TOOLS",
                            "device_id": primary_asset_id
                        }
                    ))
                elif emp.id == "emp_1004":  # Daniel Kim
                    db.add(TelemetryLog(
                        employee_id=emp.id,
                        event_type="APPLICATION_USAGE",
                        severity="HIGH",
                        anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
                        source_ip=primary_ip,
                        timestamp=now - datetime.timedelta(hours=22),
                        description="Executed unsanctioned anonymized proxy client 'Tor Browser' (tor.exe)",
                        payload={
                            "app_name": "Tor Browser",
                            "process_name": "tor.exe",
                            "category": "Anonymized Proxy",
                            "is_unsanctioned": True,
                            "detection_rule": "KNOWN_UNSANCTIONED_TOOLS",
                            "device_id": primary_asset_id
                        }
                    ))

            # 3. Backfill USB Device Activity (cross-referenced against assigned assets)
            # Regular employees get authorized USB events referencing their assigned hardware asset ID
            for u_idx in range(2):
                usb_time = now - datetime.timedelta(days=random.randint(2, 25), hours=random.randint(9, 17))
                db.add(TelemetryLog(
                    employee_id=emp.id,
                    event_type="USB_DEVICE",
                    severity="INFO",
                    source_ip=primary_ip,
                    timestamp=usb_time,
                    description=f"Authorized corporate peripheral connected (Hardware ID: {primary_asset_id})",
                    payload={
                        "device_id": primary_asset_id,
                        "device_name": "Corporate Encrypted Hardware Token (YubiKey 5)",
                        "vendor": "Yubico",
                        "status": "AUTHORIZED_ASSET",
                        "is_assigned_asset": True
                    }
                ))

            # For High-Risk Employees (Marcus Hale, Priya Nair): Add unauthorized unrecognized USB device events!
            if emp.threat_score >= 80:
                unauth_hw_id = "USB-STOR-SANDISK-EXT-98412" if emp.id == "emp_1001" else "USB-STORAGE-UNKNOWN-FF09"
                db.add(TelemetryLog(
                    employee_id=emp.id,
                    event_type="USB_DEVICE",
                    severity="CRITICAL",
                    anomaly_category="SUSPICIOUS_DEVICE_USAGE",
                    source_ip=primary_ip,
                    timestamp=now - datetime.timedelta(hours=random.randint(3, 8)),
                    description=f"Unrecognized external USB storage device connected (Hardware ID: {unauth_hw_id}) — not present in assigned asset inventory",
                    payload={
                        "device_id": unauth_hw_id,
                        "device_name": "SanDisk Extreme Pro 1TB High-Speed Flash Volume",
                        "vendor": "SanDisk Corporation",
                        "serial_number": "SD-98412-EX-001",
                        "status": "UNAUTHORIZED_PERIPHERAL",
                        "is_assigned_asset": False,
                        "volume_size_gb": 1024
                    }
                ))

        db.commit()
        print("Successfully backfilled Milestone 2 Round 2: Application Usage & USB Security Telemetry!")

    except Exception as e:
        db.rollback()
        print(f"Error during Milestone 2 Round 2 backfill: {e}")

def backfill_milestone1_2_round3(db: Session, now: datetime.datetime):
    """
    Backfill for Milestone 1 & 2 Round 3 Completion Enhancements:
    1. Feature 1: Remote Access & VPN Sessions with realistic protocols, gateways, client IPs, durations, and anomaly flags.
    2. Feature 2: Distinct FILE_ACCESS logs across department repository scopes with out-of-scope access flags.
    """
    try:
        employees = db.query(Employee).all()
        if not employees:
            return

        file_access_count = db.query(TelemetryLog).filter(TelemetryLog.event_type == "FILE_ACCESS").count()
        if file_access_count >= 80:
            print("Milestone 1 & 2 Round 3 telemetry already backfilled. Skipping.")
            return

        print("Backfilling Milestone 1 & 2 Round 3: Remote Access / VPN Sessions and File Access Repositories...")

        dept_scopes = getattr(settings, "DEPARTMENT_REPOSITORY_SCOPES", {})
        gateways = [
            {"name": "WireGuard Enterprise-GW-01 (US-East)", "proto": "WireGuard UDP/51820", "location": "New York, USA"},
            {"name": "WireGuard Corporate-GW-02 (US-West)", "proto": "WireGuard UDP/51820", "location": "San Francisco, USA"},
            {"name": "OpenVPN-SecureTunnel-01 (EU-Central)", "proto": "OpenVPN TLS/1194", "location": "Frankfurt, Germany"}
        ]

        for emp in employees:
            # 1. Backfill REMOTE_ACCESS logs (15 to 25 sessions over last 30 days)
            asset = db.query(DeviceAsset).filter(DeviceAsset.employee_id == emp.id).first()
            base_ip = asset.ip_address if asset else "10.14.8.42"
            base_octet = base_ip.split(".")[-1] if "." in base_ip else "42"

            gw = gateways[0] if emp.department in ["Finance", "IT Infrastructure", "Legal & Compliance"] else gateways[1]
            client_ip_base = f"198.51.100.{base_octet}"

            for day_offset in range(28, 0, -1):
                if random.random() < 0.65:
                    conn_hour = random.randint(8, 10)
                    conn_min = random.randint(5, 55)
                    session_time = now - datetime.timedelta(days=day_offset, hours=(now.hour - conn_hour), minutes=(now.minute - conn_min))
                    duration_mins = random.randint(180, 480)

                    db.add(TelemetryLog(
                        employee_id=emp.id,
                        event_type="REMOTE_ACCESS",
                        severity="INFO",
                        source_ip=client_ip_base,
                        timestamp=session_time,
                        description=f"Secure tunnel established via {gw['name']} for user {emp.full_name} ({emp.department})",
                        payload={
                            "gateway_name": gw["name"],
                            "protocol": gw["proto"],
                            "client_ip": client_ip_base,
                            "location": gw["location"],
                            "session_duration_mins": duration_mins,
                            "is_anomalous": False
                        }
                    ))

            # 2. Backfill FILE_ACCESS logs (20 to 30 logs over last 30 days)
            shares = dept_scopes.get(emp.department, ["/shares/general", "/shares/docs"])
            for day_offset in range(28, 0, -1):
                accesses_today = random.randint(1, 3)
                for _ in range(accesses_today):
                    share = random.choice(shares)
                    dept_slug = emp.department.lower().replace(" ", "_").replace("&", "and")
                    file_name = f"document_repo_{dept_slug}_{day_offset}.dat"
                    full_path = f"{share}/{file_name}"
                    acc_hour = random.randint(9, 17)
                    acc_time = now - datetime.timedelta(days=day_offset, hours=(now.hour - acc_hour), minutes=random.randint(0, 50))
                    
                    db.add(TelemetryLog(
                        employee_id=emp.id,
                        event_type="FILE_ACCESS",
                        severity="INFO",
                        source_ip=base_ip,
                        timestamp=acc_time,
                        description=f"Accessed departmental file repository '{full_path}' with read permissions",
                        payload={
                            "repository_path": full_path,
                            "target_department": emp.department,
                            "action": "READ",
                            "is_out_of_scope": False,
                            "bytes_read": random.randint(4096, 2048000)
                        }
                    ))

        # 3. Specific Elevated-Risk Anomalies for Marcus Hale (emp_1001)
        # Anomalous VPN Session: Impossible Travel from Bucharest Tor Exit node
        db.add(TelemetryLog(
            employee_id="emp_1001",
            event_type="REMOTE_ACCESS",
            severity="CRITICAL",
            anomaly_category="UNUSUAL_LOGIN_TIME",
            source_ip="194.26.29.112",
            timestamp=now - datetime.timedelta(hours=3, minutes=15),
            description="Remote VPN tunnel established from unmonitored external exit relay in Bucharest, Romania (Impossible travel: previous session in New York, USA 2h ago)",
            payload={
                "gateway_name": "OpenVPN-External-Bypass",
                "protocol": "OpenVPN TLS/1194",
                "client_ip": "194.26.29.112",
                "country": "Romania",
                "city": "Bucharest",
                "session_duration_mins": 42,
                "is_anomalous": True,
                "anomaly_type": "IMPOSSIBLE_TRAVEL",
                "previous_location": "New York, USA",
                "time_delta_hours": 2.25
            }
        ))

        # Out-of-scope file repository accesses for Marcus Hale
        db.add(TelemetryLog(
            employee_id="emp_1001",
            event_type="FILE_ACCESS",
            severity="CRITICAL",
            anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
            source_ip="10.14.8.42",
            timestamp=now - datetime.timedelta(hours=5, minutes=30),
            description="Unauthorized read access to proprietary neural network weights directory '/shares/rd_labs/secret_ai_weights/model_v4_weights.bin' outside Finance departmental scope",
            payload={
                "repository_path": "/shares/rd_labs/secret_ai_weights/model_v4_weights.bin",
                "target_department": "R&D AI Labs",
                "is_out_of_scope": True,
                "action": "READ_RECURSIVE",
                "bytes_read": 1489000000
            }
        ))

        db.add(TelemetryLog(
            employee_id="emp_1001",
            event_type="FILE_ACCESS",
            severity="HIGH",
            anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
            source_ip="10.14.8.42",
            timestamp=now - datetime.timedelta(hours=9, minutes=10),
            description="Access attempt to infrastructure credential store '/shares/it_infra/master_vault_keys/db_core_credentials.kdbx' outside Finance departmental scope",
            payload={
                "repository_path": "/shares/it_infra/master_vault_keys/db_core_credentials.kdbx",
                "target_department": "IT Infrastructure",
                "is_out_of_scope": True,
                "action": "EXPORT",
                "bytes_read": 64200
            }
        ))

        # Specific Elevated-Risk Anomalies for Viktor Reznov (emp_1004)
        db.add(TelemetryLog(
            employee_id="emp_1004",
            event_type="REMOTE_ACCESS",
            severity="HIGH",
            anomaly_category="SUSPICIOUS_DEVICE_USAGE",
            source_ip="185.220.101.5",
            timestamp=now - datetime.timedelta(days=1, hours=2),
            description="Abnormal persistent remote tunnel exceeding 23 hours to non-standard external proxy gateway",
            payload={
                "gateway_name": "Unmonitored-SOCKS5-Tunnel-Relay",
                "protocol": "SOCKS5 Proxy",
                "client_ip": "185.220.101.5",
                "session_duration_mins": 1420,
                "is_anomalous": True,
                "anomaly_type": "PERSISTENT_TUNNEL"
            }
        ))

        db.add(TelemetryLog(
            employee_id="emp_1004",
            event_type="FILE_ACCESS",
            severity="HIGH",
            anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
            source_ip="10.14.5.77",
            timestamp=now - datetime.timedelta(hours=14),
            description="Out-of-scope access to production cloud secrets directory '/shares/cloud_platform/production_secrets/api_production_keys.env' by Enterprise Sales user",
            payload={
                "repository_path": "/shares/cloud_platform/production_secrets/api_production_keys.env",
                "target_department": "Cloud Platform",
                "is_out_of_scope": True,
                "action": "READ",
                "bytes_read": 14500
            }
        ))

        db.commit()
        print("Successfully backfilled Milestone 1 & 2 Round 3: Remote Access & File Access Telemetry!")

    except Exception as e:
        db.rollback()
        print(f"Error during Milestone 1 & 2 Round 3 backfill: {e}")


def backfill_milestone1_2_round4(db: Session, now: datetime.datetime):
    """
    Milestone 1 & 2 Round 4 Seeding:
    1. Check existing NETWORK_ACTIVITY logs. If rich destination port/protocol data is missing,
       seed 20-30 realistic logs per employee with standard destination ports (443/HTTPS, 53/DNS, 445/SMB, 80/HTTP, 22/SSH).
    2. Seed suspicious/non-standard egress port connections for elevated risk employees:
       - Marcus Hale (emp_1001): 9001/Tor-Relay (194.26.29.112), 1080/SOCKS5 (185.220.101.5)
       - Viktor Reznov (emp_1004): 6667/IRC-C2 (198.51.100.44)
    """
    try:
        # Check if Round 4 rich network events already seeded
        rich_network_count = db.query(TelemetryLog).filter(
            TelemetryLog.event_type == "NETWORK_ACTIVITY",
            TelemetryLog.description.like("%Destination port%")
        ).count()

        if rich_network_count >= 200:
            print(f"Milestone 1 & 2 Round 4 network telemetry already seeded ({rich_network_count} logs). Skipping.")
            return

        print("Backfilling Milestone 1 & 2 Round 4: Network Destination Port & Protocol Telemetry...")

        employees = db.query(Employee).all()
        if not employees:
            return

        standard_protocols = [
            {"port": 443, "protocol": "HTTPS", "desc": "Routine outbound TLS web traffic to cloud enterprise portal", "domain": "api.internal-cloud.net", "remote_ip": "104.18.25.10", "weight": 55},
            {"port": 53, "protocol": "DNS", "desc": "Internal DNS query resolution request", "domain": "dns-primary.ams.internal", "remote_ip": "10.14.0.2", "weight": 20},
            {"port": 445, "protocol": "SMB", "desc": "Internal LAN file share synchronization", "domain": "fileserver.ams.internal", "remote_ip": "10.14.1.20", "weight": 12},
            {"port": 80, "protocol": "HTTP", "desc": "Standard unencrypted HTTP internal asset sync", "domain": "repo-mirror.ams.internal", "remote_ip": "192.0.2.88", "weight": 8},
            {"port": 22, "protocol": "SSH", "desc": "Secure shell operational maintenance tunnel", "domain": "bastion.ams.internal", "remote_ip": "10.14.2.15", "weight": 5},
        ]

        net_logs = []

        for emp in employees:
            # Seed 20-30 events per employee over the last 30 days
            event_count = random.randint(22, 32)
            primary_ip = emp.device_assets[0].ip_address if emp.device_assets else "10.14.8.42"


            for i in range(event_count):
                days_ago = random.uniform(0.1, 29.5)
                event_time = now - datetime.timedelta(days=days_ago)

                # Pick protocol by weight
                rnd = random.randint(1, 100)
                cumulative = 0
                chosen = standard_protocols[0]
                for sp in standard_protocols:
                    cumulative += sp["weight"]
                    if rnd <= cumulative:
                        chosen = sp
                        break

                bytes_sent = random.randint(12000, 850000)
                bytes_rcvd = random.randint(25000, 4200000)

                net_logs.append(TelemetryLog(
                    employee_id=emp.id,
                    event_type="NETWORK_ACTIVITY",
                    severity="INFO" if chosen["port"] in [443, 53] else "LOW",
                    anomaly_category=None,
                    source_ip=primary_ip,
                    timestamp=event_time,
                    description=f"{chosen['desc']} (Destination port {chosen['port']}/{chosen['protocol']})",
                    payload={
                        "destination_ip": chosen["remote_ip"],
                        "destination_port": chosen["port"],
                        "protocol": chosen["protocol"],
                        "domain": chosen["domain"],
                        "is_standard": True,
                        "bytes_sent": bytes_sent,
                        "bytes_received": bytes_rcvd,
                    }
                ))

        db.add_all(net_logs)
        db.commit()

        # Seed specific non-standard egress port connections for elevated risk employees
        # 1. Marcus Hale (emp_1001): 9001/Tor-Relay (194.26.29.112)
        db.add(TelemetryLog(
            employee_id="emp_1001",
            event_type="NETWORK_ACTIVITY",
            severity="CRITICAL",
            anomaly_category="SUSPICIOUS_DEVICE_USAGE",
            source_ip="10.14.8.42",
            timestamp=now - datetime.timedelta(days=1, hours=3, minutes=15),
            description="Anomalous outbound encrypted connection on non-standard egress port 9001/Tor-Relay to external IP 194.26.29.112 (Destination port 9001)",
            payload={
                "destination_ip": "194.26.29.112",
                "destination_port": 9001,
                "protocol": "Tor-Relay",
                "is_standard": False,
                "bytes_sent": 84520000,
                "bytes_received": 1204000,
                "threat_intel_tag": "TOR_EXIT_NODE",
                "status": "FLAGGED_ANOMALOUS"
            }
        ))

        # 2. Marcus Hale (emp_1001): 1080/SOCKS5-Proxy (185.220.101.5)
        db.add(TelemetryLog(
            employee_id="emp_1001",
            event_type="NETWORK_ACTIVITY",
            severity="HIGH",
            anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
            source_ip="10.14.8.42",
            timestamp=now - datetime.timedelta(days=3, hours=5, minutes=45),
            description="Outbound unmonitored proxy session on non-standard egress port 1080/SOCKS5 to external IP 185.220.101.5 (Destination port 1080)",
            payload={
                "destination_ip": "185.220.101.5",
                "destination_port": 1080,
                "protocol": "SOCKS5-Proxy",
                "is_standard": False,
                "bytes_sent": 14200000,
                "bytes_received": 520000,
                "threat_intel_tag": "ANONYMIZING_PROXY",
                "status": "FLAGGED_ANOMALOUS"
            }
        ))

        # 3. Viktor Reznov (emp_1004): 6667/IRC-C2 (198.51.100.44)
        db.add(TelemetryLog(
            employee_id="emp_1004",
            event_type="NETWORK_ACTIVITY",
            severity="HIGH",
            anomaly_category="SUSPICIOUS_DEVICE_USAGE",
            source_ip="10.14.12.33",
            timestamp=now - datetime.timedelta(days=2, hours=8),
            description="Suspicious long-lived socket connection on non-standard egress port 6667/IRC to external IP 198.51.100.44 (Destination port 6667)",
            payload={
                "destination_ip": "198.51.100.44",
                "destination_port": 6667,
                "protocol": "IRC-C2",
                "is_standard": False,
                "bytes_sent": 3840000,
                "bytes_received": 192000,
                "threat_intel_tag": "SUSPICIOUS_IRC_EGRESS",
                "status": "FLAGGED_ANOMALOUS"
            }
        ))

        db.commit()
        print("Successfully backfilled Milestone 1 & 2 Round 4: Network Destination Port & Protocol Telemetry!")

    except Exception as e:
        db.rollback()
        print(f"Error during Milestone 1 & 2 Round 4 backfill: {e}")


def backfill_milestone3_incidents(db: Session, now: datetime.datetime):
    """
    Backfills and synchronizes Milestone 3 Alert & Incident Management data:
    1. Seeds four explicit multi-department reference incidents (INC-2026-0001 through INC-2026-0004)
       covering all 4 lifecycle stages (Escalated, Investigating, Open, Resolved) for real existing employees.
    2. Auto-generates tracked incidents for remaining critical/high telemetry logs.
    """

    try:
        ensure_schema_migrated(db)

        users = {u.role: u for u in db.query(User).all()}
        soc_user = users.get("SOC Engineer") or users.get("Security Manager")
        analyst_user = users.get("Security Analyst")
        manager_user = users.get("Security Manager")
        admin_user = users.get("Administrator")

        # -------------------------------------------------------------------------
        # 1. Four Specific Reference Incidents (INC-2026-0001 through INC-2026-0004)
        # -------------------------------------------------------------------------
        ref_specs = [
            {
                "incident_id": "INC-2026-0001",
                "emp_id": "emp_1001", # Marcus Hale (Finance)
                "severity": "CRITICAL",
                "status": "Escalated",
                "cat": "EXCESSIVE_FILE_TRANSFERS",
                "mitre_id": "T1048",
                "mitre_name": "Exfiltration Over Alternative Protocol",
                "title": "Critical Severity Data Exfiltration - Marcus Hale",
                "desc": "Large-volume anomalous data transfer (840 MB) over external SFTP endpoint during non-business hours.",
                "assigned": manager_user or soc_user,
                "created_ago": datetime.timedelta(days=2, hours=14),
                "mtti_min": 15,
                "mttr_hr": None,
                "res_summary": "Case escalated to Tier-2 Security Management for forensic verification, executive review, and endpoint isolation.",
                "notes": [
                    ("Initial triage conducted on INC-2026-0001. Telemetry confirms 840 MB outbound file transfer to unapproved external IP.", datetime.timedelta(days=2, hours=13, minutes=45)),
                    ("Escalated to Security Management. Initiated endpoint quarantine protocol and notified department director.", datetime.timedelta(days=1, hours=8))
                ]
            },
            {
                "incident_id": "INC-2026-0002",
                "emp_id": "emp_1002", # Priya Nair (IT Infrastructure)
                "severity": "HIGH",
                "status": "Investigating",
                "cat": "UNAUTHORIZED_ACCESS_ATTEMPT",
                "mitre_id": "T1098",
                "mitre_name": "Account Manipulation",
                "title": "High Severity Unauthorized Privilege Change - Priya Nair",
                "desc": "Suspicious non-standard network egress and unauthorized elevated privilege modification on production bastion.",
                "assigned": soc_user or analyst_user,
                "created_ago": datetime.timedelta(days=1, hours=6),
                "mtti_min": 22,
                "mttr_hr": None,
                "res_summary": None,
                "notes": [
                    ("Triage in progress on INC-2026-0002. Inspecting bastion SSH authentication logs and egress port binding history.", datetime.timedelta(days=1, hours=5, minutes=38))
                ]
            },
            {
                "incident_id": "INC-2026-0003",
                "emp_id": "emp_1003", # Chen Wei (Research)
                "severity": "MEDIUM",
                "status": "Open",
                "cat": "ABNORMAL_DATA_DOWNLOAD",
                "mitre_id": "T1078",
                "mitre_name": "Valid Accounts",
                "title": "Medium Severity Off-Hours Mass Download - Chen Wei",
                "desc": "Off-hours bulk repository clone and sensitive dataset download (18 files, 420 MB) outside typical baseline.",
                "assigned": analyst_user or None,
                "created_ago": datetime.timedelta(hours=3, minutes=20),
                "mtti_min": None,
                "mttr_hr": None,
                "res_summary": None,
                "notes": []
            },
            {
                "incident_id": "INC-2026-0004",
                "emp_id": "emp_1006", # Daniel Okonkwo (IT Infrastructure)
                "severity": "HIGH",
                "status": "Resolved",
                "cat": "UNAUTHORIZED_ACCESS_ATTEMPT",
                "mitre_id": "T1078",
                "mitre_name": "Valid Accounts",
                "title": "High Severity Cloud DevOps Privilege Escalation - Daniel Okonkwo",
                "desc": "Unscheduled sudo elevation and SSH session to staging cluster gateway.",
                "assigned": soc_user or admin_user,
                "created_ago": datetime.timedelta(days=4, hours=10),
                "mtti_min": 12,
                "mttr_hr": 16.5,
                "res_summary": "Remediation verified. Unscheduled elevated privilege change confirmed with DevOps team lead as an authorized emergency patch deployment. Security baseline restored and closed.",
                "notes": [
                    ("Triage started for INC-2026-0004. Contacting DevOps lead for change ticket validation.", datetime.timedelta(days=4, hours=9, minutes=48)),
                    ("Change ticket CHG-8921 verified. Incident resolved and signed off.", datetime.timedelta(days=3, hours=17, minutes=30))
                ]
            }
        ]

        for spec in ref_specs:
            existing_inc = db.query(Incident).filter(Incident.incident_id == spec["incident_id"]).first()
            emp = db.query(Employee).filter(Employee.id == spec["emp_id"]).first()
            if not emp:
                continue

            created_time = now - spec["created_ago"]
            first_inv = (created_time + datetime.timedelta(minutes=spec["mtti_min"])) if spec["mtti_min"] else None
            resolved_time = (created_time + datetime.timedelta(hours=spec["mttr_hr"])) if spec["mttr_hr"] else None

            # Find matching telemetry log for this employee near this scenario time
            log = db.query(TelemetryLog).filter(
                TelemetryLog.employee_id == spec["emp_id"],
                TelemetryLog.timestamp <= created_time
            ).order_by(TelemetryLog.timestamp.desc()).first()
            if not log:
                log = db.query(TelemetryLog).filter(TelemetryLog.employee_id == spec["emp_id"]).first()
            if log:
                # Ensure trigger log timestamp is just seconds before incident creation
                log.timestamp = created_time - datetime.timedelta(seconds=random.randint(6, 28))

            if existing_inc:
                # Update to match specification
                existing_inc.title = spec["title"]
                existing_inc.description = spec["desc"]
                existing_inc.severity = spec["severity"]
                existing_inc.status = spec["status"]
                existing_inc.employee_id = spec["emp_id"]
                existing_inc.anomaly_category = spec["cat"]
                existing_inc.mitre_technique_id = spec["mitre_id"]
                existing_inc.mitre_technique_name = spec["mitre_name"]
                if spec["assigned"]:
                    existing_inc.assigned_to_user_id = spec["assigned"].id
                    existing_inc.assigned_to_email = spec["assigned"].email
                    existing_inc.assigned_to_name = spec["assigned"].full_name
                    existing_inc.assigned_to_role = spec["assigned"].role
                existing_inc.created_at = created_time
                existing_inc.first_investigated_at = first_inv
                existing_inc.updated_at = resolved_time or first_inv or created_time
                existing_inc.resolved_at = resolved_time
                existing_inc.resolution_summary = spec["res_summary"]
                if log:
                    existing_inc.telemetry_event_id = log.id
            else:
                inc = Incident(
                    incident_id=spec["incident_id"],
                    title=spec["title"],
                    description=spec["desc"],
                    severity=spec["severity"],
                    status=spec["status"],
                    employee_id=spec["emp_id"],
                    telemetry_event_id=log.id if log else None,
                    anomaly_category=spec["cat"],
                    mitre_technique_id=spec["mitre_id"],
                    mitre_technique_name=spec["mitre_name"],
                    assigned_to_user_id=spec["assigned"].id if spec["assigned"] else None,
                    assigned_to_email=spec["assigned"].email if spec["assigned"] else None,
                    assigned_to_name=spec["assigned"].full_name if spec["assigned"] else None,
                    assigned_to_role=spec["assigned"].role if spec["assigned"] else None,
                    created_at=created_time,
                    first_investigated_at=first_inv,
                    updated_at=resolved_time or first_inv or created_time,
                    resolved_at=resolved_time,
                    resolution_summary=spec["res_summary"]
                )
                db.add(inc)
                db.flush()

                # Add attached notes
                for n_text, n_delta in spec["notes"]:
                    db.add(InvestigationNote(
                        employee_id=spec["emp_id"],
                        incident_id=inc.id,
                        author_email=spec["assigned"].email if spec["assigned"] else "soc@ams.internal",
                        author_name=spec["assigned"].full_name if spec["assigned"] else "Nathan Drake",
                        author_role=spec["assigned"].role if spec["assigned"] else "SOC Engineer",
                        note_text=n_text,
                        timestamp=now - n_delta
                    ))

        db.commit()

        # -------------------------------------------------------------------------
        # 2. Consolidated Auto-Generation for Remaining High/Critical Situations (INC-2026-0005+)
        # -------------------------------------------------------------------------
        # Remove any old un-consolidated auto-generated incidents (> INC-2026-0004)
        old_auto_incidents = db.query(Incident).filter(~Incident.incident_id.in_(["INC-2026-0001", "INC-2026-0002", "INC-2026-0003", "INC-2026-0004"])).all()
        for old_inc in old_auto_incidents:
            # Delete attached auto-generated notes
            db.query(InvestigationNote).filter(InvestigationNote.incident_id == old_inc.id).delete()
            db.delete(old_inc)
        db.commit()

        # Primary reference case event IDs to avoid duplicating
        reference_event_ids = {
            inc.telemetry_event_id for inc in db.query(Incident.telemetry_event_id).filter(Incident.telemetry_event_id != None).all()
        }

        critical_high_logs = db.query(TelemetryLog).filter(
            TelemetryLog.severity.in_(["CRITICAL", "HIGH"])
        ).order_by(TelemetryLog.timestamp.asc()).all()

        # Group qualifying events per employee into consolidated situations (48-hour situation window)
        active_emp_incidents = {}
        incident_seq = 5

        for log in critical_high_logs:
            if log.id in reference_event_ids:
                continue

            emp_id = log.employee_id
            active_situation = active_emp_incidents.get(emp_id)

            # Check if there is an active situation within a 48-hour window
            if active_situation and (log.timestamp - active_situation["last_event_time"]) <= datetime.timedelta(hours=48):
                # Consolidate into existing incident: do not spawn a duplicate incident
                active_situation["event_count"] += 1
                active_situation["last_event_time"] = log.timestamp
                active_situation["event_ids"].append(log.id)
                # Escalate severity if this subsequent event is CRITICAL
                if log.severity == "CRITICAL" and active_situation["incident_obj"].severity != "CRITICAL":
                    active_situation["incident_obj"].severity = "CRITICAL"
                continue

            # Otherwise, start a new consolidated incident situation
            emp = db.query(Employee).filter(Employee.id == emp_id).first()
            emp_name = emp.full_name if emp else emp_id
            emp_dept = emp.department if emp else "Unknown"

            mitre_id = "T1078"
            mitre_name = "Valid Accounts"
            if log.anomaly_category and log.anomaly_category in settings.MITRE_MAPPING:
                m_info = settings.MITRE_MAPPING[log.anomaly_category]
                mitre_id = m_info["id"]
                mitre_name = m_info["name"]

            cat_clean = (log.anomaly_category or log.event_type).replace("_", " ").title()
            title = f"{log.severity.title()} Severity Threat Situation - {emp_name} ({cat_clean})"

            mttd_delta_sec = random.randint(3, 40)
            inc_created_at = log.timestamp + datetime.timedelta(seconds=mttd_delta_sec)

            status_index = incident_seq % 4
            if status_index == 0:
                status = "Open"
                assigned_user = random.choice([soc_user, analyst_user, None])
                first_investigated_at = None
                resolved_at = None
                resolution_summary = None
            elif status_index == 1:
                status = "Investigating"
                assigned_user = random.choice([soc_user, analyst_user])
                first_investigated_at = inc_created_at + datetime.timedelta(minutes=random.randint(8, 35))
                resolved_at = None
                resolution_summary = None
            elif status_index == 2:
                status = "Escalated"
                assigned_user = manager_user or soc_user
                first_investigated_at = inc_created_at + datetime.timedelta(minutes=random.randint(10, 45))
                resolved_at = None
                resolution_summary = "Escalated to Tier-2 Security Management for forensic containment and access credential review."
            else:
                status = "Resolved"
                assigned_user = random.choice([soc_user, admin_user, analyst_user])
                first_investigated_at = inc_created_at + datetime.timedelta(minutes=random.randint(5, 25))
                resolved_at = inc_created_at + datetime.timedelta(hours=random.randint(2, 16), minutes=random.randint(5, 45))
                resolution_summary = "Remediation verified. Endpoint access quarantined / security baseline restored / credentials rotated."

            inc_id_str = f"INC-2026-{incident_seq:04d}"

            inc = Incident(
                incident_id=inc_id_str,
                title=title,
                description=f"Consolidated behavioral incident tracking ongoing anomalous security events around source IP {log.source_ip} for {emp_name} ({emp_dept}). Initial trigger: {log.description}",
                severity=log.severity,
                status=status,
                employee_id=emp_id,
                telemetry_event_id=log.id,
                anomaly_category=log.anomaly_category,
                mitre_technique_id=mitre_id,
                mitre_technique_name=mitre_name,
                assigned_to_user_id=assigned_user.id if assigned_user else None,
                assigned_to_email=assigned_user.email if assigned_user else None,
                assigned_to_name=assigned_user.full_name if assigned_user else None,
                assigned_to_role=assigned_user.role if assigned_user else None,
                created_at=inc_created_at,
                first_investigated_at=first_investigated_at,
                updated_at=resolved_at or first_investigated_at or inc_created_at,
                resolved_at=resolved_at,
                resolution_summary=resolution_summary
            )
            db.add(inc)
            db.flush()

            active_emp_incidents[emp_id] = {
                "last_event_time": log.timestamp,
                "event_count": 1,
                "event_ids": [log.id],
                "incident_obj": inc
            }

            if status in ["Investigating", "Escalated", "Resolved"]:
                note_author = assigned_user or soc_user
                if note_author:
                    db.add(InvestigationNote(
                        employee_id=emp_id,
                        incident_id=inc.id,
                        author_email=note_author.email,
                        author_name=note_author.full_name,
                        author_role=note_author.role,
                        note_text=f"Initial triage conducted on {inc.incident_id}. Correlating initial telemetry event and monitoring subsequent employee activity. Anomaly category: {cat_clean}.",
                        timestamp=first_investigated_at or inc_created_at
                    ))

            incident_seq += 1

        db.commit()
        print("Successfully synchronized Milestone 3 Consolidated Multi-Department Seed Incidents!")

    except Exception as e:
        db.rollback()
        print(f"Error during Milestone 3 Incident backfill: {e}")



if __name__ == "__main__":
    seed_database()






