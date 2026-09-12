import datetime
import io
import csv
from typing import List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, status, Response
from sqlalchemy.orm import Session
from sqlalchemy import func, desc
from app.database import get_db
from app.models import Employee, RiskTrajectory, TelemetryLog, User
from app.schemas import (
    AnalyticsOverview,
    KPICards,
    ThreatVelocityPoint,
    RiskDistributionItem,
    ScoreBandItem,
    DepartmentRiskItem,
    EmployeeListItem,
    RecalculateRequest,
    RecalculateResponse,
    RecalculationComponent
)
from app.auth import get_current_user, require_manager_or_admin
from app.scoring import compute_employee_risk, get_risk_tier
from app.audit_service import log_audit_event

router = APIRouter(prefix="/analytics", tags=["Risk Analytics"])

@router.get("/overview", response_model=AnalyticsOverview)
def get_analytics_overview(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    employees = db.query(Employee).all()
    total_employees = len(employees)

    critical_count = sum(1 for e in employees if e.risk_category == "Critical")
    high_count = sum(1 for e in employees if e.risk_category == "High")
    medium_count = sum(1 for e in employees if e.risk_category == "Medium")
    low_count = sum(1 for e in employees if e.risk_category == "Low")
    avg_threat_score = round(sum(e.threat_score for e in employees) / max(1, total_employees), 1)

    kpis = KPICards(
        total_employees=total_employees,
        critical_risk_alerts=critical_count,
        high_risk_users=high_count,
        medium_risk_users=medium_count,
        low_risk_users=low_count,
        avg_threat_score=avg_threat_score,
        critical_rate=round((critical_count / max(1, total_employees)) * 100, 1),
        high_risk_rate=round(((critical_count + high_count) / max(1, total_employees)) * 100, 1)
    )

    # 1. 7-Day Organizational Threat Velocity & Anomaly Trends
    threat_velocity: List[ThreatVelocityPoint] = []
    now = datetime.datetime.utcnow()
    day_names = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

    prev_score = None
    for day_offset in range(-6, 1):
        target_date = now + datetime.timedelta(days=day_offset)
        traj_avg = db.query(func.avg(RiskTrajectory.score)).filter(
            RiskTrajectory.day_offset == day_offset
        ).scalar() or avg_threat_score

        current_day_score = round(float(traj_avg), 1)
        
        start_of_day = target_date.replace(hour=0, minute=0, second=0, microsecond=0)
        end_of_day = target_date.replace(hour=23, minute=59, second=59, microsecond=999999)
        anomalies_count = db.query(TelemetryLog).filter(
            TelemetryLog.timestamp >= start_of_day,
            TelemetryLog.timestamp <= end_of_day,
            TelemetryLog.severity.in_(["HIGH", "CRITICAL"])
        ).count()
        if anomalies_count == 0:
            anomalies_count = max(1, int(current_day_score / 12))

        velocity_delta = 0.0 if prev_score is None else round(current_day_score - prev_score, 1)
        prev_score = current_day_score

        day_label = "Today" if day_offset == 0 else f"{day_names[target_date.weekday()]} {target_date.day}"
        zone = get_risk_tier(current_day_score)

        threat_velocity.append(
            ThreatVelocityPoint(
                day_label=day_label,
                date_str=target_date.strftime("%Y-%m-%d"),
                avg_score=current_day_score,
                velocity_delta=velocity_delta,
                anomalies_count=anomalies_count,
                zone=zone
            )
        )

    # 2. Risk Distribution Donut Data
    risk_distribution = [
        RiskDistributionItem(
            name="Critical",
            count=critical_count,
            percentage=round((critical_count / max(1, total_employees)) * 100, 1),
            color="#EF4444"
        ),
        RiskDistributionItem(
            name="High",
            count=high_count,
            percentage=round((high_count / max(1, total_employees)) * 100, 1),
            color="#F59E0B"
        ),
        RiskDistributionItem(
            name="Medium",
            count=medium_count,
            percentage=round((medium_count / max(1, total_employees)) * 100, 1),
            color="#38BDF8"
        ),
        RiskDistributionItem(
            name="Low",
            count=low_count,
            percentage=round((low_count / max(1, total_employees)) * 100, 1),
            color="#10B981"
        )
    ]

    # 3. Score Distribution Bands with Drill-Down Employees
    bands_def = [
        ("0-20", 0.0, 20.0),
        ("20-40", 20.0, 40.0),
        ("40-60", 40.0, 60.0),
        ("60-80", 60.0, 80.0),
        ("80-100", 80.0, 100.1),
    ]
    score_distribution: List[ScoreBandItem] = []
    for band_label, min_val, max_val in bands_def:
        band_emps = [e for e in employees if min_val <= e.threat_score < max_val or (max_val > 100 and e.threat_score == 100)]
        band_emps_sorted = sorted(band_emps, key=lambda x: x.threat_score, reverse=True)
        score_distribution.append(
            ScoreBandItem(
                band=band_label,
                count=len(band_emps_sorted),
                employees=[EmployeeListItem.model_validate(e) for e in band_emps_sorted]
            )
        )

    # 4. Department Risk Breakdown
    departments = list(set(e.department for e in employees))
    dept_breakdown: List[DepartmentRiskItem] = []
    for dept in sorted(departments):
        dept_emps = [e for e in employees if e.department == dept]
        dept_count = len(dept_emps)
        high_risk_in_dept = sum(1 for e in dept_emps if e.risk_category in ["High", "Critical"])
        dept_avg_score = round(sum(e.threat_score for e in dept_emps) / max(1, dept_count), 1)
        dept_breakdown.append(
            DepartmentRiskItem(
                department=dept,
                employee_count=dept_count,
                high_risk_count=high_risk_in_dept,
                avg_risk_score=dept_avg_score,
                risk_category=get_risk_tier(dept_avg_score)
            )
        )
    dept_breakdown.sort(key=lambda x: x.avg_risk_score, reverse=True)

    return AnalyticsOverview(
        kpis=kpis,
        threat_velocity=threat_velocity,
        risk_distribution=risk_distribution,
        score_distribution=score_distribution,
        department_breakdown=dept_breakdown
    )

@router.get("/export")
def export_fleet_analytics_csv(
    current_user: User = Depends(require_manager_or_admin),
    db: Session = Depends(get_db)
):
    """
    Export Organizational Fleet Risk Report to CSV.
    Restricted to Administrator and Security Manager (Executive Exposure Governance).
    """
    employees = db.query(Employee).all()
    departments = list(set(e.department for e in employees))
    
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow([
        "# AMS Organizational Fleet Threat Risk Analysis Report",
        f"# Generated: {datetime.datetime.utcnow().isoformat()}",
        f"# Exported By: {current_user.email} ({current_user.role})"
    ])
    writer.writerow([])
    writer.writerow(["Department", "Employee Count", "High/Critical Risk Count", "Avg Risk Score (%)", "Department Risk Tier"])
    
    for dept in sorted(departments):
        dept_emps = [e for e in employees if e.department == dept]
        dept_count = len(dept_emps)
        high_risk_in_dept = sum(1 for e in dept_emps if e.risk_category in ["High", "Critical"])
        dept_avg_score = round(sum(e.threat_score for e in dept_emps) / max(1, dept_count), 1)
        writer.writerow([
            dept, dept_count, high_risk_in_dept, dept_avg_score, get_risk_tier(dept_avg_score)
        ])

    # Record Audit Log
    log_audit_event(
        db=db,
        user=current_user,
        action="EXPORT_FLEET_CSV",
        target_resource="fleet_risk_analytics",
        details={"departments_count": len(departments), "total_employees": len(employees)}
    )

    return Response(
        content=output.getvalue(),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=ams_fleet_risk_report.csv"}
    )

@router.post("/recalculate", response_model=RecalculateResponse)
def recalculate_employee_risk(
    req: RecalculateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    emp = db.query(Employee).filter(Employee.id == req.employee_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Employee '{req.employee_id}' not found"
        )

    previous_score = emp.threat_score
    previous_tier = emp.risk_category

    # Run deterministic 5-factor scoring engine
    new_score, new_tier, components, events_count = compute_employee_risk(
        employee=emp,
        lookback_window=req.lookback_window,
        db=db
    )

    # IAM Least-Privilege Rule:
    # Security Analyst is read-only triage role -> computes calculation PREVIEW only without database mutation.
    # Admin, Manager, and SOC Engineer -> persist score updates to database.
    is_preview = current_user.role == "Security Analyst"

    if not is_preview:
        emp.threat_score = new_score
        emp.risk_category = new_tier
        emp.updated_at = datetime.datetime.utcnow()

        today_traj = db.query(RiskTrajectory).filter(
            RiskTrajectory.employee_id == emp.id,
            RiskTrajectory.day_offset == 0
        ).first()
        if today_traj:
            today_traj.score = new_score

        db.commit()
        db.refresh(emp)

        log_audit_event(
            db=db,
            user=current_user,
            action="RECALCULATE_RISK_PERSIST",
            target_resource=emp.id,
            details={
                "employee_name": emp.full_name,
                "previous_score": previous_score,
                "new_score": new_score,
                "lookback_window": req.lookback_window,
                "events_analyzed": events_count
            }
        )
    else:
        log_audit_event(
            db=db,
            user=current_user,
            action="RECALCULATE_RISK_PREVIEW",
            target_resource=emp.id,
            details={
                "employee_name": emp.full_name,
                "current_persisted_score": previous_score,
                "preview_calculated_score": new_score,
                "lookback_window": req.lookback_window,
                "mode": "Analyst Non-Mutating Preview"
            }
        )

    return RecalculateResponse(
        employee_id=emp.id,
        employee_name=emp.full_name,
        previous_score=previous_score,
        new_score=new_score,
        previous_tier=previous_tier,
        new_tier=new_tier,
        lookback_window=req.lookback_window,
        timestamp=datetime.datetime.utcnow(),
        components=[RecalculationComponent(**c) for c in components],
        events_analyzed=events_count,
        preview_mode=is_preview
    )
