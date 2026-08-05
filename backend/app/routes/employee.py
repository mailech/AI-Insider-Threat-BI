from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeResponse
from app.auth.roles import require_role

router = APIRouter(
    prefix="/employees",
    tags=["Employee Management"]
)


# --------------------------------------------------
# Get All Employees
# Accessible by: Admin, Security Analyst
# --------------------------------------------------
@router.get("/", response_model=list[EmployeeResponse])
def get_all_employees(
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin", "Security Analyst"]))
):
    employees = db.query(Employee).all()
    return employees


# --------------------------------------------------
# Create Employee
# Accessible by: Admin Only
# --------------------------------------------------
@router.post("/", response_model=EmployeeResponse)
def create_employee(
    employee: EmployeeCreate,
    db: Session = Depends(get_db),
    current_user=Depends(require_role(["Admin"]))
):
    new_employee = Employee(
        employee_id=employee.employee_id,
        full_name=employee.full_name,
        department=employee.department,
        designation=employee.designation,
        manager=employee.manager,
        device_information=employee.device_information,
        access_privileges=employee.access_privileges
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return new_employee