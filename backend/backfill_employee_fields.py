"""
Back-fill device info and access_level for employees seeded before the Milestone 1 migration.
Also sets updated_at where it is NULL.
"""
import sys, pathlib, datetime
sys.path.insert(0, str(pathlib.Path(__file__).parent))

from sqlalchemy import text
from app.db.session import engine

EMPLOYEE_BACKFILL = {
    "emp_1001": {"device_id": "ASSET-LT-001", "ip_address": "10.0.1.101", "os_type": "Windows 11",  "access_level": "WRITE"},
    "emp_1002": {"device_id": "ASSET-LT-002", "ip_address": "10.0.1.102", "os_type": "Ubuntu 22.04","access_level": "ADMIN"},
    "emp_1003": {"device_id": "ASSET-DT-003", "ip_address": "10.0.1.103", "os_type": "macOS 14",    "access_level": "WRITE"},
    "emp_1004": {"device_id": "ASSET-LT-006", "ip_address": "10.0.2.11",  "os_type": "Windows 11",  "access_level": "READ"},
    "emp_1005": {"device_id": "ASSET-LT-008", "ip_address": "10.0.2.22",  "os_type": "Windows 10",  "access_level": "WRITE"},
    "emp_1006": {"device_id": "ASSET-LT-011", "ip_address": "10.0.4.11",  "os_type": "Windows 11",  "access_level": "READ"},
    "emp_1007": {"device_id": "ASSET-LT-013", "ip_address": "10.0.5.15",  "os_type": "macOS 14",    "access_level": "READ"},
    "emp_1008": {"device_id": "ASSET-LT-015", "ip_address": "10.0.6.20",  "os_type": "Windows 11",  "access_level": "READ"},
    "emp_1009": {"device_id": "ASSET-LT-006", "ip_address": "10.0.2.15",  "os_type": "Windows 11",  "access_level": "READ"},
    "emp_1010": {"device_id": "ASSET-LT-008", "ip_address": "10.0.2.30",  "os_type": "Windows 10",  "access_level": "READ"},
    "emp_1011": {"device_id": "ASSET-LT-015", "ip_address": "10.0.6.25",  "os_type": "Windows 11",  "access_level": "READ"},
    "emp_1012": {"device_id": "ASSET-LT-013", "ip_address": "10.0.5.20",  "os_type": "macOS 14",    "access_level": "READ"},
    "emp_1013": {"device_id": "ASSET-DT-009", "ip_address": "10.0.3.99",  "os_type": "Ubuntu 22.04","access_level": "ADMIN"},
    "emp_1014": {"device_id": "ASSET-LT-001", "ip_address": "10.0.1.105", "os_type": "Windows 10",  "access_level": "READ"},
    "emp_1015": {"device_id": "ASSET-DT-003", "ip_address": "10.0.1.107", "os_type": "Ubuntu 22.04","access_level": "WRITE"},
}

now_str = datetime.datetime.utcnow().isoformat()

with engine.connect() as conn:
    for emp_id, fields in EMPLOYEE_BACKFILL.items():
        conn.execute(text(
            """UPDATE employees
               SET device_id = :device_id,
                   ip_address = :ip_address,
                   os_type = :os_type,
                   access_level = :access_level,
                   updated_at = COALESCE(updated_at, :now)
               WHERE emp_id = :emp_id
                 AND (device_id IS NULL OR device_id = '')"""
        ), {**fields, "emp_id": emp_id, "now": now_str})
        print(f"  Back-filled: {emp_id}")
    conn.commit()

print("Back-fill complete.")
