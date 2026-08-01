from typing import List, Optional
from fastapi import APIRouter, HTTPException
from models.schemas import Employee

router = APIRouter(prefix="/api/v1/employees", tags=["Employee Identity"])

EMPLOYEES_DB: List[dict] = [
    {
        "id": "EMP-101",
        "employee_id": "EMP-4471",
        "name": "R. Okafor",
        "department": "Finance",
        "designation": "Sr. Accountant",
        "manager": "S. Jenkins",
        "email": "r.okafor@company.com",
        "device_info": {"hostname": "FIN-LAPTOP-88", "os": "Windows 11 Enterprise", "ip": "10.4.12.89"},
        "access_privileges": ["SAP Financials", "Swift Payment Gateway", "Payroll Viewer"],
        "risk_score": 91.0,
        "risk_category": "Critical",
        "status": "Active"
    },
    {
        "id": "EMP-102",
        "employee_id": "EMP-4468",
        "name": "M. Alavi",
        "department": "Engineering",
        "designation": "DevOps Lead",
        "manager": "D. Sterling",
        "email": "m.alavi@company.com",
        "device_info": {"hostname": "ENG-MACBOOK-03", "os": "macOS Sonoma", "ip": "10.4.14.102"},
        "access_privileges": ["AWS Master Console", "Kubernetes Production Cluster", "GitHub Admin"],
        "risk_score": 74.0,
        "risk_category": "High",
        "status": "Active"
    },
    {
        "id": "EMP-103",
        "employee_id": "EMP-4460",
        "name": "T. Nakamura",
        "department": "Sales",
        "designation": "Account Exec",
        "manager": "K. Adams",
        "email": "t.nakamura@company.com",
        "device_info": {"hostname": "SALES-DELL-12", "os": "Windows 11 Pro", "ip": "10.4.18.55"},
        "access_privileges": ["Salesforce CRM", "HubSpot", "Client Contact DB"],
        "risk_score": 52.0,
        "risk_category": "Medium",
        "status": "Active"
    },
    {
        "id": "EMP-104",
        "employee_id": "EMP-4455",
        "name": "P. Singh",
        "department": "HR",
        "designation": "HR Generalist",
        "manager": "V. Vance",
        "email": "p.singh@company.com",
        "device_info": {"hostname": "HR-THINKPAD-09", "os": "Windows 11 Pro", "ip": "10.4.22.14"},
        "access_privileges": ["Workday HR portal", "Employee File Storage"],
        "risk_score": 28.0,
        "risk_category": "Low",
        "status": "Active"
    },
    {
        "id": "EMP-105",
        "employee_id": "EMP-4452",
        "name": "L. Fontaine",
        "department": "Legal",
        "designation": "Counsel",
        "manager": "M. Sterling",
        "email": "l.fontaine@company.com",
        "device_info": {"hostname": "LEG-LAPTOP-02", "os": "macOS Ventura", "ip": "10.4.30.91"},
        "access_privileges": ["Litigation Vault", "IP Repository", "Executive Contracts"],
        "risk_score": 79.0,
        "risk_category": "High",
        "status": "Active"
    },
    {
        "id": "EMP-106",
        "employee_id": "EMP-4448",
        "name": "D. Kowalski",
        "department": "IT",
        "designation": "Sys Admin",
        "manager": "C. Miller",
        "email": "d.kowalski@company.com",
        "device_info": {"hostname": "IT-SERVER-ADMIN", "os": "Ubuntu 22.04 LTS", "ip": "10.4.5.11"},
        "access_privileges": ["Active Directory Admin", "Domain Controller", "Network Switch CLI"],
        "risk_score": 88.0,
        "risk_category": "Critical",
        "status": "Active"
    }
]

@router.get("", response_model=List[Employee])
def list_employees(department: Optional[str] = None):
    if department:
        return [e for e in EMPLOYEES_DB if e["department"].lower() == department.lower()]
    return EMPLOYEES_DB

@router.get("/{emp_id}", response_model=Employee)
def get_employee(emp_id: str):
    for e in EMPLOYEES_DB:
        if e["id"] == emp_id or e["employee_id"] == emp_id:
            return e
    raise HTTPException(status_code=404, detail="Employee not found")

@router.post("", response_model=Employee)
def create_employee(emp: Employee):
    EMPLOYEES_DB.append(emp.dict())
    return emp
