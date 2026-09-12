from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from app.database import Base


class Employee(Base):
    __tablename__ = "employees"

    id = Column(Integer, primary_key=True, index=True)
    employee_id = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False)
    department = Column(String(100))
    role = Column(String(50))
    status = Column(String(20), default="ACTIVE")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(Integer, primary_key=True, index=True)
    asset_id = Column(String(50), unique=True, nullable=False)
    employee_id = Column(Integer, ForeignKey("employees.id"))
    asset_type = Column(String(50))
    asset_name = Column(String(100))
    status = Column(String(20), default="ACTIVE")