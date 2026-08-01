from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from models.schemas import Alert, RiskBreakdown, Incident
from engines.risk_engine import calculate_insider_risk_score

router = APIRouter(prefix="/api/v1/alerts", tags=["Alert & Incident Management"])

ALERTS_DB: List[dict] = [
    {
        "id": "INT-4471",
        "user": "R. Okafor",
        "employee_id": "EMP-4471",
        "dept": "Finance",
        "role": "Sr. Accountant",
        "severity": "Critical",
        "score": 91.0,
        "anomaly": "Abnormal data download",
        "time": "6 min ago",
        "status": "Open",
        "assigned_to": "Alex Reyes",
        "breakdown": {"behavioral": 33.0, "privilege": 21.0, "data": 19.0, "access": 9.0, "historical": 9.0},
        "timeline": [
            {"t": "02:14", "e": "Logged in from unrecognized VPN endpoint", "severity": "Medium"},
            {"t": "02:19", "e": "Accessed 3 restricted financial directories", "severity": "High"},
            {"t": "02:26", "e": "Downloaded 1,240 files (312% above baseline)", "severity": "Critical"},
            {"t": "02:31", "e": "Attempted transfer to personal cloud storage", "severity": "Critical"}
        ],
        "evidence_count": 4
    },
    {
        "id": "INT-4468",
        "user": "M. Alavi",
        "employee_id": "EMP-4468",
        "dept": "Engineering",
        "role": "DevOps Lead",
        "severity": "High",
        "score": 74.0,
        "anomaly": "Privilege escalation attempt",
        "time": "22 min ago",
        "status": "Investigating",
        "assigned_to": "Jordan Vance",
        "breakdown": {"behavioral": 24.0, "privilege": 25.0, "data": 12.0, "access": 8.0, "historical": 5.0},
        "timeline": [
            {"t": "01:02", "e": "Requested elevated access to prod database", "severity": "Medium"},
            {"t": "01:05", "e": "Access denied by policy engine", "severity": "High"},
            {"t": "01:07", "e": "Repeated request via service account", "severity": "High"}
        ],
        "evidence_count": 3
    },
    {
        "id": "INT-4460",
        "user": "T. Nakamura",
        "employee_id": "EMP-4460",
        "dept": "Sales",
        "role": "Account Exec",
        "severity": "Medium",
        "score": 52.0,
        "anomaly": "Unusual login time",
        "time": "1 hr ago",
        "status": "Open",
        "assigned_to": None,
        "breakdown": {"behavioral": 20.0, "privilege": 6.0, "data": 10.0, "access": 9.0, "historical": 7.0},
        "timeline": [
            {"t": "23:41", "e": "Login at 11:41 PM, outside normal pattern", "severity": "Medium"},
            {"t": "23:44", "e": "Accessed CRM export tool", "severity": "Low"}
        ],
        "evidence_count": 1
    },
    {
        "id": "INT-4455",
        "user": "P. Singh",
        "employee_id": "EMP-4455",
        "dept": "HR",
        "role": "HR Generalist",
        "severity": "Low",
        "score": 28.0,
        "anomaly": "Device usage deviation",
        "time": "3 hr ago",
        "status": "Resolved",
        "assigned_to": "Alex Reyes",
        "breakdown": {"behavioral": 12.0, "privilege": 3.0, "data": 5.0, "access": 5.0, "historical": 3.0},
        "timeline": [
            {"t": "10:12", "e": "New device registered for account", "severity": "Info"},
            {"t": "10:15", "e": "Verified via MFA — flagged for review only", "severity": "Info"}
        ],
        "evidence_count": 0
    },
    {
        "id": "INT-4452",
        "user": "L. Fontaine",
        "employee_id": "EMP-4452",
        "dept": "Legal",
        "role": "Counsel",
        "severity": "High",
        "score": 79.0,
        "anomaly": "Excessive file transfers",
        "time": "4 hr ago",
        "status": "Open",
        "assigned_to": None,
        "breakdown": {"behavioral": 28.0, "privilege": 15.0, "data": 20.0, "access": 10.0, "historical": 6.0},
        "timeline": [
            {"t": "07:50", "e": "Transferred 48 case files to external drive", "severity": "High"},
            {"t": "07:58", "e": "USB device flagged as unregistered", "severity": "High"}
        ],
        "evidence_count": 2
    },
    {
        "id": "INT-4448",
        "user": "D. Kowalski",
        "employee_id": "EMP-4448",
        "dept": "IT",
        "role": "Sys Admin",
        "severity": "Critical",
        "score": 88.0,
        "anomaly": "Unauthorized access attempt",
        "time": "5 hr ago",
        "status": "Investigating",
        "assigned_to": "Elena Rostova",
        "breakdown": {"behavioral": 30.0, "privilege": 25.0, "data": 15.0, "access": 10.0, "historical": 8.0},
        "timeline": [
            {"t": "06:02", "e": "Attempted access to payroll system", "severity": "High"},
            {"t": "06:04", "e": "Role does not include payroll scope", "severity": "High"},
            {"t": "06:09", "e": "Second attempt via cached credentials", "severity": "Critical"}
        ],
        "evidence_count": 3
    }
]

INCIDENTS_DB: List[dict] = [
    {
        "id": "INC-8801",
        "alert_id": "INT-4471",
        "title": "Unusual Mass Financial Exfiltration - R. Okafor",
        "employee_id": "EMP-4471",
        "employee_name": "R. Okafor",
        "assigned_analyst": "Alex Reyes",
        "severity": "Critical",
        "status": "Under Review",
        "created_at": "2026-08-01 02:35:00",
        "summary": "High-volume zip archive creation containing Q3 audit reports detected during non-working hours.",
        "findings": ["VPN IP originates from proxy range", "File count is 312% over historical baseline", "Attempted upload blocked by cloud DLP"]
    }
]

@router.get("", response_model=List[Alert])
def list_alerts(
    severity: Optional[str] = Query(None, description="Severity filter: Critical, High, Medium, Low, Informational"),
    status: Optional[str] = Query(None, description="Status filter: Open, Investigating, Escalated, Resolved"),
    search: Optional[str] = Query(None, description="Search query")
):
    results = ALERTS_DB
    if severity and severity != "All":
        results = [a for a in results if a["severity"].lower() == severity.lower()]
    if status and status != "All":
        results = [a for a in results if a["status"].lower() == status.lower()]
    if search:
        s = search.lower()
        results = [
            a for a in results
            if s in a["user"].lower() or s in a["id"].lower() or s in a["anomaly"].lower() or s in a["dept"].lower()
        ]
    return results

@router.get("/{alert_id}", response_model=Alert)
def get_alert(alert_id: str):
    for a in ALERTS_DB:
        if a["id"].upper() == alert_id.upper():
            return a
    raise HTTPException(status_code=404, detail="Alert not found")

@router.patch("/{alert_id}/status")
def update_alert_status(alert_id: str, new_status: str, analyst: Optional[str] = None):
    for a in ALERTS_DB:
        if a["id"].upper() == alert_id.upper():
            a["status"] = new_status
            if analyst:
                a["assigned_to"] = analyst
            return {"status": "success", "alert": a}
    raise HTTPException(status_code=404, detail="Alert not found")

@router.post("/{alert_id}/recalculate")
def recalculate_risk_score(
    alert_id: str,
    behavioral: float = 90.0,
    privilege: float = 80.0,
    data: float = 75.0,
    access: float = 60.0,
    historical: float = 50.0
):
    for a in ALERTS_DB:
        if a["id"].upper() == alert_id.upper():
            total, category, breakdown = calculate_insider_risk_score(behavioral, privilege, data, access, historical)
            a["score"] = total
            a["severity"] = category
            a["breakdown"] = breakdown
            return {"status": "recalculated", "new_score": total, "new_severity": category, "breakdown": breakdown}
    raise HTTPException(status_code=404, detail="Alert not found")

@router.get("/incidents/all", response_model=List[Incident])
def get_incidents():
    return INCIDENTS_DB
