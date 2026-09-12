from typing import List, Optional
import io
import csv
import json
from fastapi import APIRouter, Depends, Query, Response
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models import TelemetryLog, Employee, User, Incident
from app.schemas import TelemetryLogSchema, TelemetrySummary
from app.auth import get_current_user, require_soc_or_above
from app.audit_service import log_audit_event
from app.config import settings

router = APIRouter(prefix="/telemetry", tags=["Telemetry"])


@router.get("/summary", response_model=TelemetrySummary)
def get_telemetry_summary(
    employee_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    anomaly_category: Optional[str] = Query(None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_logs = db.query(TelemetryLog).count()
    crit_count = db.query(TelemetryLog).filter(TelemetryLog.severity == "CRITICAL").count()
    high_count = db.query(TelemetryLog).filter(TelemetryLog.severity == "HIGH").count()
    med_count = db.query(TelemetryLog).filter(TelemetryLog.severity == "MEDIUM").count()
    low_count = db.query(TelemetryLog).filter(TelemetryLog.severity == "LOW").count()
    info_count = db.query(TelemetryLog).filter(TelemetryLog.severity == "INFO").count()

    query = db.query(TelemetryLog)
    if employee_id and employee_id != "All":
        query = query.filter(TelemetryLog.employee_id == employee_id)
    if severity and severity != "All":
        query = query.filter(TelemetryLog.severity.ilike(severity))
    if event_type and event_type != "All":
        query = query.filter(TelemetryLog.event_type.ilike(event_type))
    if anomaly_category and anomaly_category != "All":
        query = query.filter(TelemetryLog.anomaly_category.ilike(anomaly_category))

    filtered_count = query.count()

    return TelemetrySummary(
        total_logs=total_logs,
        filtered_count=filtered_count,
        critical_events=crit_count,
        high_events=high_count,
        medium_events=med_count,
        low_events=low_count,
        info_events=info_count
    )

@router.get("/logs", response_model=List[TelemetryLogSchema])
def get_telemetry_logs(
    employee_id: Optional[str] = Query(None, description="Filter by employee ID"),
    severity: Optional[str] = Query(None, description="Filter by severity (CRITICAL, HIGH, MEDIUM, LOW, INFO)"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    anomaly_category: Optional[str] = Query(None, description="Filter by anomaly category"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    query = db.query(TelemetryLog, Employee).join(Employee, TelemetryLog.employee_id == Employee.id)

    if employee_id and employee_id != "All":
        query = query.filter(TelemetryLog.employee_id == employee_id)
    if severity and severity != "All":
        query = query.filter(TelemetryLog.severity.ilike(severity))
    if event_type and event_type != "All":
        query = query.filter(TelemetryLog.event_type.ilike(event_type))
    if anomaly_category and anomaly_category != "All":
        query = query.filter(TelemetryLog.anomaly_category.ilike(anomaly_category))

    results = query.order_by(desc(TelemetryLog.timestamp)).offset(offset).limit(limit).all()

    # Pre-fetch incidents for mapping
    incidents_by_log_id = {inc.telemetry_event_id: inc.incident_id for inc in db.query(Incident).filter(Incident.telemetry_event_id.isnot(None)).all()}

    logs = []
    for log, emp in results:
        mitre_info = settings.MITRE_MAPPING.get(log.anomaly_category, {}) if log.anomaly_category else {}
        inc_id = incidents_by_log_id.get(log.id)
        logs.append(
            TelemetryLogSchema(
                id=log.id,
                employee_id=log.employee_id,
                employee_name=emp.full_name,
                employee_department=emp.department,
                event_type=log.event_type,
                severity=log.severity,
                anomaly_category=log.anomaly_category,
                mitre_technique_id=mitre_info.get("id"),
                mitre_technique_name=mitre_info.get("name"),
                source_ip=log.source_ip,
                timestamp=log.timestamp,
                description=log.description,
                payload=log.payload,
                incident_id=inc_id,
                has_incident=inc_id is not None
            )
        )
    return logs



@router.get("/export")
def export_telemetry_csv(
    employee_id: Optional[str] = Query(None),
    severity: Optional[str] = Query(None),
    event_type: Optional[str] = Query(None),
    anomaly_category: Optional[str] = Query(None),
    limit: int = Query(500, ge=1, le=1000),
    current_user: User = Depends(require_soc_or_above),
    db: Session = Depends(get_db)
):
    """
    Export Ingested Activity Telemetry Logs to CSV.
    Restricted to Administrator, Security Manager, and SOC Engineer (Restricted for Security Analyst).
    """
    query = db.query(TelemetryLog, Employee).join(Employee, TelemetryLog.employee_id == Employee.id)

    if employee_id and employee_id != "All":
        query = query.filter(TelemetryLog.employee_id == employee_id)
    if severity and severity != "All":
        query = query.filter(TelemetryLog.severity.ilike(severity))
    if event_type and event_type != "All":
        query = query.filter(TelemetryLog.event_type.ilike(event_type))
    if anomaly_category and anomaly_category != "All":
        query = query.filter(TelemetryLog.anomaly_category.ilike(anomaly_category))

    results = query.order_by(desc(TelemetryLog.timestamp)).limit(limit).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "Log ID", "Employee ID", "Employee Name", "Department", "Event Type",
        "Severity", "Anomaly Category", "Source IP", "Description", "Timestamp", "Raw Payload"
    ])
    for log, emp in results:
        writer.writerow([
            log.id, log.employee_id, emp.full_name, emp.department, log.event_type,
            log.severity, log.anomaly_category or "None", log.source_ip, log.description, log.timestamp.isoformat(),
            json.dumps(log.payload or {})
        ])

    # Record Audit Log
    log_audit_event(
        db=db,
        user=current_user,
        action="EXPORT_TELEMETRY_CSV",
        target_resource="telemetry_logs",
        details={"record_count": len(results), "filters": {"employee_id": employee_id, "severity": severity, "event_type": event_type, "anomaly_category": anomaly_category}}
    )

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ams_telemetry_logs.csv"}
    )

