import http.server
import socketserver
import json
import urllib.parse
import csv
import io
import datetime
from config import get_risk_category, RISK_WEIGHTS

PORT = 8000

# Mock DB Data
USERS_DB = {
    "analyst": {"id": "USR-001", "username": "analyst", "password": "password123", "name": "Alex Reyes", "email": "a.reyes@aegis-security.io", "role": "Security Analyst", "department": "SOC Operations"},
    "soc_eng": {"id": "USR-002", "username": "soc_eng", "password": "password123", "name": "Jordan Vance", "email": "j.vance@aegis-security.io", "role": "SOC Engineer", "department": "Cyber Defense"},
    "manager": {"id": "USR-003", "username": "manager", "password": "password123", "name": "Elena Rostova", "email": "e.rostova@aegis-security.io", "role": "Security Manager", "department": "Enterprise Risk"},
    "admin": {"id": "USR-004", "username": "admin", "password": "password123", "name": "Marcus Vance", "email": "m.vance@aegis-security.io", "role": "Administrator", "department": "IT Governance"}
}

EMPLOYEES_DB = [
    {"id": "EMP-101", "employee_id": "EMP-4471", "name": "R. Okafor", "department": "Finance", "designation": "Sr. Accountant", "manager": "S. Jenkins", "email": "r.okafor@company.com", "device_info": {"hostname": "FIN-LAPTOP-88", "os": "Windows 11 Enterprise", "ip": "10.4.12.89"}, "access_privileges": ["SAP Financials", "Swift Payment Gateway", "Payroll Viewer"], "risk_score": 91.0, "risk_category": "Critical", "status": "Active"},
    {"id": "EMP-102", "employee_id": "EMP-4468", "name": "M. Alavi", "department": "Engineering", "designation": "DevOps Lead", "manager": "D. Sterling", "email": "m.alavi@company.com", "device_info": {"hostname": "ENG-MACBOOK-03", "os": "macOS Sonoma", "ip": "10.4.14.102"}, "access_privileges": ["AWS Master Console", "Kubernetes Production Cluster", "GitHub Admin"], "risk_score": 74.0, "risk_category": "High", "status": "Active"},
    {"id": "EMP-103", "employee_id": "EMP-4460", "name": "T. Nakamura", "department": "Sales", "designation": "Account Exec", "manager": "K. Adams", "email": "t.nakamura@company.com", "device_info": {"hostname": "SALES-DELL-12", "os": "Windows 11 Pro", "ip": "10.4.18.55"}, "access_privileges": ["Salesforce CRM", "HubSpot", "Client Contact DB"], "risk_score": 52.0, "risk_category": "Medium", "status": "Active"},
    {"id": "EMP-104", "employee_id": "EMP-4455", "name": "P. Singh", "department": "HR", "designation": "HR Generalist", "manager": "V. Vance", "email": "p.singh@company.com", "device_info": {"hostname": "HR-THINKPAD-09", "os": "Windows 11 Pro", "ip": "10.4.22.14"}, "access_privileges": ["Workday HR portal", "Employee File Storage"], "risk_score": 28.0, "risk_category": "Low", "status": "Active"},
    {"id": "EMP-105", "employee_id": "EMP-4452", "name": "L. Fontaine", "department": "Legal", "designation": "Counsel", "manager": "M. Sterling", "email": "l.fontaine@company.com", "device_info": {"hostname": "LEG-LAPTOP-02", "os": "macOS Ventura", "ip": "10.4.30.91"}, "access_privileges": ["Litigation Vault", "IP Repository", "Executive Contracts"], "risk_score": 79.0, "risk_category": "High", "status": "Active"},
    {"id": "EMP-106", "employee_id": "EMP-4448", "name": "D. Kowalski", "department": "IT", "designation": "Sys Admin", "manager": "C. Miller", "email": "d.kowalski@company.com", "device_info": {"hostname": "IT-SERVER-ADMIN", "os": "Ubuntu 22.04 LTS", "ip": "10.4.5.11"}, "access_privileges": ["Active Directory Admin", "Domain Controller", "Network Switch CLI"], "risk_score": 88.0, "risk_category": "Critical", "status": "Active"}
]

ACTIVITIES_DB = [
    {"id": "ACT-9001", "timestamp": "2026-08-01 02:14:12", "employee_id": "EMP-4471", "employee_name": "R. Okafor", "activity_type": "Remote Access", "details": "Logged in from unrecognized VPN endpoint (185.220.101.5)", "ip_address": "185.220.101.5", "device_id": "FIN-LAPTOP-88", "risk_impact": 40.0, "is_anomaly": True},
    {"id": "ACT-9002", "timestamp": "2026-08-01 02:19:40", "employee_id": "EMP-4471", "employee_name": "R. Okafor", "activity_type": "File Access", "details": "Accessed 3 restricted financial directories /finance/q3_audits", "ip_address": "10.4.12.89", "device_id": "FIN-LAPTOP-88", "risk_impact": 55.0, "is_anomaly": True},
    {"id": "ACT-9003", "timestamp": "2026-08-01 02:26:05", "employee_id": "EMP-4471", "employee_name": "R. Okafor", "activity_type": "File Download", "details": "Downloaded 1,240 files (312% above baseline volume)", "ip_address": "10.4.12.89", "device_id": "FIN-LAPTOP-88", "risk_impact": 85.0, "is_anomaly": True},
    {"id": "ACT-9004", "timestamp": "2026-08-01 02:31:18", "employee_id": "EMP-4471", "employee_name": "R. Okafor", "activity_type": "Data Transfer", "details": "Attempted transfer to personal cloud storage megaupload.ext", "ip_address": "10.4.12.89", "device_id": "FIN-LAPTOP-88", "risk_impact": 95.0, "is_anomaly": True},
    {"id": "ACT-9005", "timestamp": "2026-08-01 01:02:44", "employee_id": "EMP-4468", "employee_name": "M. Alavi", "activity_type": "Privilege Change", "details": "Requested elevated access to prod database master", "ip_address": "10.4.14.102", "device_id": "ENG-MACBOOK-03", "risk_impact": 65.0, "is_anomaly": True},
    {"id": "ACT-9006", "timestamp": "2026-08-01 07:50:11", "employee_id": "EMP-4452", "employee_name": "L. Fontaine", "activity_type": "USB Device", "details": "Transferred 48 case files to external USB drive Kingston64GB", "ip_address": "10.4.30.91", "device_id": "LEG-LAPTOP-02", "risk_impact": 78.0, "is_anomaly": True},
    {"id": "ACT-9007", "timestamp": "2026-08-01 06:02:00", "employee_id": "EMP-4448", "employee_name": "D. Kowalski", "activity_type": "Login", "details": "Attempted access to payroll system from sysadmin workstation", "ip_address": "10.4.5.11", "device_id": "IT-SERVER-ADMIN", "risk_impact": 82.0, "is_anomaly": True},
    {"id": "ACT-9008", "timestamp": "2026-08-01 10:14:00", "employee_id": "EMP-4455", "employee_name": "P. Singh", "activity_type": "Login", "details": "Login from new verified ThinkPad device via 2FA", "ip_address": "10.4.22.14", "device_id": "HR-THINKPAD-09", "risk_impact": 15.0, "is_anomaly": False}
]

ALERTS_DB = [
    {"id": "INT-4471", "user": "R. Okafor", "employee_id": "EMP-4471", "dept": "Finance", "role": "Sr. Accountant", "severity": "Critical", "score": 91.0, "anomaly": "Abnormal data download", "time": "6 min ago", "status": "Open", "assigned_to": "Alex Reyes", "breakdown": {"behavioral": 33.0, "privilege": 21.0, "data": 19.0, "access": 9.0, "historical": 9.0}, "timeline": [{"t": "02:14", "e": "Logged in from unrecognized VPN endpoint", "severity": "Medium"}, {"t": "02:19", "e": "Accessed 3 restricted financial directories", "severity": "High"}, {"t": "02:26", "e": "Downloaded 1,240 files (312% above baseline)", "severity": "Critical"}, {"t": "02:31", "e": "Attempted transfer to personal cloud storage", "severity": "Critical"}], "evidence_count": 4},
    {"id": "INT-4468", "user": "M. Alavi", "employee_id": "EMP-4468", "dept": "Engineering", "role": "DevOps Lead", "severity": "High", "score": 74.0, "anomaly": "Privilege escalation attempt", "time": "22 min ago", "status": "Investigating", "assigned_to": "Jordan Vance", "breakdown": {"behavioral": 24.0, "privilege": 25.0, "data": 12.0, "access": 8.0, "historical": 5.0}, "timeline": [{"t": "01:02", "e": "Requested elevated access to prod database", "severity": "Medium"}, {"t": "01:05", "e": "Access denied by policy engine", "severity": "High"}, {"t": "01:07", "e": "Repeated request via service account", "severity": "High"}], "evidence_count": 3},
    {"id": "INT-4460", "user": "T. Nakamura", "employee_id": "EMP-4460", "dept": "Sales", "role": "Account Exec", "severity": "Medium", "score": 52.0, "anomaly": "Unusual login time", "time": "1 hr ago", "status": "Open", "assigned_to": None, "breakdown": {"behavioral": 20.0, "privilege": 6.0, "data": 10.0, "access": 9.0, "historical": 7.0}, "timeline": [{"t": "23:41", "e": "Login at 11:41 PM, outside normal pattern", "severity": "Medium"}, {"t": "23:44", "e": "Accessed CRM export tool", "severity": "Low"}], "evidence_count": 1},
    {"id": "INT-4455", "user": "P. Singh", "employee_id": "EMP-4455", "dept": "HR", "role": "HR Generalist", "severity": "Low", "score": 28.0, "anomaly": "Device usage deviation", "time": "3 hr ago", "status": "Resolved", "assigned_to": "Alex Reyes", "breakdown": {"behavioral": 12.0, "privilege": 3.0, "data": 5.0, "access": 5.0, "historical": 3.0}, "timeline": [{"t": "10:12", "e": "New device registered for account", "severity": "Info"}, {"t": "10:15", "e": "Verified via MFA — flagged for review only", "severity": "Info"}], "evidence_count": 0},
    {"id": "INT-4452", "user": "L. Fontaine", "employee_id": "EMP-4452", "dept": "Legal", "role": "Counsel", "severity": "High", "score": 79.0, "anomaly": "Excessive file transfers", "time": "4 hr ago", "status": "Open", "assigned_to": None, "breakdown": {"behavioral": 28.0, "privilege": 15.0, "data": 20.0, "access": 10.0, "historical": 6.0}, "timeline": [{"t": "07:50", "e": "Transferred 48 case files to external drive", "severity": "High"}, {"t": "07:58", "e": "USB device flagged as unregistered", "severity": "High"}], "evidence_count": 2},
    {"id": "INT-4448", "user": "D. Kowalski", "employee_id": "EMP-4448", "dept": "IT", "role": "Sys Admin", "severity": "Critical", "score": 88.0, "anomaly": "Unauthorized access attempt", "time": "5 hr ago", "status": "Investigating", "assigned_to": "Elena Rostova", "breakdown": {"behavioral": 30.0, "privilege": 25.0, "data": 15.0, "access": 10.0, "historical": 8.0}, "timeline": [{"t": "06:02", "e": "Attempted access to payroll system", "severity": "High"}, {"t": "06:04", "e": "Role does not include payroll scope", "severity": "High"}, {"t": "06:09", "e": "Second attempt via cached credentials", "severity": "Critical"}], "evidence_count": 3}
]

class RequestHandler(http.server.BaseHTTPRequestHandler):
    def _send_cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")

    def do_OPTIONS(self):
        self.send_response(200)
        self._send_cors()
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        if path in ["/", "/api/v1/health"]:
            self._send_json({
                "status": "healthy",
                "system": "AEGIS Insider Threat Behavioral Intelligence System",
                "version": "1.0.0",
                "engines": {"risk_scoring_engine": "online", "anomaly_engine": "online", "ueba_analytics": "online"}
            })
            return

        if path == "/api/v1/auth/me":
            user = USERS_DB.get(params.get("username", ["analyst"])[0], USERS_DB["analyst"])
            self._send_json(user)
            return

        if path == "/api/v1/employees":
            self._send_json(EMPLOYEES_DB)
            return

        if path == "/api/v1/activities":
            self._send_json(ACTIVITIES_DB)
            return

        if path == "/api/v1/alerts":
            sev = params.get("severity", ["All"])[0]
            st = params.get("status", ["All"])[0]
            res = ALERTS_DB
            if sev != "All":
                res = [a for a in res if a["severity"].lower() == sev.lower()]
            if st != "All":
                res = [a for a in res if a["status"].lower() == st.lower()]
            self._send_json(res)
            return

        if path == "/api/v1/dashboards/analyst":
            self._send_json({
                "open_alerts": len([a for a in ALERTS_DB if a["status"] in ["Open", "Investigating"]]),
                "critical_risk_users": len([a for a in ALERTS_DB if a["severity"] == "Critical"]),
                "mean_time_to_detect": "4.2m",
                "active_investigations": len([a for a in ALERTS_DB if a["status"] == "Investigating"]),
                "recent_alerts": ALERTS_DB
            })
            return

        if path == "/api/v1/dashboards/soc":
            self._send_json({
                "total_events_today": 142850,
                "anomalies_flagged": len([a for a in ACTIVITIES_DB if a["is_anomaly"]]),
                "active_threat_level": "ELEVATED (LEVEL 3)",
                "investigations_in_flight": 3,
                "live_event_stream": ACTIVITIES_DB
            })
            return

        if path == "/api/v1/dashboards/manager":
            self._send_json({
                "org_risk_score": 77.2,
                "high_risk_dept_count": 2,
                "compliance_score_percent": 94.5,
                "risk_trend_labels": ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
                "risk_trend_scores": [62.0, 58.5, 65.0, 71.0, 68.0, 74.0, 77.2],
                "department_risks": {"Finance": 82.5, "IT Administration": 78.0, "Engineering": 64.0, "Legal": 59.0, "Sales": 45.0, "Human Resources": 28.0}
            })
            return

        if path == "/api/v1/dashboards/admin":
            self._send_json({
                "total_users": 42,
                "active_sessions": 14,
                "log_ingestion_rate_eps": 1250,
                "system_health_status": "99.98% Operational",
                "audit_logs": [
                    {"id": "AUD-101", "time": "2026-08-01 18:10:02", "actor": "admin", "action": "Updated Risk Weights", "ip": "10.4.1.20"},
                    {"id": "AUD-102", "time": "2026-08-01 17:45:18", "actor": "analyst", "action": "Escalated Alert INT-4471", "ip": "10.4.12.89"}
                ]
            })
            return

        if path == "/api/v1/reports/export/csv":
            output = io.StringIO()
            writer = csv.writer(output)
            writer.writerow(["Alert ID", "Employee", "Department", "Role", "Severity", "Risk Score", "Anomaly", "Status", "Assigned To"])
            for a in ALERTS_DB:
                writer.writerow([a["id"], a["user"], a["dept"], a["role"], a["severity"], a["score"], a["anomaly"], a["status"], a.get("assigned_to", "")])
            
            content = output.getvalue().encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/csv")
            self.send_header("Content-Disposition", "attachment; filename=aegis_insider_threat_report.csv")
            self._send_cors()
            self.end_headers()
            self.wfile.write(content)
            return

        self._send_json({"error": "Not Found"}, status=404)

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/v1/auth/login":
            length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(length) if length > 0 else b"{}"
            data = json.loads(body.decode("utf-8"))
            un = data.get("username", "analyst")
            user = USERS_DB.get(un, USERS_DB["analyst"])
            self._send_json({
                "access_token": f"token_{user['username']}",
                "token_type": "bearer",
                "user_id": user["id"],
                "username": user["username"],
                "role": user["role"],
                "name": user["name"]
            })
            return

        self._send_json({"status": "ok"})

    def _send_json(self, data, status=200):
        content = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self._send_cors()
        self.end_headers()
        self.wfile.write(content)

print(f"AEGIS Insider Threat API Server running on port {PORT}...")
with socketserver.TCPServer(("", PORT), RequestHandler) as httpd:
    httpd.serve_forever()
