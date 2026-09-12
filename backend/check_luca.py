from app.database import SessionLocal
from app.models import Employee, Incident

db = SessionLocal()
emp = db.query(Employee).filter(Employee.full_name == "Luca Ferrari").first()
if emp:
    incidents = db.query(Incident).filter(Incident.employee_id == emp.id).all()
    print(f"--- Luca Ferrari (id={emp.id}) ---")
    for i in incidents:
        print("title:", i.title)
        print("description:", i.description)
        print("mitre:", i.mitre_technique_id, i.mitre_technique_name)
        print("severity:", i.severity)
        print()
else:
    print("NOT FOUND")
