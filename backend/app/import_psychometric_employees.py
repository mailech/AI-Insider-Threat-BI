import csv
from pathlib import Path

from app.database import SessionLocal
from app.models.employee import Employee


# ============================================================
# PSYCHOMETRIC CSV LOCATION
# ============================================================

CSV_PATH = Path(
    r"D:\CERT\archive (1)\r4.2\psychometric.csv"
)


# ============================================================
# DEFAULT EMPLOYEE INFORMATION
# ============================================================
# The psychometric.csv contains employee_name, user_id and
# Big Five personality values.
#
# It does NOT contain department, designation, manager,
# device information or access privileges.
#
# Therefore, these fields are temporarily marked as
# "Not Available" instead of inventing information.
# ============================================================

DEFAULT_DEPARTMENT = "Not Available"
DEFAULT_DESIGNATION = "Employee"
DEFAULT_MANAGER = "Not Available"
DEFAULT_DEVICE = "Not Available"
DEFAULT_ACCESS = "Standard"


# ============================================================
# IMPORT EMPLOYEES
# ============================================================

def import_employees():

    print("=" * 60)
    print("PSYCHOMETRIC EMPLOYEE IMPORT")
    print("=" * 60)

    # --------------------------------------------------------
    # Check CSV file
    # --------------------------------------------------------

    if not CSV_PATH.exists():

        print()
        print("ERROR: Psychometric CSV file not found.")
        print()
        print("Expected location:")
        print(CSV_PATH)
        print()

        return

    print()
    print("CSV file found:")
    print(CSV_PATH)
    print()

    db = SessionLocal()

    inserted = 0
    updated = 0
    skipped = 0

    try:

        # ----------------------------------------------------
        # Read CSV
        # ----------------------------------------------------

        with open(
            CSV_PATH,
            "r",
            encoding="utf-8-sig",
            newline=""
        ) as file:

            reader = csv.DictReader(file)

            print("CSV columns:")
            print(reader.fieldnames)
            print()

            # ------------------------------------------------
            # Process every employee
            # ------------------------------------------------

            for row in reader:

                employee_name = (
                    row.get("employee_name") or ""
                ).strip()

                user_id = (
                    row.get("user_id") or ""
                ).strip()

                # --------------------------------------------
                # Validate required information
                # --------------------------------------------

                if not employee_name or not user_id:

                    skipped += 1
                    continue

                # --------------------------------------------
                # Check existing employee
                # --------------------------------------------

                existing_employee = (
                    db.query(Employee)
                    .filter(
                        Employee.employee_id == user_id
                    )
                    .first()
                )

                # --------------------------------------------
                # Update existing employee
                # --------------------------------------------

                if existing_employee:

                    existing_employee.full_name = employee_name

                    updated += 1

                # --------------------------------------------
                # Create new employee
                # --------------------------------------------

                else:

                    new_employee = Employee(

                        employee_id=user_id,

                        full_name=employee_name,

                        department=DEFAULT_DEPARTMENT,

                        designation=DEFAULT_DESIGNATION,

                        manager=DEFAULT_MANAGER,

                        device_information=DEFAULT_DEVICE,

                        access_privileges=DEFAULT_ACCESS,

                        risk_level="Low",

                        status="Active"
                    )

                    db.add(new_employee)

                    inserted += 1

                # --------------------------------------------
                # Commit every 100 records
                # --------------------------------------------

                processed = inserted + updated

                if processed > 0 and processed % 100 == 0:

                    db.commit()

                    print(
                        f"Processed: {processed}"
                    )

            # ------------------------------------------------
            # Final commit
            # ------------------------------------------------

            db.commit()

        # ----------------------------------------------------
        # Success message
        # ----------------------------------------------------

        print()
        print("=" * 60)
        print("IMPORT COMPLETED SUCCESSFULLY")
        print("=" * 60)
        print(f"Inserted : {inserted}")
        print(f"Updated  : {updated}")
        print(f"Skipped  : {skipped}")
        print("=" * 60)

    except Exception as error:

        db.rollback()

        print()
        print("=" * 60)
        print("IMPORT FAILED")
        print("=" * 60)
        print("Error:")
        print(error)
        print("=" * 60)

        raise

    finally:

        db.close()


# ============================================================
# RUN SCRIPT
# ============================================================

if __name__ == "__main__":
    import_employees()