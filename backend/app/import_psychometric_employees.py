import csv
from pathlib import Path

from app.database import SessionLocal
from app.models.employee import Employee


# ============================================================
# DATASET LOCATIONS
# ============================================================

DATASET_ROOT = Path(
    r"D:\CERT\archive (1)\r4.2"
)

PSYCHOMETRIC_CSV = DATASET_ROOT / "psychometric.csv"
LDAP_DIR = DATASET_ROOT / "LDAP"


# ============================================================
# FALLBACK VALUES
# ============================================================

DEFAULT_DEPARTMENT = "Not Available"
DEFAULT_DESIGNATION = "Employee"
DEFAULT_MANAGER = "Not Available"
DEFAULT_DEVICE = "Not Available"
DEFAULT_ACCESS = "Standard"


# ============================================================
# LOAD LDAP EMPLOYEE INFORMATION
# ============================================================

def load_ldap_employees():

    ldap_employees = {}

    ldap_files = sorted(
        LDAP_DIR.glob("*.csv")
    )

    print()
    print("=" * 60)
    print("LOADING LDAP EMPLOYEE INFORMATION")
    print("=" * 60)

    print(f"LDAP files found: {len(ldap_files)}")

    for ldap_file in ldap_files:

        print(f"Reading: {ldap_file.name}")

        with open(
            ldap_file,
            "r",
            encoding="utf-8-sig",
            newline=""
        ) as file:

            reader = csv.DictReader(file)

            for row in reader:

                user_id = (
                    row.get("user_id") or ""
                ).strip()

                if not user_id:
                    continue

                # Because files are processed in chronological
                # order, later files overwrite earlier records.
                ldap_employees[user_id] = {
                    "employee_name": (
                        row.get("employee_name") or ""
                    ).strip(),

                    "email": (
                        row.get("email") or ""
                    ).strip(),

                    "department": (
                        row.get("department") or ""
                    ).strip(),

                    "designation": (
                        row.get("role") or ""
                    ).strip(),

                    "manager": (
                        row.get("supervisor") or ""
                    ).strip(),
                }

    print()
    print(
        f"LDAP employees loaded: {len(ldap_employees)}"
    )

    return ldap_employees


# ============================================================
# IMPORT EMPLOYEES
# ============================================================

def import_employees():

    print()
    print("=" * 60)
    print("PSYCHOMETRIC EMPLOYEE IMPORT")
    print("=" * 60)

    # --------------------------------------------------------
    # Check psychometric CSV
    # --------------------------------------------------------

    if not PSYCHOMETRIC_CSV.exists():

        print()
        print("ERROR: Psychometric CSV file not found.")
        print()
        print(
            "Expected location:"
        )
        print(PSYCHOMETRIC_CSV)

        return

    # --------------------------------------------------------
    # Check LDAP directory
    # --------------------------------------------------------

    if not LDAP_DIR.exists():

        print()
        print("ERROR: LDAP directory not found.")
        print()
        print(
            "Expected location:"
        )
        print(LDAP_DIR)

        return

    # --------------------------------------------------------
    # Load LDAP information
    # --------------------------------------------------------

    ldap_employees = load_ldap_employees()

    db = SessionLocal()

    inserted = 0
    updated = 0
    skipped = 0
    ldap_matched = 0
    ldap_missing = 0

    try:

        # ----------------------------------------------------
        # Read psychometric CSV
        # ----------------------------------------------------

        with open(
            PSYCHOMETRIC_CSV,
            "r",
            encoding="utf-8-sig",
            newline=""
        ) as file:

            reader = csv.DictReader(file)

            print()
            print("Psychometric CSV columns:")
            print(reader.fieldnames)

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
                # Find employee in LDAP
                # --------------------------------------------

                ldap_data = ldap_employees.get(
                    user_id
                )

                if ldap_data:

                    ldap_matched += 1

                    department = (
                        ldap_data["department"]
                        or DEFAULT_DEPARTMENT
                    )

                    designation = (
                        ldap_data["designation"]
                        or DEFAULT_DESIGNATION
                    )

                    manager = (
                        ldap_data["manager"]
                        or DEFAULT_MANAGER
                    )

                else:

                    ldap_missing += 1

                    department = DEFAULT_DEPARTMENT
                    designation = DEFAULT_DESIGNATION
                    manager = DEFAULT_MANAGER

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

                    existing_employee.full_name = (
                        employee_name
                    )

                    existing_employee.department = (
                        department
                    )

                    existing_employee.designation = (
                        designation
                    )

                    existing_employee.manager = (
                        manager
                    )

                    updated += 1

                # --------------------------------------------
                # Create new employee
                # --------------------------------------------

                else:

                    new_employee = Employee(

                        employee_id=user_id,

                        full_name=employee_name,

                        department=department,

                        designation=designation,

                        manager=manager,

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

                if (
                    processed > 0
                    and processed % 100 == 0
                ):

                    db.commit()

                    print(
                        f"Processed: {processed}"
                    )

            # ------------------------------------------------
            # Final commit
            # ------------------------------------------------

            db.commit()

        # ----------------------------------------------------
        # Import summary
        # ----------------------------------------------------

        print()
        print("=" * 60)
        print("IMPORT COMPLETED SUCCESSFULLY")
        print("=" * 60)

        print(
            f"Inserted       : {inserted}"
        )

        print(
            f"Updated        : {updated}"
        )

        print(
            f"Skipped        : {skipped}"
        )

        print(
            f"LDAP matched   : {ldap_matched}"
        )

        print(
            f"LDAP missing   : {ldap_missing}"
        )

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