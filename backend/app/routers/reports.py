from datetime import datetime
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee, ThreatAlert, Incident, Investigation, ActivityLog, User, RiskLevel
from app.auth import get_current_user
from app.services.report_service import generate_csv_report, generate_excel_report, generate_pdf_report

router = APIRouter(prefix="/reports", tags=["Reports & Export System"])

@router.get("/threat/csv")
def export_threat_report_csv(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alerts = db.query(ThreatAlert).order_by(ThreatAlert.timestamp.desc()).all()
    data = [
        {
            "Alert ID": a.alert_id,
            "Timestamp": a.timestamp.isoformat(),
            "Employee ID": a.employee_id,
            "Title": a.title,
            "Severity": a.severity.value,
            "Status": a.status,
            "Anomaly Score": a.anomaly_score,
            "Risk Score": a.risk_score
        }
        for a in alerts
    ]
    csv_content = generate_csv_report(data, list(data[0].keys()) if data else ["Alert ID"])
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=threat_alerts_{datetime.utcnow().strftime('%Y%m%d')}.csv"}
    )

@router.get("/threat/excel")
def export_threat_report_excel(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    alerts = db.query(ThreatAlert).all()
    incidents = db.query(Incident).all()
    
    alert_rows = [
        {"Alert ID": a.alert_id, "Employee ID": a.employee_id, "Title": a.title, "Severity": a.severity.value, "Status": a.status, "Anomaly Score": a.anomaly_score}
        for a in alerts
    ]
    inc_rows = [
        {"Incident ID": i.incident_id, "Employee ID": i.employee_id, "Title": i.title, "Severity": i.severity.value, "Status": i.status.value, "Assigned Analyst": i.assigned_analyst}
        for i in incidents
    ]
    
    excel_bytes = generate_excel_report(
        "SOC Threat and Incident Intelligence Report",
        {"Threat Alerts": alert_rows, "Incidents": inc_rows}
    )
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=soc_threat_report_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"}
    )

@router.get("/threat/pdf")
def export_threat_report_pdf(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    total_emps = db.query(Employee).count()
    critical_emps = db.query(Employee).filter(Employee.risk_level == RiskLevel.CRITICAL).count()
    high_emps = db.query(Employee).filter(Employee.risk_level == RiskLevel.HIGH).count()
    total_alerts = db.query(ThreatAlert).count()
    open_incidents = db.query(Incident).count()
    
    summary = {
        "Total Monitored Identities": total_emps,
        "Critical Threat Entities": critical_emps,
        "High Threat Entities": high_emps,
        "Active Threat Alerts": total_alerts,
        "Open Incidents": open_incidents
    }
    
    alerts = db.query(ThreatAlert).order_by(ThreatAlert.timestamp.desc()).limit(15).all()
    table_data = [["Alert ID", "Employee", "Severity", "Anomaly", "Status"]]
    for a in alerts:
        table_data.append([a.alert_id[:16], a.employee_id, a.severity.value, f"{a.anomaly_score:.1f}", a.status])
        
    pdf_bytes = generate_pdf_report(
        report_title="AI Insider Threat Behavioral Intelligence Report",
        subtitle="Confidential Security Operations Center Summary",
        summary_stats=summary,
        table_data=table_data
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=insider_threat_report_{datetime.utcnow().strftime('%Y%m%d')}.pdf"}
    )

@router.get("/risk/excel")
def export_risk_report_excel(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    emps = db.query(Employee).order_by(Employee.risk_score.desc()).all()
    rows = []
    for e in emps:
        bp = e.behavioral_profile
        rows.append({
            "Employee ID": e.employee_id,
            "Name": e.name,
            "Department": e.department,
            "Designation": e.designation,
            "Risk Score": e.risk_score,
            "Risk Level": e.risk_level.value,
            "Files/Day": bp.files_per_day if bp else 0.0,
            "USB/Day": bp.usb_per_day if bp else 0.0,
            "Network MB/Day": bp.network_mb_per_day if bp else 0.0,
            "Status": e.status
        })
        
    excel_bytes = generate_excel_report("Enterprise Insider Risk Assessment", {"Risk Roster": rows})
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=risk_assessment_{datetime.utcnow().strftime('%Y%m%d')}.xlsx"}
    )
