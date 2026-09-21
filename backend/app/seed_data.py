import random
from datetime import datetime, timedelta
from app.database import engine, SessionLocal, Base
from app.models import (
    User, UserRole, Employee, ActivityLog, BehavioralProfile,
    AnomalyScore, InsiderRiskScore, ThreatAlert, Incident, Investigation,
    InvestigationTimeline, AuditLog, RiskLevel, AlertSeverity, IncidentStatus, ActivityType
)
from app.auth import get_password_hash
from app.services.ml_service import run_complete_behavioral_intelligence_pipeline

INITIAL_USERS = [
    {
        "email": "analyst@soc.corp",
        "name": "Alex Chen",
        "password": "analyst123",
        "role": UserRole.SECURITY_ANALYST,
        "department": "Security Operations Center"
    },
    {
        "email": "soc@soc.corp",
        "name": "Sarah Connor",
        "password": "soc123",
        "role": UserRole.SOC_ENGINEER,
        "department": "Infrastructure & Threat Intel"
    },
    {
        "email": "manager@soc.corp",
        "name": "David Sterling",
        "password": "manager123",
        "role": UserRole.SECURITY_MANAGER,
        "department": "Cyber Risk & Compliance"
    },
    {
        "email": "admin@soc.corp",
        "name": "System Administrator",
        "password": "admin123",
        "role": UserRole.ADMINISTRATOR,
        "department": "Information Security"
    }
]

SAMPLE_EMPLOYEES = [
    {"id": "EMP-001", "name": "James Wilson", "dept": "Engineering", "role": "Senior Cloud Architect", "manager": "Sarah Connor", "privs": ["AWS Root", "Kubernetes Admin", "Source Git Vault"], "red": False},
    {"id": "EMP-002", "name": "Elena Rostova", "dept": "Finance", "role": "Lead Financial Analyst", "manager": "David Sterling", "privs": ["SAP ERP Financials", "Bank Wire Gateway", "Q4 Ledger View"], "red": False},
    {"id": "EMP-003", "name": "Marcus Vance", "dept": "Human Resources", "role": "HR Generalist", "manager": "James Wilson", "privs": ["Workday HRIS", "Employee PII Records"], "red": False},
    {"id": "EMP-004", "name": "Amina Al-Mansoor", "dept": "IT Administration", "role": "Active Directory Admin", "manager": "Sarah Connor", "privs": ["Domain Admins", "Azure AD Global Admin", "VPN Gateway Config"], "red": False},
    {"id": "EMP-005", "name": "Lucas Meyer", "dept": "Legal & Compliance", "role": "Corporate Counsel", "manager": "David Sterling", "privs": ["Legal Hold Repository", "M&A Strategy Vault", "Board Minutes"], "red": False},
    {"id": "EMP-006", "name": "Priya Sharma", "dept": "Sales & Marketing", "role": "VP Enterprise Sales", "manager": "David Sterling", "privs": ["Salesforce Enterprise", "Global Customer Leads"], "red": False},
    {"id": "EMP-007", "name": "Victor Creed", "dept": "Engineering", "role": "DevOps Engineer", "manager": "James Wilson", "privs": ["Production SSH Keys", "Database Read/Write", "CI/CD Pipeline"], "red": True},
    {"id": "EMP-008", "name": "Olivia Taylor", "dept": "Finance", "role": "Payroll Specialist", "manager": "Elena Rostova", "privs": ["Payroll Direct Deposit", "Tax Filings Database"], "red": False},
    {"id": "EMP-009", "name": "Daniel Kim", "dept": "Engineering", "role": "Frontend Developer", "manager": "James Wilson", "privs": ["Frontend Code Repos", "Figma Design System"], "red": False},
    {"id": "EMP-010", "name": "Sophia Martinez", "dept": "Engineering", "role": "Backend Engineer", "manager": "James Wilson", "privs": ["Payment Service API", "Postgres Read Replica"], "red": False},
    {"id": "EMP-011", "name": "Nathan Drake", "dept": "Sales & Marketing", "role": "Account Executive", "manager": "Priya Sharma", "privs": ["CRM Leads", "Deal Quotes Engine"], "red": False},
    {"id": "EMP-012", "name": "Chloe Frazer", "dept": "IT Administration", "role": "Helpdesk Specialist", "manager": "Amina Al-Mansoor", "privs": ["Password Reset Console", "Asset Inventory"], "red": False},
    {"id": "EMP-013", "name": "Gabriel Thorne", "dept": "Legal & Compliance", "role": "Compliance Auditor", "manager": "Lucas Meyer", "privs": ["SOC2 Evidence Drive", "GDPR Audit Logs"], "red": False},
    {"id": "EMP-014", "name": "Malik Cobb", "dept": "Finance", "role": "Senior Accountant", "manager": "Elena Rostova", "privs": ["Financial Statements", "General Ledger Access", "Bank Export Tool"], "red": True},
    {"id": "EMP-015", "name": "Isabella Rossi", "dept": "Human Resources", "role": "Recruiting Lead", "manager": "Marcus Vance", "privs": ["Greenhouse ATS", "Candidate Resumes"], "red": False},
    {"id": "EMP-016", "name": "Ethan Hunt", "dept": "IT Administration", "role": "Network Specialist", "manager": "Amina Al-Mansoor", "privs": ["Cisco Switch Console", "Firewall Rules Admin"], "red": False},
    {"id": "EMP-017", "name": "Zoe Saldana", "dept": "Engineering", "role": "QA Automation Engineer", "manager": "James Wilson", "privs": ["Test Environments", "Selenium Grid"], "red": False},
    {"id": "EMP-018", "name": "Ryan Gosling", "dept": "Sales & Marketing", "role": "Product Marketing Manager", "manager": "Priya Sharma", "privs": ["Google Analytics 360", "Campaign Assets"], "red": False},
    {"id": "EMP-019", "name": "Hannah Abbott", "dept": "Legal & Compliance", "role": "Privacy Analyst", "manager": "Lucas Meyer", "privs": ["Data Protection Impact Tool", "Vendor Risk Assessments"], "red": False},
    {"id": "EMP-020", "name": "Noah Centineo", "dept": "Engineering", "role": "Site Reliability Engineer", "manager": "James Wilson", "privs": ["Prometheus Grafana", "PagerDuty Admin", "AWS Console"], "red": False},
    {"id": "EMP-021", "name": "Walter White", "dept": "IT Administration", "role": "Senior Database Administrator", "manager": "Amina Al-Mansoor", "privs": ["Production Oracle DB Root", "Encrypted Backup Key", "Audit Log Manager"], "red": True},
    {"id": "EMP-022", "name": "Claire Redfield", "dept": "Finance", "role": "Internal Auditor", "manager": "Elena Rostova", "privs": ["Expense Reporting Tool", "Tax Compliance Portal"], "red": False},
    {"id": "EMP-023", "name": "Leon Kennedy", "dept": "Human Resources", "role": "People Operations Analyst", "manager": "Marcus Vance", "privs": ["Compensation Planning", "Benefits Administration"], "red": False},
    {"id": "EMP-024", "name": "Ada Wong", "dept": "Engineering", "role": "Security Software Engineer", "manager": "James Wilson", "privs": ["AppSec Static Scanner", "HashiCorp Vault Access"], "red": False},
    {"id": "EMP-025", "name": "Arthur Morgan", "dept": "Sales & Marketing", "role": "Customer Success Director", "manager": "Priya Sharma", "privs": ["Zendesk Support Enterprise", "Client Health Dashboard"], "red": False}
]

def seed_database():
    print("Creating database schema...")
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    
    try:
        # 1. Seed Users
        print("Seeding initial SOC users...")
        for u in INITIAL_USERS:
            existing = db.query(User).filter(User.email == u["email"]).first()
            if not existing:
                db_user = User(
                    email=u["email"],
                    name=u["name"],
                    hashed_password=get_password_hash(u["password"]),
                    role=u["role"],
                    department=u["department"],
                    is_active=True
                )
                db.add(db_user)
        db.commit()
        
        # 2. Seed Employees
        print("Seeding enterprise employee roster...")
        for emp_data in SAMPLE_EMPLOYEES:
            existing = db.query(Employee).filter(Employee.employee_id == emp_data["id"]).first()
            if not existing:
                emp = Employee(
                    employee_id=emp_data["id"],
                    name=emp_data["name"],
                    email=f"{emp_data['name'].lower().replace(' ', '.')}@enterprise.corp",
                    department=emp_data["dept"],
                    designation=emp_data["role"],
                    manager=emp_data["manager"],
                    device_info={
                        "laptop": f"CORP-NB-{emp_data['id']}",
                        "mac_address": f"00:1A:2B:3C:{emp_data['id'][-2:]}:FF",
                        "ip_address": f"10.0.4.{int(emp_data['id'].split('-')[1]) + 10}",
                        "approved_usb": [f"usb_corp_{int(emp_data['id'].split('-')[1]) % 5 + 1}"]
                    },
                    access_privileges=emp_data["privs"],
                    status="Active",
                    is_red_team=emp_data["red"],
                    risk_score=78.5 if emp_data["red"] else 15.0,
                    risk_level=RiskLevel.HIGH if emp_data["red"] else RiskLevel.LOW
                )
                db.add(emp)
        db.commit()
        
        # 3. Seed Realistic Activity Logs for All Types
        print("Seeding multi-source activity logs...")
        now = datetime.utcnow()
        for emp_data in SAMPLE_EMPLOYEES:
            emp_id = emp_data["id"]
            is_red = emp_data["red"]
            
            # Login Activity
            db.add(ActivityLog(
                employee_id=emp_id,
                timestamp=now - timedelta(hours=random.randint(1, 12)),
                activity_type=ActivityType.LOGIN,
                action="workstation_login",
                resource="Windows 11 Enterprise SSO",
                details={"auth_method": "SAML_MFA", "session_id": f"sess_{random.randint(1000, 9999)}"},
                ip_address=f"10.0.4.{int(emp_id.split('-')[1]) + 10}",
                is_anomalous=is_red and random.random() < 0.5,
                anomaly_reason="Off-hours login detected" if is_red else None,
                severity=AlertSeverity.MEDIUM if is_red else AlertSeverity.LOW
            ))
            
            # File Activity
            db.add(ActivityLog(
                employee_id=emp_id,
                timestamp=now - timedelta(hours=random.randint(1, 8)),
                activity_type=ActivityType.FILE_ACCESS,
                action="file_read" if not is_red else "mass_file_download",
                resource="customer_records_2026.csv" if is_red else f"project_brief_{emp_id}.docx",
                details={"bytes": 450000000 if is_red else 12500, "operation": "download"},
                ip_address=f"10.0.4.{int(emp_id.split('-')[1]) + 10}",
                is_anomalous=is_red,
                anomaly_reason="Anomalous bulk download of customer database" if is_red else None,
                severity=AlertSeverity.HIGH if is_red else AlertSeverity.LOW
            ))
            
            # USB Activity
            if is_red or random.random() < 0.2:
                db.add(ActivityLog(
                    employee_id=emp_id,
                    timestamp=now - timedelta(hours=random.randint(1, 5)),
                    activity_type=ActivityType.USB_USAGE,
                    action="removable_storage_attached",
                    resource="SanDisk_32GB_Black" if is_red else "Kingston_Corp_Approved",
                    details={"serial": f"SN-{random.randint(100000, 999999)}", "is_whitelisted": not is_red},
                    ip_address=f"10.0.4.{int(emp_id.split('-')[1]) + 10}",
                    is_anomalous=is_red,
                    anomaly_reason="Unapproved removable USB storage connected" if is_red else None,
                    severity=AlertSeverity.HIGH if is_red else AlertSeverity.LOW
                ))
                
            # Email Activity
            db.add(ActivityLog(
                employee_id=emp_id,
                timestamp=now - timedelta(hours=random.randint(1, 6)),
                activity_type=ActivityType.EMAIL,
                action="email_sent",
                resource="smtp://mail.enterprise.corp",
                details={
                    "recipient": "external_vault@protonmail.com" if is_red else "team_lead@enterprise.corp",
                    "subject": "Confidential Database Dump and Credentials" if is_red else "Weekly Team Status",
                    "attachment_count": 2 if is_red else 0
                },
                ip_address=f"10.0.4.{int(emp_id.split('-')[1]) + 10}",
                is_anomalous=is_red,
                anomaly_reason="Email sent to suspicious external domain with keyword flags" if is_red else None,
                severity=AlertSeverity.HIGH if is_red else AlertSeverity.LOW
            ))
            
            # Network Egress Activity
            db.add(ActivityLog(
                employee_id=emp_id,
                timestamp=now - timedelta(hours=random.randint(1, 4)),
                activity_type=ActivityType.NETWORK,
                action="outbound_https_connection",
                resource="185.220.101.5:443" if is_red else "api.github.com:443",
                details={"bytes_out_mb": 1450.0 if is_red else 25.0, "protocol": "TCP/TLS"},
                ip_address=f"10.0.4.{int(emp_id.split('-')[1]) + 10}",
                is_anomalous=is_red,
                anomaly_reason="High volume outbound egress to anonymous proxy node" if is_red else None,
                severity=AlertSeverity.CRITICAL if is_red else AlertSeverity.LOW
            ))
        db.commit()
        
        # 4. Run Complete Behavioral Intelligence & ML Pipeline
        print("Running ML intelligence pipeline (Isolation Forest, One-Class SVM, Autoencoder, NetworkX, PyTorch GNN)...")
        pipeline_res = run_complete_behavioral_intelligence_pipeline(db, num_days=30)
        print(f"ML Pipeline completed: {pipeline_res}")
        
        # 5. Seed Sample Active Incidents & Investigations for Red Team Users
        print("Seeding sample incident investigations...")
        inc1 = Incident(
            incident_id="INC-2026-001",
            title="Critical Data Exfiltration via Removable Storage & External Cloud",
            description="DevOps Engineer EMP-007 (Victor Creed) executed mass file download of confidential source code and customer PII, transferred 1.4GB out via encrypted mega.nz endpoint and unapproved USB drive.",
            severity=AlertSeverity.CRITICAL,
            status=IncidentStatus.INVESTIGATING,
            employee_id="EMP-007",
            assigned_analyst="Alex Chen (Security Analyst)",
            containment_actions=["Revoked AWS Root Credentials", "Isolated Laptop CORP-NB-EMP-007", "Blocked USB storage class policy"],
            root_cause="Compromised credentials or intentional rogue employee exfiltration prior to planned resignation."
        )
        db.add(inc1)
        db.commit()
        
        # Investigation Case
        inv1 = Investigation(
            investigation_id="INV-2026-001",
            incident_id="INC-2026-001",
            employee_id="EMP-007",
            lead_analyst="Alex Chen",
            status="In Progress",
            findings="Forensic review of CORP-NB-EMP-007 confirmed connection of unauthorized SanDisk device serial SANDISK-9941. Network proxy logs correlate with 1.4GB HTTPS POST egress to IP 185.220.101.5 at 02:45 UTC.",
            evidence_items=[
                {"id": 1, "type": "PCAP", "name": "cloud_egress_traffic_185.220.pcap", "hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"},
                {"id": 2, "type": "USB_Registry", "name": "windows_usbstor_keys.reg", "hash": "8f434346648f6b96df89dda901c5176b10a6d83961dd3c1ac88b59b2dc327aa4"},
                {"id": 3, "type": "Email_EML", "name": "credentials_exfiltration_attempt.eml", "hash": "ca978112ca1bbdcafac231b39a23dc4da786eff8147c4e72b9807785afee48bb"}
            ],
            investigator_notes=[
                {"author": "Alex Chen", "timestamp": (now - timedelta(hours=4)).strftime('%Y-%m-%d %H:%M'), "text": "Initiated incident triage. Confirmed anomaly score of 98.2 on Isolation Forest & Autoencoder."},
                {"author": "Sarah Connor", "timestamp": (now - timedelta(hours=2)).strftime('%Y-%m-%d %H:%M'), "text": "Quarantined host via EDR. Preserved memory image and Master File Table ($MFT)."}
            ]
        )
        db.add(inv1)
        db.commit()
        
        # Timeline
        tl_events = [
            {"title": "Off-Hours VPN Login from Unknown IP", "type": "Remote Access", "sev": AlertSeverity.HIGH, "details": "EMP-007 logged in at 02:14 AM from residential VPN proxy 198.51.100.44."},
            {"title": "Unauthorized Sudo Elevation", "type": "Privilege Abuse", "sev": AlertSeverity.CRITICAL, "details": "Executed privilege escalation command 'chmod 777 /etc/shadow'."},
            {"title": "Bulk PII Customer Dump Access", "type": "Data Violation", "sev": AlertSeverity.CRITICAL, "details": "450MB customer_records_2026.csv downloaded from finance repository."},
            {"title": "USB Storage Plugged & Data Copied", "type": "Hardware Violation", "sev": AlertSeverity.HIGH, "details": "SanDisk 32GB device connected; 48 source repositories copied to E:\\backup."},
            {"title": "External Encrypted Cloud Upload", "type": "Data Exfiltration", "sev": AlertSeverity.CRITICAL, "details": "1.4GB uploaded to 185.220.101.5 over port 443."}
        ]
        for idx, t in enumerate(tl_events):
            db.add(InvestigationTimeline(
                investigation_id="INV-2026-001",
                timestamp=now - timedelta(hours=5 - idx),
                event_title=t["title"],
                event_type=t["type"],
                severity=t["sev"],
                details=t["details"]
            ))
        db.commit()
        
        print("Database seed complete!")
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
