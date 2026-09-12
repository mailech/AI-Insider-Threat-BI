from typing import List, Optional, Dict, Any
import io
import csv
import json
import datetime
from fastapi import APIRouter, Depends, Query, Response, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import TelemetryLog, Employee, User, Incident

from app.schemas import AnomalyReportResponse, AnomalyEventRead, AnomalyThresholdItem
from app.auth import get_current_user, require_manager_or_admin
from app.audit_service import log_audit_event
from app.config import settings

router = APIRouter(prefix="/anomalies", tags=["Anomaly Intelligence & Reports"])

@router.get("/thresholds", response_model=Dict[str, AnomalyThresholdItem])
def get_anomaly_detection_thresholds(
    current_user: User = Depends(get_current_user)
):
    """
    Returns the real, inspectable behavioral anomaly detection thresholds and trigger conditions
    grounded in CERT and CMU insider threat research taxonomy (Milestone 2 Round 2).
    """
    return settings.ANOMALY_DETECTION_THRESHOLDS

@router.get("/report", response_model=AnomalyReportResponse)
def get_anomaly_report(
    start_date: Optional[str] = Query(None, description="Start date (YYYY-MM-DD)"),
    end_date: Optional[str] = Query(None, description="End date (YYYY-MM-DD)"),
    department: Optional[str] = Query(None, description="Filter by department"),
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    anomaly_category: Optional[str] = Query(None, description="Filter by anomaly category"),
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Dedicated Anomaly Report Endpoint (Milestone 2 A3 & Elevation Feature 3 MITRE).
    Returns anomaly-categorized events enriched with employee organizational context, risk categories, and MITRE tags.
    """
    query = (
        db.query(TelemetryLog, Employee)
        .join(Employee, TelemetryLog.employee_id == Employee.id)
        .filter(TelemetryLog.anomaly_category.isnot(None))
    )

    if start_date:
        try:
            sd = datetime.datetime.fromisoformat(start_date)
            query = query.filter(TelemetryLog.timestamp >= sd)
        except Exception:
            pass

    if end_date:
        try:
            ed = datetime.datetime.fromisoformat(end_date)
            query = query.filter(TelemetryLog.timestamp <= ed)
        except Exception:
            pass

    if department and department != "All":
        query = query.filter(Employee.department.ilike(department))

    if employee_id and employee_id != "All":
        query = query.filter(TelemetryLog.employee_id == employee_id)

    if severity and severity != "All":
        query = query.filter(TelemetryLog.severity.ilike(severity))

    # Category counts aggregate (reflects date, department, employee, severity filters)
    base_results = query.all()
    category_counts = {}
    for log, _ in base_results:
        cat = log.anomaly_category or "UNCLASSIFIED"
        category_counts[cat] = category_counts.get(cat, 0) + 1

    if anomaly_category and anomaly_category != "All":
        query = query.filter(TelemetryLog.anomaly_category.ilike(anomaly_category))

    results = query.order_by(desc(TelemetryLog.timestamp)).all()


    # Pre-fetch incidents for mapping
    incidents_by_log_id = {inc.telemetry_event_id: inc.incident_id for inc in db.query(Incident).filter(Incident.telemetry_event_id.isnot(None)).all()}

    events = []
    mitre_technique_counts: Dict[str, int] = {}
    department_counts: Dict[str, int] = {}
    severity_counts: Dict[str, int] = {}
    critical_count = 0

    for log, emp in results:
        cat = log.anomaly_category or "UNCLASSIFIED"
        mitre_info = settings.MITRE_MAPPING.get(cat, {})
        tid = mitre_info.get("id")
        tname = mitre_info.get("name")
        sev = (log.severity or "UNKNOWN").upper()
        dept = emp.department or "Unknown"

        if sev == "CRITICAL":
            critical_count += 1

        if tid:
            label = f"{tid} - {tname}" if tname else tid
            mitre_technique_counts[label] = mitre_technique_counts.get(label, 0) + 1

        department_counts[dept] = department_counts.get(dept, 0) + 1
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

        inc_id = incidents_by_log_id.get(log.id)

        events.append(
            AnomalyEventRead(
                id=log.id,
                employee_id=log.employee_id,
                employee_name=emp.full_name,
                department=dept,
                risk_category=emp.risk_category,
                anomaly_category=cat,
                mitre_technique_id=tid,
                mitre_technique_name=tname,
                event_type=log.event_type,
                severity=log.severity,
                source_ip=log.source_ip,
                timestamp=log.timestamp,
                description=log.description,
                payload=log.payload,
                incident_id=inc_id,
                has_incident=inc_id is not None
            )
        )


    total_anomalies = db.query(TelemetryLog).filter(TelemetryLog.anomaly_category.isnot(None)).count()
    active_mitre_techniques_count = len(mitre_technique_counts)
    most_affected_department = max(department_counts.items(), key=lambda x: x[1])[0] if department_counts else None

    return AnomalyReportResponse(
        total_anomalies=total_anomalies,
        filtered_count=len(events),
        critical_count=critical_count,
        active_mitre_techniques_count=active_mitre_techniques_count,
        most_affected_department=most_affected_department,
        start_date=start_date,
        end_date=end_date,
        category_counts=category_counts,
        mitre_technique_counts=mitre_technique_counts,
        department_counts=department_counts,
        severity_counts=severity_counts,
        events=events
    )


@router.get("/report/export")
def export_anomaly_report_csv(
    start_date: Optional[str] = Query(None),
    end_date: Optional[str] = Query(None),
    department: Optional[str] = Query(None),
    employee_id: Optional[str] = Query(None),
    anomaly_category: Optional[str] = Query(None),
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """
    Export Dedicated Anomaly Detection Report to CSV.
    Restricted to Administrator and Security Manager (Least-Privilege Security Governance).
    """
    query = (
        db.query(TelemetryLog, Employee)
        .join(Employee, TelemetryLog.employee_id == Employee.id)
        .filter(TelemetryLog.anomaly_category.isnot(None))
    )

    if start_date:
        try:
            sd = datetime.datetime.fromisoformat(start_date)
            query = query.filter(TelemetryLog.timestamp >= sd)
        except Exception:
            pass

    if end_date:
        try:
            ed = datetime.datetime.fromisoformat(end_date)
            query = query.filter(TelemetryLog.timestamp <= ed)
        except Exception:
            pass

    if department and department != "All":
        query = query.filter(Employee.department.ilike(department))

    if employee_id and employee_id != "All":
        query = query.filter(TelemetryLog.employee_id == employee_id)

    if anomaly_category and anomaly_category != "All":
        query = query.filter(TelemetryLog.anomaly_category.ilike(anomaly_category))

    results = query.order_by(desc(TelemetryLog.timestamp)).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Event ID", "Employee ID", "Employee Name", "Department", "Risk Tier",
        "Anomaly Category", "Event Type", "Severity", "Source IP", "Timestamp", "Description", "Payload Details"
    ])

    for log, emp in results:
        writer.writerow([
            log.id,
            log.employee_id,
            emp.full_name,
            emp.department,
            emp.risk_category,
            log.anomaly_category,
            log.event_type,
            log.severity,
            log.source_ip,
            log.timestamp.isoformat(),
            log.description,
            json.dumps(log.payload or {})
        ])

    # Record Audit Log
    log_audit_event(
        db=db,
        user=current_user,
        action="EXPORT_ANOMALY_REPORT_CSV",
        target_resource="anomaly_report",
        details={
            "record_count": len(results),
            "filters": {
                "start_date": start_date,
                "end_date": end_date,
                "department": department,
                "employee_id": employee_id,
                "anomaly_category": anomaly_category
            }
        }
    )

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=ams_anomaly_report_{datetime.date.today().isoformat()}.csv"}
    )
