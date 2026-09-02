import os
import sys
import csv
import io
from fastapi import APIRouter
from fastapi.responses import Response

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from routers.alerts import ALERTS_DB

router = APIRouter(prefix="/api/v1/reports", tags=["Reports & Export System"])

@router.get("/export/csv")
def export_csv_report():
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Alert ID", "Employee", "Department", "Role", "Severity", "Risk Score", "Anomaly", "Status", "Assigned To"])
    for a in ALERTS_DB:
        writer.writerow([
            a["id"], a["user"], a["dept"], a["role"], a["severity"], a["score"], a["anomaly"], a["status"], a.get("assigned_to", "Unassigned")
        ])
    
    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=aegis_insider_threat_report.csv"}
    )

@router.get("/export/summary")
def get_report_summary():
    return {
        "title": "AEGIS Insider Threat Executive Intelligence Report",
        "generated_at": "2026-08-01 18:30:00 EST",
        "total_alerts": len(ALERTS_DB),
        "critical_threats": len([a for a in ALERTS_DB if a["severity"] == "Critical"]),
        "high_threats": len([a for a in ALERTS_DB if a["severity"] == "High"]),
        "resolved_alerts": len([a for a in ALERTS_DB if a["status"] == "Resolved"]),
        "compliance_status": "ISO 27001 & NIST SP 800-53 Compliant",
        "alerts": ALERTS_DB
    }
