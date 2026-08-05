from pydantic import BaseModel


# ----------------------------
# Employee Creation Schema
# ----------------------------
class EmployeeCreate(BaseModel):
    employee_id: str
    full_name: str
    department: str
    designation: str
    manager: str
    device_information: str
    access_privileges: str


# ----------------------------
# Employee Response Schema
# ----------------------------
class EmployeeResponse(BaseModel):
    id: int
    employee_id: str
    full_name: str
    department: str
    designation: str
    manager: str
    device_information: str
    access_privileges: str

    class Config:
        from_attributes = True