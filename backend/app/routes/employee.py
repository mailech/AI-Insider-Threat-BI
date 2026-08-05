from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.employee import Employee
from app.schemas.employee import EmployeeCreate, EmployeeResponse

router = APIRouter(
    prefix="/employees",
    tags=["Employee Management"]
)


# ----------------------------
# Add Employee
# ----------------------------
@router.post("/", response_model=EmployeeResponse)
def create_employee(employee: EmployeeCreate, db: Session = Depends(get_db)):

    # Check if Employee ID already exists
    existing_employee = db.query(Employee).filter(
        Employee.employee_id == employee.employee_id
    ).first()

    if existing_employee:
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
        access_privileges=employee.access_privileges
    )

    db.add(new_employee)
    db.commit()
    db.refresh(new_employee)

    return new_employee


# ----------------------------
# View All Employees
# ----------------------------
@router.get("/", response_model=list[EmployeeResponse])
def get_all_employees(db: Session = Depends(get_db)):

    employees = db.query(Employee).all()

    return employees


# ----------------------------
# View Employee by ID
# ----------------------------
@router.get("/{employee_id}", response_model=EmployeeResponse)
def get_employee(employee_id: int, db: Session = Depends(get_db)):

    employee = db.query(Employee).filter(
        Employee.id == employee_id
    ).first()

    if not employee:
        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    return employee