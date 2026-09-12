"""
AMS Demo Database Reset Utility
--------------------------------
Resets the Activity Management System database to a pristine demo state in seconds.
Rebuilds schema, seeds 16 employees, 1000+ telemetry logs, 30-day baselines,
23 consolidated threat situations, and retrains the Isolation Forest ML model.

Usage:
    python reset_demo.py
"""

import os
import sys
import time

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import engine, Base, SessionLocal
from app.models import Employee, TelemetryLog, Incident, InvestigationNote, AuditLog
from app.seed import seed_database
from app.ml_service import train_and_evaluate_ml_model, get_ml_model_metadata


def main():
    print("=" * 70)
    print("  ACTIVITY MANAGEMENT SYSTEM (AMS) — DEMO DATABASE RE-SEEDER")
    print("=" * 70)
    start_time = time.time()

    db_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "ams.db")
    
    print(f"[*] Target SQLite Database: {db_path}")
    
    # 1. Drop existing tables and recreate cleanly
    print("[*] Rebuilding database tables from SQLAlchemy metadata...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("    [+] All database tables recreated successfully.")

    # 2. Run full seeding pipeline
    db = SessionLocal()
    try:
        print("[*] Seeding organizational hierarchy, telemetry stream & baseline profiles...")
        seed_database(db)
        print("    [+] Employees, telemetry logs, and baseline metrics populated.")

        # 3. Train & Evaluate ML Isolation Forest Model
        print("[*] Fitting and calibrating Isolation Forest ML Corroboration Model...")
        ml_result = train_and_evaluate_ml_model(db)
        print("    [+] ML Model trained across 5 telemetry feature vectors.")

        # 4. Extract verification summary
        emp_count = db.query(Employee).count()
        log_count = db.query(TelemetryLog).count()
        inc_count = db.query(Incident).count()
        notes_count = db.query(InvestigationNote).count()
        audit_count = db.query(AuditLog).count()

        open_inc = db.query(Incident).filter(Incident.status == "Open").count()
        inv_inc = db.query(Incident).filter(Incident.status == "Investigating").count()
        esc_inc = db.query(Incident).filter(Incident.status == "Escalated").count()
        res_inc = db.query(Incident).filter(Incident.status == "Resolved").count()

        elapsed = round(time.time() - start_time, 2)

        print("\n" + "=" * 70)
        print("  DEMO ENVIRONMENT RESET COMPLETED SUCCESSFULLY")
        print("=" * 70)
        print(f"  Execution Time:               {elapsed} seconds")
        print(f"  Employee Profiles:            {emp_count} active employees across 5 departments")
        print(f"  Telemetry Logs:               {log_count} events (LOGIN, FILE, DATA, USB, NETWORK, etc.)")
        print(f"  Consolidated Incident Cases:  {inc_count} distinct situations (48h situation window)")
        print(f"    - Open Triage:              {open_inc}")
        print(f"    - Active Investigation:     {inv_inc}")
        print(f"    - Escalated Tier-2:         {esc_inc}")
        print(f"    - Resolved & Closed:        {res_inc}")
        print(f"  Investigation Notes:          {notes_count} timestamped case annotations")
        print(f"  Audit Trail Records:          {audit_count} entries")
        print(f"  ML Corroboration Engine:      Isolation Forest (n_samples={ml_result.get('sample_size', emp_count)}, status=ACTIVE)")
        print("=" * 70)
        print("  System is ready for live mentor presentation on http://localhost:4000\n")

    except Exception as e:
        print(f"\n[!] ERROR during demo reset: {e}")
        db.rollback()
        raise e
    finally:
        db.close()


if __name__ == "__main__":
    main()
