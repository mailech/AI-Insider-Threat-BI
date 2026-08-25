from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import or_

from app.database import get_db

from app.models.employee import Employee
from app.models.psychometric import PsychometricProfile
from app.models.risk import Risk

from app.models.logon import LogonActivity
from app.models.email import EmailActivity
from app.models.file_activity import FileActivity
from app.models.http_activity import HttpActivity
from app.models.device import DeviceActivity

from app.schemas.employee import (
    EmployeeCreate,
    EmployeeUpdate,
    EmployeeResponse,
    EmployeeIntelligenceResponse,
    PsychometricIntelligence,
    ActivityIntelligence,
    LogonActivityIntelligence,
    EmailActivityIntelligence,
    FileActivityIntelligence,
    HttpActivityIntelligence,
    DeviceActivityIntelligence,
    RiskIntelligence,
)

from app.auth.roles import require_role
from app.services.risk_service import RiskService


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/employees",
    tags=["Employee Management"]
)


# ============================================================
# GET ALL EMPLOYEES
# ============================================================

@router.get(
    "/",
    response_model=list[EmployeeResponse]
)
def get_all_employees(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin", "Security Analyst"])
    )
):
    return (
        db.query(Employee)
        .order_by(Employee.id)
        .all()
    )


# ============================================================
# SEARCH EMPLOYEES
# ============================================================

@router.get(
    "/search/",
    response_model=list[EmployeeResponse]
)
def search_employees(
    keyword: str = Query(...),
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin", "Security Analyst"])
    )
):
    return (
        db.query(Employee)
        .filter(
            or_(
                Employee.full_name.ilike(
                    f"%{keyword}%"
                ),
                Employee.department.ilike(
                    f"%{keyword}%"
                ),
                Employee.employee_id.ilike(
                    f"%{keyword}%"
                )
            )
        )
        .order_by(Employee.id)
        .all()
    )


# ============================================================
# DASHBOARD SUMMARY
# ============================================================

@router.get(
    "/dashboard/summary"
)
def dashboard_summary(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin", "Security Analyst"])
    )
):

    total = db.query(Employee).count()

    active = (
        db.query(Employee)
        .filter(
            Employee.status == "Active"
        )
        .count()
    )

    inactive = (
        db.query(Employee)
        .filter(
            Employee.status == "Inactive"
        )
        .count()
    )

    high_risk = (
        db.query(Risk)
        .filter(
            Risk.risk_level == "HIGH"
        )
        .count()
    )

    critical = (
        db.query(Risk)
        .filter(
            Risk.risk_level == "CRITICAL"
        )
        .count()
    )

    return {
        "total_employees": total,
        "active_employees": active,
        "inactive_employees": inactive,
        "high_risk": high_risk,
        "critical_risk": critical
    }


# ============================================================
# EMPLOYEE INTELLIGENCE PROFILE
# ============================================================

@router.get(
    "/{employee_id}/intelligence",
    response_model=EmployeeIntelligenceResponse
)
def get_employee_intelligence(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin", "Security Analyst"])
    )
):

    # ========================================================
    # EMPLOYEE
    # ========================================================

    employee = (
        db.query(Employee)
        .filter(
            Employee.employee_id == employee_id
        )
        .first()
    )

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )


    # ========================================================
    # PSYCHOMETRIC PROFILE
    # ========================================================

    psychometric = (
        db.query(PsychometricProfile)
        .filter(
            PsychometricProfile.user_id == employee_id
        )
        .first()
    )

    psychometric_data = None

    if psychometric:

        psychometric_data = PsychometricIntelligence(

            employee_name=psychometric.employee_name,

            user_id=psychometric.user_id,

            openness=psychometric.openness,

            conscientiousness=(
                psychometric.conscientiousness
            ),

            extraversion=(
                psychometric.extraversion
            ),

            agreeableness=(
                psychometric.agreeableness
            ),

            neuroticism=(
                psychometric.neuroticism
            )
        )


    # ========================================================
    # LOGON ACTIVITY
    # ========================================================

    logon_events = (
        db.query(LogonActivity)
        .filter(
            LogonActivity.user_id == employee_id
        )
        .all()
    )

    logon_total = len(logon_events)

    logon_count = sum(
        1
        for event in logon_events
        if event.activity
        and event.activity.lower() == "logon"
    )

    logoff_count = sum(
        1
        for event in logon_events
        if event.activity
        and event.activity.lower() == "logoff"
    )

    logon_devices = len(
        {
            event.pc
            for event in logon_events
            if event.pc
        }
    )

    logon_last_activity = None

    if logon_events:

        latest = max(
            logon_events,
            key=lambda x: x.event_time
        )

        if latest.event_time:

            logon_last_activity = (
                latest.event_time.isoformat()
            )


    logon_data = LogonActivityIntelligence(

        total_events=logon_total,

        logon_events=logon_count,

        logoff_events=logoff_count,

        unique_devices=logon_devices,

        last_activity=logon_last_activity
    )


    # ========================================================
    # EMAIL ACTIVITY
    # ========================================================

    email_events = (
        db.query(EmailActivity)
        .filter(
            EmailActivity.user_id == employee_id
        )
        .all()
    )

    email_total = len(email_events)

    emails_with_attachments = sum(
        1
        for email in email_events
        if email.attachments
        and str(email.attachments).strip()
        and str(email.attachments).lower()
        not in [
            "none",
            "null",
            "nan",
            "[]"
        ]
    )

    emails_without_attachments = (
        email_total -
        emails_with_attachments
    )

    email_sizes = [
        email.email_size
        for email in email_events
        if email.email_size is not None
    ]

    average_email_size = (
        sum(email_sizes) / len(email_sizes)
        if email_sizes
        else 0.0
    )

    email_devices = len(
        {
            email.pc
            for email in email_events
            if email.pc
        }
    )

    email_last_activity = None

    if email_events:

        latest = max(
            email_events,
            key=lambda x: x.event_time
        )

        if latest.event_time:

            email_last_activity = (
                latest.event_time.isoformat()
            )


    email_data = EmailActivityIntelligence(

        total_emails=email_total,

        emails_with_attachments=(
            emails_with_attachments
        ),

        emails_without_attachments=(
            emails_without_attachments
        ),

        average_email_size=round(
            average_email_size,
            2
        ),

        unique_devices=email_devices,

        last_activity=email_last_activity
    )


    # ========================================================
    # FILE ACTIVITY
    # ========================================================

    file_events = (
        db.query(FileActivity)
        .filter(
            FileActivity.user_id == employee_id
        )
        .all()
    )

    file_total = len(file_events)

    unique_files = len(
        {
            file.filename
            for file in file_events
            if file.filename
        }
    )

    file_devices = len(
        {
            file.pc
            for file in file_events
            if file.pc
        }
    )

    file_last_activity = None

    if file_events:

        latest = max(
            file_events,
            key=lambda x: x.event_time
        )

        if latest.event_time:

            file_last_activity = (
                latest.event_time.isoformat()
            )


    file_data = FileActivityIntelligence(

        total_file_events=file_total,

        unique_files=unique_files,

        unique_devices=file_devices,

        last_activity=file_last_activity
    )


    # ========================================================
    # HTTP ACTIVITY
    # ========================================================

    http_events = (
        db.query(HttpActivity)
        .filter(
            HttpActivity.user_id == employee_id
        )
        .all()
    )

    http_total = len(http_events)

    unique_websites = len(
        {
            http.url
            for http in http_events
            if http.url
        }
    )

    http_devices = len(
        {
            http.pc
            for http in http_events
            if http.pc
        }
    )

    http_last_activity = None

    if http_events:

        latest = max(
            http_events,
            key=lambda x: x.event_time
        )

        if latest.event_time:

            http_last_activity = (
                latest.event_time.isoformat()
            )


    http_data = HttpActivityIntelligence(

        total_http_events=http_total,

        unique_websites=unique_websites,

        unique_devices=http_devices,

        last_activity=http_last_activity
    )


    # ========================================================
    # DEVICE ACTIVITY
    # ========================================================

    device_events = (
        db.query(DeviceActivity)
        .filter(
            DeviceActivity.user_id == employee_id
        )
        .all()
    )

    device_total = len(device_events)

    device_activity_types = sorted(
        {
            device.activity
            for device in device_events
            if device.activity
        }
    )

    device_unique_devices = len(
        {
            device.pc
            for device in device_events
            if device.pc
        }
    )

    device_last_activity = None

    if device_events:

        latest = max(
            device_events,
            key=lambda x: x.event_time
        )

        if latest.event_time:

            device_last_activity = (
                latest.event_time.isoformat()
            )


    device_data = DeviceActivityIntelligence(

        total_device_events=device_total,

        activity_types=device_activity_types,

        unique_devices=device_unique_devices,

        last_activity=device_last_activity
    )


    # ========================================================
    # COMBINE ACTIVITY
    # ========================================================

    activity_data = ActivityIntelligence(

        logon=logon_data,

        email=email_data,

        file=file_data,

        http=http_data,

        device=device_data
    )


    # ========================================================
    # RISK
    # ========================================================

    risk_data = None

    try:

        # Use the existing risk engine.
        #
        # This is important because the risks table stores
        # only employee_id, risk_score and risk_level.
        #
        # The actual behavioral risk calculation is performed
        # by RiskService.

        risk_result = RiskService.calculate_risk(
            db,
            employee_id
        )

        if risk_result:

            risk_data = RiskIntelligence(

                risk_score=int(
                    risk_result.get(
                        "risk_score",
                        0
                    )
                ),

                risk_level=str(
                    risk_result.get(
                        "risk_level",
                        "LOW"
                    )
                ),

                behavioral_anomalies=float(
                    risk_result.get(
                        "behavioral_anomalies",
                        0
                    )
                ),

                privilege_misuse=float(
                    risk_result.get(
                        "privilege_misuse",
                        0
                    )
                ),

                data_access_violations=float(
                    risk_result.get(
                        "data_access_violations",
                        0
                    )
                ),

                access_pattern_deviations=float(
                    risk_result.get(
                        "access_pattern_deviations",
                        0
                    )
                ),

                historical_security_events=float(
                    risk_result.get(
                        "historical_security_events",
                        0
                    )
                ),

                explanation=str(
                    risk_result.get(
                        "explanation",
                        "No risk explanation available."
                    )
                )
            )

    except Exception as error:

        print(
            "Risk calculation warning:",
            error
        )

        # Keep the endpoint working even if the risk
        # engine encounters a problem.

        risk_data = None


    # ========================================================
    # FINAL RESPONSE
    # ========================================================

    return EmployeeIntelligenceResponse(

        employee=employee,

        psychometric=psychometric_data,

        activity=activity_data,

        risk=risk_data
    )


# ============================================================
# GET EMPLOYEE BY DATABASE ID
# ============================================================

@router.get(
    "/{employee_id}",
    response_model=EmployeeResponse
)
def get_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin", "Security Analyst"])
    )
):

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id
        )
        .first()
    )

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    return employee


# ============================================================
# CREATE EMPLOYEE
# ============================================================

@router.post(
    "/",
    response_model=EmployeeResponse
)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin"])
    )
):

    existing = (
        db.query(Employee)
        .filter(
            Employee.employee_id ==
            employee.employee_id
        )
        .first()
    )

    if existing:

        raise HTTPException(
            status_code=400,
            detail="Employee ID already exists"
        )

    new_employee = Employee(

        employee_id=employee.employee_id,

        full_name=employee.full_name,

        department=employee.department,

        designation=employee.designation,

        manager=employee.manager,

        device_information=employee.device_information,

        access_privileges=employee.access_privileges,

        risk_level="Low",

        status="Active"
    )

    db.add(new_employee)

    db.commit()

    db.refresh(new_employee)

    return new_employee


# ============================================================
# UPDATE EMPLOYEE
# ============================================================

@router.put(
    "/{employee_id}",
    response_model=EmployeeResponse
)
def update_employee(
    employee_id: int,
    updated_employee: EmployeeUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin"])
    )
):

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id
        )
        .first()
    )

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    employee.employee_id = (
        updated_employee.employee_id
    )

    employee.full_name = (
        updated_employee.full_name
    )

    employee.department = (
        updated_employee.department
    )

    employee.designation = (
        updated_employee.designation
    )

    employee.manager = (
        updated_employee.manager
    )

    employee.device_information = (
        updated_employee.device_information
    )

    employee.access_privileges = (
        updated_employee.access_privileges
    )

    employee.risk_level = (
        updated_employee.risk_level
    )

    employee.status = (
        updated_employee.status
    )

    db.commit()

    db.refresh(employee)

    return employee


# ============================================================
# DELETE EMPLOYEE
# ============================================================

@router.delete(
    "/{employee_id}"
)
def delete_employee(
    employee_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role(["Admin"])
    )
):

    employee = (
        db.query(Employee)
        .filter(
            Employee.id == employee_id
        )
        .first()
    )

    if not employee:

        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    db.delete(employee)

    db.commit()

    return {
        "message": "Employee deleted successfully"
    }