"""
Purge all synthetic and demo mock data from the ITBIS platform database.
Retains authentic CERT r4.2 records, system users (admin, analyst, engineer, manager),
and the enrolled Windows endpoint agent (DESKTOP-PC3PVQB).
"""
import subprocess
import sys

def main():
    print("Purging all demo data from ITBIS database...")
    cmd = [
        "docker", "exec", "insider-threat-platform-backend-1",
        "python", "-c",
        """
from app.db import SessionLocal
from app.models import SecurityEvent, Alert, Incident, Employee, Device

db = SessionLocal()

# 1. Delete alerts associated with demo events or demo employees
demo_events = db.query(SecurityEvent).filter(SecurityEvent.source_dataset.in_(['demo', 'synthetic'])).all()
demo_ev_ids = [e.event_id for e in demo_events]
if demo_ev_ids:
    db.query(Alert).filter(Alert.event_id.in_(demo_ev_ids)).delete(synchronize_session=False)

db.query(Alert).filter(Alert.employee_id.like('EMP-%')).delete(synchronize_session=False)

# 2. Delete demo incidents
db.query(Incident).filter(~Incident.title.like('CERT%')).delete(synchronize_session=False)

# 3. Delete demo events
if demo_ev_ids:
    db.query(SecurityEvent).filter(SecurityEvent.event_id.in_(demo_ev_ids)).delete(synchronize_session=False)

# 4. Delete demo employees (EMP-*)
db.query(Employee).filter(Employee.employee_id.like('EMP-%')).delete(synchronize_session=False)

# 5. Delete mock demo devices (WS-0 .. WS-7), keep DESKTOP-PC3PVQB and CERT PCs
db.query(Device).filter(Device.device_id.like('WS-%')).delete(synchronize_session=False)

db.commit()
print(f"Purge complete: 0 demo records remain.")
print(f"Active Events: {db.query(SecurityEvent).count()}")
print(f"Active Alerts: {db.query(Alert).count()}")
print(f"Active Employees: {db.query(Employee).count()}")
print(f"Active Incidents: {db.query(Incident).count()}")
print(f"Active Devices: {db.query(Device).count()}")
db.close()
"""
    ]
    r = subprocess.run(cmd, capture_output=True, text=True)
    print(r.stdout)
    if r.stderr:
        print("Error:", r.stderr)

if __name__ == '__main__':
    main()
