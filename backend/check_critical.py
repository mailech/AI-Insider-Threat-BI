from app.database import SessionLocal
from app.models import Employee, Incident

db = SessionLocal()
incidents = db.query(Incident).filter(Incident.severity == "CRITICAL").all()
print(f"Found {len(incidents)} CRITICAL incidents\n")
for i in incidents:
    emp = db.query(Employee).filter(Employee.id == i.employee_id).first()
    name = emp.full_name if emp else "UNKNOWN"
    dept = getattr(emp, "department", "?") if emp else "?"
    print(f"[{i.incident_id}] {name} ({dept}) — {i.title}")
    print(f"   MITRE: {i.mitre_technique_id} {i.mitre_technique_name}")
    print(f"   {i.description}")
    print()
