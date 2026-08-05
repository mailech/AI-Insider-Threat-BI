from sqlalchemy import Column, Integer, String

from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)

    employee_id = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)

    department = Column(String, nullable=False)
    designation = Column(String, nullable=False)

    manager = Column(String, nullable=False)

    device_information = Column(String, nullable=False)

    access_privileges = Column(String, nullable=False)