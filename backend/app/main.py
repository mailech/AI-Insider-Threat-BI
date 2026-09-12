from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Employee
from app.schemas import EmployeeCreate, EmployeeResponse
from app.telemetry import router as telemetry_router
from app.auth_routers import router as auth_router
from app.auth import get_current_user
from app.risk import router as risk_router
from app.dataset_risk import router as dataset_risk_router


app = FastAPI(
    title="AI Insider Threat Detection System",
    version="1.0.0"
)
app.include_router(telemetry_router)
app.include_router(auth_router)
app.include_router(risk_router)
app.include_router(dataset_risk_router)



# Frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3000",
    "http://127.0.0.1:3000",],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {
        "message": "ITBIS Backend is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy"
    }


# Get all employees
@app.get("/api/v1/employees", response_model=list[EmployeeResponse])
def get_employees(
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    employees = db.query(Employee).all()

    return employees


# Add new employee
@app.post("/api/v1/employees", response_model=EmployeeResponse)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):

    new_employee = Employee(
        employee_id=employee.employee_id,
        name=employee.name,
        email=employee.email,
        department=employee.department,
        role=employee.role
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return new_employee