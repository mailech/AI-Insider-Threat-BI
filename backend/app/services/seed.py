from datetime import datetime, timedelta

from backend.app.config import risk_level_for_score
from backend.app.database import get_connection
from backend.app.security import hash_password


def seed_database() -> None:
    with get_connection() as connection:
        user_count = connection.execute("SELECT COUNT(*) AS total FROM users").fetchone()["total"]
        if user_count == 0:
            users = [
                ("Maya Chen", "admin@soc.local", "Admin@12345", "administrator"),
                ("Ravi Menon", "analyst@soc.local", "Analyst@12345", "security_analyst"),
                ("Elena Cruz", "engineer@soc.local", "Engineer@12345", "soc_engineer"),
                ("Noah Patel", "manager@soc.local", "Manager@12345", "security_manager"),
            ]
            connection.executemany(
                """
                INSERT INTO users (full_name, email, password_hash, role)
                VALUES (?, ?, ?, ?)
                """,
                [(name, email, hash_password(password), role) for name, email, password, role in users],
            )

        employee_count = connection.execute("SELECT COUNT(*) AS total FROM employees").fetchone()["total"]
        if employee_count == 0:
            employees = [
                ("EMP-1001", "Anika Shah", "Finance", "Senior Accountant", "Noah Patel", "WIN-FIN-014, managed laptop", "ERP, payroll export, shared finance vault", 78, "under_review"),
                ("EMP-1014", "Jordan Blake", "Engineering", "Platform Engineer", "Maya Chen", "MAC-ENG-221, privileged workstation", "Cloud admin, source repositories, VPN", 66, "active"),
                ("EMP-1022", "Priya Nair", "Human Resources", "HR Business Partner", "Noah Patel", "WIN-HR-044, managed laptop", "HRIS, employee documents", 34, "active"),
                ("EMP-1035", "Victor Lewis", "Sales", "Enterprise Account Executive", "Noah Patel", "WIN-SLS-302, managed laptop", "CRM, contract repository, email exports", 46, "active"),
                ("EMP-1042", "Sara Whitman", "Research", "Data Scientist", "Maya Chen", "LIN-RND-118, GPU workstation", "Model registry, research datasets, S3 read", 88, "under_review"),
                ("EMP-1058", "Daniel Kim", "Operations", "Facilities Lead", "Noah Patel", "WIN-OPS-077, shared kiosk access", "Badge system, vendor portal", 24, "active"),
                ("EMP-1066", "Fatima Noor", "Security", "SOC Analyst", "Maya Chen", "WIN-SOC-019, secured laptop", "SIEM, EDR, ticketing", 30, "active"),
                ("EMP-1081", "Marcus Reed", "Legal", "Compliance Counsel", "Noah Patel", "MAC-LGL-009, managed laptop", "eDiscovery, legal archive", 52, "active"),
            ]
            connection.executemany(
                """
                INSERT INTO employees (
                    employee_id, full_name, department, designation, manager,
                    device_info, access_privileges, risk_score, risk_level, status
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                [
                    (
                        employee_id,
                        full_name,
                        department,
                        designation,
                        manager,
                        device_info,
                        access_privileges,
                        score,
                        risk_level_for_score(score),
                        status,
                    )
                    for employee_id, full_name, department, designation, manager, device_info, access_privileges, score, status in employees
                ],
            )

        activity_count = connection.execute("SELECT COUNT(*) AS total FROM activity_logs").fetchone()["total"]
        if activity_count == 0:
            admin_id = connection.execute("SELECT id FROM users WHERE email = 'admin@soc.local'").fetchone()["id"]
            employee_lookup = {
                row["employee_id"]: row["id"]
                for row in connection.execute("SELECT id, employee_id FROM employees").fetchall()
            }
            batch_cursor = connection.execute(
                """
                INSERT INTO ingestion_batches (source, received_count, accepted_count, submitted_by)
                VALUES ('Seeded Monitoring Feed', 20, 20, ?)
                """,
                (admin_id,),
            )
            batch_id = batch_cursor.lastrowid
            now = datetime.utcnow()
            events = [
                ("EMP-1042", "File Download", "DLP", "Large research archive downloaded outside baseline", "Critical", "s3://research-prod/models", "sara.whitman", "198.51.100.41", 1),
                ("EMP-1001", "Data Transfer", "Proxy", "Payroll export transferred to unapproved storage domain", "High", "finance-share/payroll-q3.csv", "anika.shah", "203.0.113.18", 3),
                ("EMP-1014", "Privilege Change", "Identity Provider", "Temporary cloud admin role activated after hours", "High", "aws-prod-admin", "jordan.blake", "192.0.2.44", 6),
                ("EMP-1035", "Email Activity", "Email Security", "Contract archive sent to external recipient", "Medium", "contracts/enterprise-2026.zip", "victor.lewis", "203.0.113.77", 8),
                ("EMP-1066", "Login Event", "Active Directory", "Successful SOC console login from managed device", "Low", "soc-console", "fatima.noor", "10.10.12.18", 12),
                ("EMP-1022", "File Access", "File Server", "HR personnel document accessed during normal hours", "Informational", "hr-share/personnel", "priya.nair", "10.10.33.20", 14),
                ("EMP-1081", "Remote Access", "VPN", "Remote access session from approved country", "Low", "vpn-gateway-02", "marcus.reed", "198.51.100.22", 18),
                ("EMP-1042", "USB Device", "Endpoint", "Removable device attached to research workstation", "High", "LIN-RND-118", "sara.whitman", "10.10.45.90", 22),
                ("EMP-1001", "Login Event", "Active Directory", "Failed login burst followed by success", "Medium", "WIN-FIN-014", "anika.shah", "10.10.21.14", 26),
                ("EMP-1058", "Application Usage", "Endpoint", "Badge admin portal accessed for scheduled audit", "Low", "badge-admin", "daniel.kim", "10.10.40.11", 32),
                ("EMP-1014", "Source Repository", "Git", "Repository clone volume above peer average", "Medium", "repo/platform-core", "jordan.blake", "10.10.11.51", 37),
                ("EMP-1035", "File Upload", "CASB", "CRM export uploaded to approved partner workspace", "Low", "crm/export-accounts.csv", "victor.lewis", "10.10.51.39", 45),
                ("EMP-1042", "Login Event", "VPN", "Remote login at unusual local time", "High", "vpn-gateway-01", "sara.whitman", "198.51.100.88", 52),
                ("EMP-1081", "File Download", "eDiscovery", "Legal archive downloaded for open case", "Low", "legal/case-2217", "marcus.reed", "10.10.60.21", 58),
                ("EMP-1022", "Email Activity", "Email Security", "Bulk HR notification sent to internal list", "Informational", "mailbox/priya.nair", "priya.nair", "10.10.33.20", 68),
                ("EMP-1066", "Investigation Export", "SIEM", "Alert bundle exported to case folder", "Low", "case/ITBI-12", "fatima.noor", "10.10.12.18", 79),
                ("EMP-1001", "File Download", "DLP", "Finance vault download above user baseline", "High", "finance-share/quarter-close", "anika.shah", "10.10.21.14", 86),
                ("EMP-1014", "Remote Access", "VPN", "Long-running privileged SSH session", "Medium", "prod-build-07", "jordan.blake", "192.0.2.44", 96),
                ("EMP-1058", "Login Event", "Active Directory", "Failed login from retired kiosk", "Medium", "WIN-OPS-031", "daniel.kim", "10.10.41.4", 108),
                ("EMP-1035", "Application Usage", "Proxy", "CRM report download during normal sales cycle", "Informational", "crm/reports", "victor.lewis", "10.10.51.39", 120),
            ]
            connection.executemany(
                """
                INSERT INTO activity_logs (
                    employee_id, event_type, source, description, severity, asset, actor,
                    ip_address, event_time, ingested_by, batch_id, metadata
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}')
                """,
                [
                    (
                        employee_lookup[employee_ref],
                        event_type,
                        source,
                        description,
                        severity,
                        asset,
                        actor,
                        ip_address,
                        (now - timedelta(hours=hours_ago)).strftime("%Y-%m-%d %H:%M:%S"),
                        admin_id,
                        batch_id,
                    )
                    for employee_ref, event_type, source, description, severity, asset, actor, ip_address, hours_ago in events
                ],
            )

        connection.commit()
