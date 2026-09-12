from pydantic import BaseModel


class EmployeeCreate(BaseModel):
    employee_id: str
    name: str
    email: str
    department: str | None = None
    role: str | None = None


class EmployeeResponse(EmployeeCreate):
    id: int
    status: str

    class Config:
        from_attributes = True