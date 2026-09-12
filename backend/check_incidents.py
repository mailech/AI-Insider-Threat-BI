from app.database import SessionLocal
from app.models import Employee, Incident

db = SessionLocal()
print("Incident columns:", Incident.__table__.columns.keys())
print()

for name in ["Elena Rostova", "Marcus Hale", "Luca Ferrari"]:
    emp = db.query(Employee).filter(Employee.full_name == name).first()
    if emp:
        incidents = db.query(Incident).filter(Incident.employee_id == emp.id).all()
        print(f"--- {name} (id={emp.id}) ---")
        for i in incidents:
            print(vars(i))
    else:
        print(f"--- {name}: NOT FOUND ---")
    print()
