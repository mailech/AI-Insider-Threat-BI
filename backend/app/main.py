from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.database import get_db, engine, Base
from app.models import Employee
from app.schemas import EmployeeCreate, EmployeeResponse

from app.telemetry import router as telemetry_router
from app.auth_routers import router as auth_router
from app.risk import router as risk_router
from app.dataset_risk import router as dataset_risk_router
from app.alerts_router import router as alerts_router
from app.audit_router import router as audit_router
from app.auth import get_current_user, require_roles
from app.audit import log_audit

# Ensure database tables exist
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="AI Insider Threat Detection System",
    version="1.0.0"
)


# ==============================
# API ROUTERS
# ==============================

app.include_router(telemetry_router)
app.include_router(auth_router)
app.include_router(risk_router)
app.include_router(dataset_risk_router)
app.include_router(alerts_router)
app.include_router(audit_router)


# ==============================
# CORS
# ==============================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==============================
# ROOT
# ==============================

@app.get("/")
def root():
    return {
        "message": "ITBIS Backend is running"
    }


# ==============================
# HEALTH CHECK
# ==============================

@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# ==============================
# GET ALL EMPLOYEES
# ==============================

@app.get(
    "/api/v1/employees",
    response_model=list[EmployeeResponse]
)
def get_employees(
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles([
            "ADMINISTRATOR",
            "SECURITY_MANAGER",
            "SOC_ENGINEER",
            "SECURITY_ANALYST"
        ])
    )
):

    employees = db.query(Employee).all()

    return employees


# ==============================
# ADD NEW EMPLOYEE
# ==============================

@app.post(
    "/api/v1/employees",
    response_model=EmployeeResponse
)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles([
            "ADMINISTRATOR",
            "SECURITY_MANAGER"
        ])
    )
):

    new_employee = Employee(
        employee_id=employee.employee_id,
        name=employee.name,
        email=employee.email,
        department=employee.department,
        role=employee.role
    )

    try:
        db.add(new_employee)
        db.commit()
        db.refresh(new_employee)

        log_audit(
            db,
            actor=current_user["email"],
            action="EMPLOYEE_CREATE",
            target=new_employee.employee_id,
            status="SUCCESS",
            details=f"Created employee {new_employee.name} ({new_employee.email})"
        )

    except IntegrityError:
        db.rollback()

        log_audit(
            db,
            actor=current_user["email"],
            action="EMPLOYEE_CREATE",
            target=employee.employee_id,
            status="FAILED",
            details="Employee ID or email already exists"
        )

        raise HTTPException(
            status_code=409,
            detail="Employee ID or email already exists"
        )

    return new_employee