from datetime import datetime, timedelta
from io import StringIO
import csv

from fastapi import FastAPI, Depends, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .database import Base, engine, get_db, SessionLocal
from .models import (
    User,
    Employee,
    Activity,
    Anomaly,
    RiskScore,
    Incident,
    Alert,
    AuditLog,
)
from .schemas import (
    RegisterRequest,
    EmployeeCreate,
    ActivityCreate,
    IncidentCreate,
    IncidentUpdate,
    AlertUpdate,
)
from .auth import (
    hash_password,
    verify_password,
    create_token,
    get_current_user,
    require_roles,
)
from .analytics import analyze_employee, dashboard_summary, build_profile
from .reports import make_pdf, make_excel
from .dataset_ingestion import ingest_cert_dataset, DATASET_DIR


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Insider Threat Behavioral Intelligence API",
    version="1.0.0",
)


# ============================================================
# CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# SEED USERS + DEMO DATA
# ============================================================

def seed():
    db = SessionLocal()

    try:
        # ----------------------------------------------------
        # 4 PROJECT ROLES
        # ----------------------------------------------------

        accounts = [
            {
                "username": "admin",
                "password": "Admin@123",
                "role": "Administrator",
            },
            {
                "username": "analyst",
                "password": "Analyst@123",
                "role": "Security Analyst",
            },
            {
                "username": "soc",
                "password": "Soc@12345",
                "role": "SOC Engineer",
            },
            {
                "username": "manager",
                "password": "Manager@123",
                "role": "Security Manager",
            },
        ]

        # Create or update all 4 accounts
        for account in accounts:
            user = (
                db.query(User)
                .filter(User.username == account["username"])
                .first()
            )

            if not user:
                user = User(
                    username=account["username"],
                    password_hash=hash_password(account["password"]),
                    role=account["role"],
                )
                db.add(user)
            else:
                # Make sure existing accounts also have
                # the correct password and role.
                user.password_hash = hash_password(account["password"])
                user.role = account["role"]

        db.commit()

        # ----------------------------------------------------
        # DEMO EMPLOYEES + ACTIVITIES
        # ----------------------------------------------------

        if db.query(Employee).count() == 0:

            db.add_all(
                [
                    Employee(
                        employee_id="EMP001",
                        name="Aarav Kumar",
                        department="Finance",
                        designation="Analyst",
                        manager="Manager A",
                        device="LAP-001",
                        access_privileges="finance,standard",
                    ),
                    Employee(
                        employee_id="EMP002",
                        name="Diya Rao",
                        department="Engineering",
                        designation="Developer",
                        manager="Manager B",
                        device="LAP-002",
                        access_privileges="engineering,standard",
                    ),
                    Employee(
                        employee_id="EMP003",
                        name="Kiran Singh",
                        department="HR",
                        designation="HR Executive",
                        manager="Manager C",
                        device="LAP-003",
                        access_privileges="hr,standard",
                    ),
                ]
            )

            base = datetime.utcnow() - timedelta(days=7)

            samples = []

            for i in range(180):

                eid = ["EMP001", "EMP002", "EMP003"][i % 3]

                ts = base + timedelta(hours=i * 1.2)

                samples.append(
                    Activity(
                        employee_id=eid,
                        timestamp=ts,
                        activity_type=[
                            "login",
                            "file_access",
                            "application",
                            "network",
                            "email",
                        ][i % 5],
                        resource=[
                            "finance_report.xlsx",
                            "hr_portal",
                            "git",
                            "mail",
                            "vpn",
                        ][i % 5],
                        source_ip=f"10.0.0.{10 + i % 20}",
                        bytes_transferred=(i % 15) * 1024 * 1024,
                        privilege_level="normal",
                        success=1,
                    )
                )

            # ------------------------------------------------
            # DEMO OUTLIERS
            # ------------------------------------------------

            samples += [
                Activity(
                    employee_id="EMP001",
                    timestamp=datetime.utcnow().replace(
                        hour=2,
                        minute=15,
                        second=0,
                        microsecond=0,
                    ),
                    activity_type="login",
                    resource="vpn",
                    source_ip="10.0.0.99",
                    bytes_transferred=2 * 1024 * 1024,
                    privilege_level="normal",
                    success=1,
                ),
                Activity(
                    employee_id="EMP002",
                    timestamp=datetime.utcnow(),
                    activity_type="file_download",
                    resource="customer_archive.zip",
                    source_ip="10.0.0.88",
                    bytes_transferred=250 * 1024 * 1024,
                    privilege_level="elevated",
                    success=1,
                ),
                Activity(
                    employee_id="EMP003",
                    timestamp=datetime.utcnow(),
                    activity_type="access_attempt",
                    resource="finance_payroll",
                    source_ip="10.0.0.77",
                    bytes_transferred=0,
                    privilege_level="normal",
                    success=0,
                ),
            ]

            db.add_all(samples)
            db.commit()

            # Analyze demo employees
            for eid in ["EMP001", "EMP002", "EMP003"]:
                analyze_employee(db, eid)

    finally:
        db.close()


seed()


# ============================================================
# ROOT
# ============================================================

@app.get("/")
def root():
    return {
        "name": "Insider Threat Behavioral Intelligence API",
        "status": "running",
    }


# ============================================================
# AUTHENTICATION
# ============================================================

@app.post("/api/auth/register")
def register(
    payload: RegisterRequest,
    db: Session = Depends(get_db),
):
    if db.query(User).filter(
        User.username == payload.username
    ).first():

        raise HTTPException(
            400,
            "Username already exists",
        )

    allowed = {
        "Security Analyst",
        "SOC Engineer",
        "Security Manager",
        "Administrator",
    }

    role = (
        payload.role
        if payload.role in allowed
        else "Security Analyst"
    )

    user = User(
        username=payload.username,
        password_hash=hash_password(payload.password),
        role=role,
    )

    db.add(user)
    db.commit()

    return {
        "message": "User registered",
        "username": user.username,
        "role": user.role,
    }


@app.post("/api/auth/login")
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = (
        db.query(User)
        .filter(User.username == form.username)
        .first()
    )

    if not user or not verify_password(
        form.password,
        user.password_hash,
    ):
        raise HTTPException(
            401,
            "Incorrect username or password",
        )

    db.add(
        AuditLog(
            username=user.username,
            action="login",
        )
    )

    db.commit()

    return {
        "access_token": create_token(
            user.username,
            user.role,
        ),
        "token_type": "bearer",
        "role": user.role,
    }


@app.get("/api/auth/me")
def me(
    user=Depends(get_current_user),
):
    return {
        "username": user.username,
        "role": user.role,
    }


# ============================================================
# EMPLOYEES
# ============================================================

@app.get("/api/employees")
def employees(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    out = []

    for e in (
        db.query(Employee)
        .order_by(Employee.id)
        .all()
    ):

        r = (
            db.query(RiskScore)
            .filter(
                RiskScore.employee_id == e.employee_id
            )
            .first()
        )

        out.append(
            {
                "id": e.id,
                "employee_id": e.employee_id,
                "name": e.name,
                "department": e.department,
                "designation": e.designation,
                "manager": e.manager,
                "device": e.device,
                "access_privileges": e.access_privileges,
                "risk_score": round(
                    r.total_score,
                    2,
                ) if r else 0,
                "risk_category": (
                    r.category
                    if r
                    else "Low Risk"
                ),
            }
        )

    return out


@app.post("/api/employees")
def add_employee(
    payload: EmployeeCreate,
    db: Session = Depends(get_db),
    user=Depends(
        require_roles(
            "Administrator",
            "Security Manager",
        )
    ),
):
    if db.query(Employee).filter(
        Employee.employee_id == payload.employee_id
    ).first():

        raise HTTPException(
            400,
            "Employee ID already exists",
        )

    e = Employee(
        **payload.model_dump()
    )

    db.add(e)
    db.commit()
    db.refresh(e)

    return {
        "message": "Employee created",
        "employee_id": e.employee_id,
    }


# ============================================================
# ACTIVITIES
# ============================================================

@app.get("/api/activities")
def activities(
    employee_id: str | None = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    q = db.query(Activity)

    if employee_id:
        q = q.filter(
            Activity.employee_id == employee_id
        )

    return [
        {
            "id": a.id,
            "employee_id": a.employee_id,
            "timestamp": a.timestamp.isoformat(),
            "activity_type": a.activity_type,
            "resource": a.resource,
            "source_ip": a.source_ip,
            "bytes_transferred": a.bytes_transferred,
            "privilege_level": a.privilege_level,
            "success": bool(a.success),
        }
        for a in (
            q.order_by(
                Activity.timestamp.desc()
            )
            .limit(500)
            .all()
        )
    ]


@app.post("/api/activities")
def add_activity(
    payload: ActivityCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    if not db.query(Employee).filter(
        Employee.employee_id == payload.employee_id
    ).first():

        raise HTTPException(
            404,
            "Employee not found",
        )

    data = payload.model_dump()

    data["timestamp"] = (
        data["timestamp"]
        or datetime.utcnow()
    )

    a = Activity(**data)

    db.add(a)
    db.commit()
    db.refresh(a)

    risk = analyze_employee(
        db,
        payload.employee_id,
    )

    return {
        "message": "Activity ingested",
        "activity_id": a.id,
        "risk_score": (
            round(risk.total_score, 2)
            if risk
            else 0
        ),
    }


@app.post("/api/activities/upload")
async def upload_activities(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    raw = (
        await file.read()
    ).decode("utf-8-sig")

    reader = csv.DictReader(
        StringIO(raw)
    )

    count = 0
    affected = set()

    for row in reader:

        try:

            timestamp_value = row.get(
                "timestamp",
                "",
            )

            timestamp = (
                datetime.fromisoformat(
                    timestamp_value.replace(
                        "Z",
                        "+00:00",
                    )
                )
                if timestamp_value
                else datetime.utcnow()
            )

            a = Activity(
                employee_id=row["employee_id"],
                timestamp=timestamp,
                activity_type=row.get(
                    "activity_type",
                    "unknown",
                ),
                resource=row.get(
                    "resource",
                    "",
                ),
                source_ip=row.get(
                    "source_ip",
                    "",
                ),
                bytes_transferred=int(
                    row.get(
                        "bytes_transferred",
                        0,
                    )
                    or 0
                ),
                privilege_level=row.get(
                    "privilege_level",
                    "normal",
                ),
                success=int(
                    row.get(
                        "success",
                        1,
                    )
                    or 1
                ),
            )

            db.add(a)
            affected.add(
                a.employee_id
            )

            count += 1

        except Exception:
            continue

    db.commit()

    for eid in affected:
        analyze_employee(
            db,
            eid,
        )

    return {
        "inserted": count,
        "employees_analyzed": len(
            affected
        ),
    }


# ============================================================
# CERT DATASET
# ============================================================

@app.get("/api/dataset/status")
def dataset_status(
    user=Depends(get_current_user),
):
    files = [
        "logon.csv",
        "device.csv",
        "file.csv",
        "email.csv",
    ]

    result = {}

    for filename in files:
        path = DATASET_DIR / filename
        result[filename] = {
            "exists": path.exists(),
            "size_mb": (
                round(
                    path.stat().st_size
                    / (1024 * 1024),
                    2,
                )
                if path.exists()
                else 0
            ),
        }

    return {
        "dataset": "CERT Insider Threat Dataset r4.2",
        "dataset_path": str(DATASET_DIR),
        "files": result,
    }


@app.post("/api/dataset/cert/ingest")
def ingest_cert(
    db: Session = Depends(get_db),
    user=Depends(
        require_roles(
            "Administrator",
            "Security Manager",
        )
    ),
):
    result = ingest_cert_dataset(db)

    # Recalculate risk after dataset ingestion
    employees_list = (
        db.query(Employee)
        .all()
    )

    analyzed = 0

    for employee in employees_list:
        try:
            analyze_employee(
                db,
                employee.employee_id,
            )
            analyzed += 1
        except Exception:
            pass

    db.commit()

    result["employees_analyzed"] = analyzed

    return result


# ============================================================
# DASHBOARD
# ============================================================

@app.get("/api/dashboard/summary")
def summary(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return dashboard_summary(db)


# ============================================================
# RISK
# ============================================================

@app.get("/api/risk")
def risks(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    rows = []

    for r in (
        db.query(RiskScore)
        .order_by(
            RiskScore.total_score.desc()
        )
        .all()
    ):

        e = (
            db.query(Employee)
            .filter(
                Employee.employee_id
                == r.employee_id
            )
            .first()
        )

        rows.append(
            {
                "employee_id": r.employee_id,
                "name": (
                    e.name
                    if e
                    else r.employee_id
                ),
                "department": (
                    e.department
                    if e
                    else ""
                ),
                "score": round(
                    r.total_score,
                    2,
                ),
                "category": r.category,
            }
        )

    return rows


@app.post("/api/risk/recalculate")
def recalc(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    count = 0

    for e in db.query(Employee).all():

        try:
            analyze_employee(
                db,
                e.employee_id,
            )
            count += 1
        except Exception:
            pass

    db.commit()

    return {
        "message": "Risk scores recalculated",
        "employees_analyzed": count,
    }


# ============================================================
# BEHAVIORAL PROFILE
# ============================================================

@app.get("/api/behavior/{employee_id}")
def behavior(
    employee_id: str,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    p = build_profile(
        db,
        employee_id,
    )

    if not p:
        raise HTTPException(
            404,
            "No activity data",
        )

    return {
        "employee_id": employee_id,
        "login_hour_mean": p.login_hour_mean,
        "login_hour_std": p.login_hour_std,
        "avg_data_transfer": p.avg_data_transfer,
        "avg_access_frequency": p.avg_access_frequency,
        "application_count": p.application_count,
        "updated_at": p.updated_at.isoformat(),
    }


# ============================================================
# ANOMALIES
# ============================================================

@app.get("/api/anomalies")
def anomalies(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return [
        {
            "id": a.id,
            "employee_id": a.employee_id,
            "activity_id": a.activity_id,
            "category": a.category,
            "severity": a.severity,
            "score": round(
                a.score,
                4,
            ),
            "description": a.description,
            "status": a.status,
            "created_at": a.created_at.isoformat(),
        }
        for a in (
            db.query(Anomaly)
            .order_by(
                Anomaly.created_at.desc()
            )
            .limit(300)
            .all()
        )
    ]


@app.post("/api/anomalies/{anomaly_id}/close")
def close_anomaly(
    anomaly_id: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    a = (
        db.query(Anomaly)
        .filter(
            Anomaly.id == anomaly_id
        )
        .first()
    )

    if not a:
        raise HTTPException(
            404,
            "Anomaly not found",
        )

    a.status = "Closed"

    db.commit()

    return {
        "message": "Anomaly closed"
    }


# ============================================================
# ALERTS
# ============================================================

@app.get("/api/alerts")
def alerts(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return [
        {
            "id": a.id,
            "employee_id": a.employee_id,
            "title": a.title,
            "severity": a.severity,
            "status": a.status,
            "message": a.message,
            "created_at": a.created_at.isoformat(),
        }
        for a in (
            db.query(Alert)
            .order_by(
                Alert.created_at.desc()
            )
            .limit(300)
            .all()
        )
    ]


@app.patch("/api/alerts/{alert_id}")
def update_alert(
    alert_id: int,
    payload: AlertUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    a = (
        db.query(Alert)
        .filter(
            Alert.id == alert_id
        )
        .first()
    )

    if not a:
        raise HTTPException(
            404,
            "Alert not found",
        )

    a.status = payload.status

    db.commit()

    return {
        "message": "Alert updated"
    }


# ============================================================
# INCIDENTS
# ============================================================

@app.get("/api/incidents")
def incidents(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return [
        {
            "id": i.id,
            "employee_id": i.employee_id,
            "title": i.title,
            "description": i.description,
            "severity": i.severity,
            "status": i.status,
            "assignee": i.assignee,
            "evidence": i.evidence,
            "created_at": i.created_at.isoformat(),
            "updated_at": i.updated_at.isoformat(),
        }
        for i in (
            db.query(Incident)
            .order_by(
                Incident.created_at.desc()
            )
            .all()
        )
    ]


@app.post("/api/incidents")
def create_incident(
    payload: IncidentCreate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    i = Incident(
        **payload.model_dump()
    )

    db.add(i)
    db.commit()
    db.refresh(i)

    return {
        "message": "Incident created",
        "id": i.id,
    }


@app.patch("/api/incidents/{incident_id}")
def update_incident(
    incident_id: int,
    payload: IncidentUpdate,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    i = (
        db.query(Incident)
        .filter(
            Incident.id == incident_id
        )
        .first()
    )

    if not i:
        raise HTTPException(
            404,
            "Incident not found",
        )

    for key, value in payload.model_dump(
        exclude_none=True
    ).items():

        setattr(
            i,
            key,
            value,
        )

    i.updated_at = datetime.utcnow()

    db.commit()

    return {
        "message": "Incident updated"
    }


# ============================================================
# REPORTS
# ============================================================

@app.get("/api/reports/pdf")
def report_pdf(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return StreamingResponse(
        make_pdf(db),
        media_type="application/pdf",
        headers={
            "Content-Disposition":
            "attachment; filename=insider_threat_report.pdf"
        },
    )


@app.get("/api/reports/excel")
def report_excel(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    return StreamingResponse(
        make_excel(db),
        media_type=(
            "application/vnd.openxmlformats-officedocument."
            "spreadsheetml.sheet"
        ),
        headers={
            "Content-Disposition":
            "attachment; filename=insider_threat_report.xlsx"
        },
    )