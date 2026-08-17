from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from uuid import UUID

from app.db.session import SessionLocal
from app.api import deps
from app.db import models
from app.schemas import base as schemas

api_router = APIRouter()

@api_router.get("/auth/me", response_model=schemas.User)
def get_current_user_profile(current_user: models.User = Depends(deps.get_current_user)):
    return current_user

@api_router.get("/users", response_model=List[schemas.User])
def list_users(db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.require_admin)):
    return db.query(models.User).all()

@api_router.get("/employees", response_model=List[schemas.Employee])
def list_employees(db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.get_current_user)):
    return db.query(models.Employee).all()

@api_router.post("/employees", response_model=schemas.Employee)
def create_employee(emp: schemas.EmployeeCreate, db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.get_current_user)):
    db_emp = models.Employee(**emp.model_dump())
    db.add(db_emp)
    db.commit()
    db.refresh(db_emp)
    return db_emp

@api_router.get("/employees/{emp_id}", response_model=schemas.Employee)
def get_employee(emp_id: UUID, db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.get_current_user)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    return emp

@api_router.put("/employees/{emp_id}", response_model=schemas.Employee)
def update_employee(emp_id: UUID, emp_update: schemas.EmployeeUpdate, db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.get_current_user)):
    emp = db.query(models.Employee).filter(models.Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
    
    update_data = emp_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(emp, key, value)
        
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp

@api_router.get("/departments", response_model=List[schemas.Department])
def list_departments(db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.get_current_user)):
    return db.query(models.Department).all()

@api_router.post("/departments", response_model=schemas.Department)
def create_department(dept: schemas.DepartmentBase, db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.require_admin)):
    db_dept = models.Department(**dept.model_dump())
    db.add(db_dept)
    db.commit()
    db.refresh(db_dept)
    return db_dept

@api_router.get("/devices", response_model=List[schemas.Device])
def list_devices(db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.get_current_user)):
    return db.query(models.Device).all()

@api_router.post("/devices", response_model=schemas.Device)
def create_device(device: schemas.DeviceBase, db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.get_current_user)):
    db_device = models.Device(**device.model_dump())
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@api_router.get("/activities", response_model=List[schemas.ActivityLog])
def list_activities(db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.get_current_user)):
    return db.query(models.ActivityLog).order_by(models.ActivityLog.timestamp.desc()).limit(100).all()

@api_router.get("/activities/{act_id}", response_model=schemas.ActivityLog)
def get_activity(act_id: UUID, db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.get_current_user)):
    act = db.query(models.ActivityLog).filter(models.ActivityLog.id == act_id).first()
    if not act:
        raise HTTPException(status_code=404, detail="Activity log not found")
    return act

@api_router.post("/activities/ingest", response_model=schemas.ActivityLog)
def ingest_activity(act: schemas.ActivityLogBase, db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.get_current_user)):
    db_act = models.ActivityLog(**act.model_dump())
    db.add(db_act)
    db.commit()
    db.refresh(db_act)
    return db_act

@api_router.get("/audit", response_model=List[schemas.AuditLog])
def list_audit_logs(db: Session = Depends(deps.get_db), current_user: models.User = Depends(deps.require_admin)):
    return db.query(models.AuditLog).order_by(models.AuditLog.timestamp.desc()).limit(100).all()
