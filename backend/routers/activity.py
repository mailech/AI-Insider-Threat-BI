from typing import List, Optional
from fastapi import APIRouter
from models.schemas import ActivityLog
from engines.anomaly_engine import anomaly_engine

router = APIRouter(prefix="/api/v1/activities", tags=["Activity Monitoring"])

ACTIVITIES_DB: List[dict] = [
    {
        "id": "ACT-9001",
        "timestamp": "2026-08-01 02:14:12",
        "employee_id": "EMP-4471",
        "employee_name": "R. Okafor",
        "activity_type": "Remote Access",
        "details": "Logged in from unrecognized VPN endpoint (185.220.101.5)",
        "ip_address": "185.220.101.5",
        "device_id": "FIN-LAPTOP-88",
        "risk_impact": 40.0,
        "is_anomaly": True
    },
    {
        "id": "ACT-9002",
        "timestamp": "2026-08-01 02:19:40",
        "employee_id": "EMP-4471",
        "employee_name": "R. Okafor",
        "activity_type": "File Access",
        "details": "Accessed 3 restricted financial directories /finance/q3_audits",
        "ip_address": "10.4.12.89",
        "device_id": "FIN-LAPTOP-88",
        "risk_impact": 55.0,
        "is_anomaly": True
    },
    {
        "id": "ACT-9003",
        "timestamp": "2026-08-01 02:26:05",
        "employee_id": "EMP-4471",
        "employee_name": "R. Okafor",
        "activity_type": "File Download",
        "details": "Downloaded 1,240 files (312% above baseline volume)",
        "ip_address": "10.4.12.89",
        "device_id": "FIN-LAPTOP-88",
        "risk_impact": 85.0,
        "is_anomaly": True
    },
    {
        "id": "ACT-9004",
        "timestamp": "2026-08-01 02:31:18",
        "employee_id": "EMP-4471",
        "employee_name": "R. Okafor",
        "activity_type": "Data Transfer",
        "details": "Attempted transfer to personal cloud storage megaupload.ext",
        "ip_address": "10.4.12.89",
        "device_id": "FIN-LAPTOP-88",
        "risk_impact": 95.0,
        "is_anomaly": True
    },
    {
        "id": "ACT-9005",
        "timestamp": "2026-08-01 01:02:44",
        "employee_id": "EMP-4468",
        "employee_name": "M. Alavi",
        "activity_type": "Privilege Change",
        "details": "Requested elevated access to prod database master",
        "ip_address": "10.4.14.102",
        "device_id": "ENG-MACBOOK-03",
        "risk_impact": 65.0,
        "is_anomaly": True
    },
    {
        "id": "ACT-9006",
        "timestamp": "2026-08-01 07:50:11",
        "employee_id": "EMP-4452",
        "employee_name": "L. Fontaine",
        "activity_type": "USB Device",
        "details": "Transferred 48 case files to external USB drive Kingston64GB",
        "ip_address": "10.4.30.91",
        "device_id": "LEG-LAPTOP-02",
        "risk_impact": 78.0,
        "is_anomaly": True
    },
    {
        "id": "ACT-9007",
        "timestamp": "2026-08-01 06:02:00",
        "employee_id": "EMP-4448",
        "employee_name": "D. Kowalski",
        "activity_type": "Login",
        "details": "Attempted access to payroll system from sysadmin workstation",
        "ip_address": "10.4.5.11",
        "device_id": "IT-SERVER-ADMIN",
        "risk_impact": 82.0,
        "is_anomaly": True
    },
    {
        "id": "ACT-9008",
        "timestamp": "2026-08-01 10:14:00",
        "employee_id": "EMP-4455",
        "employee_name": "P. Singh",
        "activity_type": "Login",
        "details": "Login from new verified ThinkPad device via 2FA",
        "ip_address": "10.4.22.14",
        "device_id": "HR-THINKPAD-09",
        "risk_impact": 15.0,
        "is_anomaly": False
    }
]

@router.get("", response_model=List[ActivityLog])
def get_activities(
    activity_type: Optional[str] = None,
    employee_id: Optional[str] = None,
    anomalies_only: bool = False
):
    results = ACTIVITIES_DB
    if activity_type and activity_type != "All":
        results = [a for a in results if a["activity_type"].lower() == activity_type.lower()]
    if employee_id:
        results = [a for a in results if a["employee_id"] == employee_id]
    if anomalies_only:
        results = [a for a in results if a["is_anomaly"]]
    return results

@router.post("/ingest", response_model=ActivityLog)
def ingest_activity(log: ActivityLog):
    is_anom, score, reason = anomaly_engine.evaluate_activity({
        "activity_type": log.activity_type,
        "details": log.details,
        "timestamp": log.timestamp
    })
    log_dict = log.dict()
    log_dict["is_anomaly"] = is_anom or log.is_anomaly
    log_dict["risk_impact"] = max(log.risk_impact, score)
    ACTIVITIES_DB.insert(0, log_dict)
    return log_dict
