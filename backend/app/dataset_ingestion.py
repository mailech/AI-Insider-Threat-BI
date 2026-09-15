from pathlib import Path
from datetime import datetime

import pandas as pd
from sqlalchemy.orm import Session

from .models import Employee, Activity


# ============================================================
# CERT DATASET LOCATION
# ============================================================

BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "data" / "cert_r4_2"


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def safe_text(value, default=""):
    """Convert dataset values safely to text."""
    if value is None:
        return default

    try:
        if pd.isna(value):
            return default
    except Exception:
        pass

    return str(value).strip()


def parse_datetime(value):
    """Convert CERT date value into Python datetime."""
    try:
        parsed = pd.to_datetime(value)

        if pd.isna(parsed):
            return datetime.utcnow()

        return parsed.to_pydatetime()

    except Exception:
        return datetime.utcnow()


def get_or_create_employee(
    db: Session,
    employee_id: str,
    device: str = "",
):
    """Create an employee automatically when CERT data is imported."""

    employee = (
        db.query(Employee)
        .filter(Employee.employee_id == employee_id)
        .first()
    )

    if employee:
        if device and not employee.device:
            employee.device = device

        return employee

    employee = Employee(
        employee_id=employee_id,
        name=employee_id,
        department="CERT Dataset",
        designation="Dataset User",
        manager="",
        device=device,
        access_privileges="Standard",
    )

    db.add(employee)
    db.flush()

    return employee


def add_activity(
    db: Session,
    employee_id: str,
    timestamp,
    activity_type: str,
    resource: str = "",
    source_ip: str = "",
    bytes_transferred: int = 0,
    privilege_level: str = "normal",
    success: int = 1,
):
    """Create a normalized SENTINEL activity."""

    activity = Activity(
        employee_id=employee_id,
        timestamp=parse_datetime(timestamp),
        activity_type=activity_type,
        resource=safe_text(resource)[:255],
        source_ip=safe_text(source_ip)[:80],
        bytes_transferred=int(bytes_transferred or 0),
        privilege_level=safe_text(privilege_level, "normal")[:40],
        success=int(success),
    )

    db.add(activity)


# ============================================================
# LOGON DATA
# ============================================================

def ingest_logon(
    db: Session,
    limit: int = 50000,
):
    """Import CERT logon events."""

    path = DATASET_DIR / "logon.csv"

    if not path.exists():
        return 0

    count = 0

    for chunk in pd.read_csv(
        path,
        chunksize=5000,
        low_memory=False,
    ):

        for _, row in chunk.iterrows():

            if count >= limit:
                db.commit()
                return count

            employee_id = safe_text(row.get("user"))

            if not employee_id:
                continue

            pc = safe_text(row.get("pc"))
            action = safe_text(
                row.get("activity"),
                "Logon",
            )

            get_or_create_employee(
                db,
                employee_id,
                pc,
            )

            add_activity(
                db=db,
                employee_id=employee_id,
                timestamp=row.get("date"),
                activity_type=f"Login - {action}",
                resource=pc,
                privilege_level="normal",
                success=1,
            )

            count += 1

        db.commit()

    return count


# ============================================================
# DEVICE DATA
# ============================================================

def ingest_device(
    db: Session,
    limit: int = 30000,
):
    """Import CERT device / USB activity."""

    path = DATASET_DIR / "device.csv"

    if not path.exists():
        return 0

    count = 0

    for chunk in pd.read_csv(
        path,
        chunksize=5000,
        low_memory=False,
    ):

        for _, row in chunk.iterrows():

            if count >= limit:
                db.commit()
                return count

            employee_id = safe_text(row.get("user"))

            if not employee_id:
                continue

            pc = safe_text(row.get("pc"))
            action = safe_text(
                row.get("activity"),
                "Device Activity",
            )

            get_or_create_employee(
                db,
                employee_id,
                pc,
            )

            add_activity(
                db=db,
                employee_id=employee_id,
                timestamp=row.get("date"),
                activity_type="USB / Device",
                resource=f"{pc} - {action}",
                privilege_level="normal",
                success=1,
            )

            count += 1

        db.commit()

    return count


# ============================================================
# FILE DATA
# ============================================================

def ingest_file(
    db: Session,
    limit: int = 30000,
):
    """Import CERT file access events."""

    path = DATASET_DIR / "file.csv"

    if not path.exists():
        return 0

    count = 0

    for chunk in pd.read_csv(
        path,
        chunksize=5000,
        low_memory=False,
    ):

        for _, row in chunk.iterrows():

            if count >= limit:
                db.commit()
                return count

            employee_id = safe_text(row.get("user"))

            if not employee_id:
                continue

            pc = safe_text(row.get("pc"))
            filename = safe_text(row.get("filename"))

            action = safe_text(
                row.get("activity"),
                "File Access",
            )

            get_or_create_employee(
                db,
                employee_id,
                pc,
            )

            action_lower = action.lower()

            if action_lower in {
                "file copy",
                "copy",
                "write",
                "download",
            }:
                activity_type = "File Download / Copy"
            else:
                activity_type = "File Access"

            add_activity(
                db=db,
                employee_id=employee_id,
                timestamp=row.get("date"),
                activity_type=activity_type,
                resource=filename,
                privilege_level="normal",
                success=1,
            )

            count += 1

        db.commit()

    return count


# ============================================================
# EMAIL DATA
# ============================================================

def ingest_email(
    db: Session,
    limit: int = 30000,
):
    """Import CERT email communication events."""

    path = DATASET_DIR / "email.csv"

    if not path.exists():
        return 0

    count = 0

    for chunk in pd.read_csv(
        path,
        chunksize=5000,
        low_memory=False,
    ):

        for _, row in chunk.iterrows():

            if count >= limit:
                db.commit()
                return count

            employee_id = safe_text(row.get("user"))

            if not employee_id:
                continue

            pc = safe_text(row.get("pc"))
            recipient = safe_text(row.get("to"))

            size = row.get("size", 0)

            try:
                size = int(float(size))
            except Exception:
                size = 0

            get_or_create_employee(
                db,
                employee_id,
                pc,
            )

            add_activity(
                db=db,
                employee_id=employee_id,
                timestamp=row.get("date"),
                activity_type="Email Communication",
                resource=recipient,
                bytes_transferred=size,
                privilege_level="normal",
                success=1,
            )

            count += 1

        db.commit()

    return count


# ============================================================
# MAIN CERT DATASET INGESTION
# ============================================================

def ingest_cert_dataset(
    db: Session,
    logon_limit: int = 50000,
    device_limit: int = 30000,
    file_limit: int = 30000,
    email_limit: int = 30000,
):
    """
    Import selected CERT Insider Threat Dataset r4.2
    files into the SENTINEL activity database.

    Selected files:
        - logon.csv
        - device.csv
        - file.csv
        - email.csv

    HTTP dataset is intentionally not imported because
    it is extremely large and is not required for the
    first SENTINEL integration.
    """

    results = {}

    results["logon"] = ingest_logon(
        db,
        limit=logon_limit,
    )

    results["device"] = ingest_device(
        db,
        limit=device_limit,
    )

    results["file"] = ingest_file(
        db,
        limit=file_limit,
    )

    results["email"] = ingest_email(
        db,
        limit=email_limit,
    )

    db.commit()

    total = sum(results.values())

    return {
        "dataset": "CERT Insider Threat Dataset r4.2",
        "files": results,
        "total_activities": total,
    }