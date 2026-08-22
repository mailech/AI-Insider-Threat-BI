"""
Back-fill device info, access_level, and asset records for any employees missing them.
Ensures all employees have valid device_id, os_type, ip_address, and a linked Asset.
"""
import sys, pathlib, datetime
sys.path.insert(0, str(pathlib.Path(__file__).parent))

from app.db.session import SessionLocal
from app.models.domain import Employee, Asset, AssetTypeEnum, AccessLevelEnum

EMPLOYEE_BACKFILL = {
    "emp_1001": {"device_id": "ASSET-LT-001", "ip_address": "10.0.1.101", "os_type": "Windows 11",  "access_level": AccessLevelEnum.WRITE},
    "emp_1002": {"device_id": "ASSET-LT-002", "ip_address": "10.0.1.102", "os_type": "Ubuntu 22.04","access_level": AccessLevelEnum.ADMIN},
    "emp_1003": {"device_id": "ASSET-DT-003", "ip_address": "10.0.1.103", "os_type": "macOS 14",    "access_level": AccessLevelEnum.WRITE},
    "emp_1004": {"device_id": "ASSET-LT-006", "ip_address": "10.0.2.11",  "os_type": "Windows 11",  "access_level": AccessLevelEnum.READ},
    "emp_1005": {"device_id": "ASSET-LT-008", "ip_address": "10.0.2.22",  "os_type": "Windows 10",  "access_level": AccessLevelEnum.WRITE},
    "emp_1006": {"device_id": "ASSET-LT-011", "ip_address": "10.0.4.11",  "os_type": "Windows 11",  "access_level": AccessLevelEnum.READ},
    "emp_1007": {"device_id": "ASSET-LT-013", "ip_address": "10.0.5.15",  "os_type": "macOS 14",    "access_level": AccessLevelEnum.READ},
    "emp_1008": {"device_id": "ASSET-LT-015", "ip_address": "10.0.6.20",  "os_type": "Windows 11",  "access_level": AccessLevelEnum.READ},
    "emp_1009": {"device_id": "ASSET-LT-006", "ip_address": "10.0.2.15",  "os_type": "Windows 11",  "access_level": AccessLevelEnum.READ},
    "emp_1010": {"device_id": "ASSET-LT-008", "ip_address": "10.0.2.30",  "os_type": "Windows 10",  "access_level": AccessLevelEnum.READ},
    "emp_1011": {"device_id": "ASSET-LT-015", "ip_address": "10.0.6.25",  "os_type": "Windows 11",  "access_level": AccessLevelEnum.READ},
    "emp_1012": {"device_id": "ASSET-LT-013", "ip_address": "10.0.5.20",  "os_type": "macOS 14",    "access_level": AccessLevelEnum.READ},
    "emp_1013": {"device_id": "ASSET-DT-009", "ip_address": "10.0.3.99",  "os_type": "Ubuntu 22.04","access_level": AccessLevelEnum.ADMIN},
    "emp_1014": {"device_id": "ASSET-LT-001", "ip_address": "10.0.1.105", "os_type": "Windows 10",  "access_level": AccessLevelEnum.READ},
    "emp_1015": {"device_id": "ASSET-DT-003", "ip_address": "10.0.1.107", "os_type": "Ubuntu 22.04","access_level": AccessLevelEnum.WRITE},
}

def generate_default_ip(emp_id: str) -> str:
    parts = emp_id.split("_")
    if len(parts) > 1 and parts[-1].isdigit():
        num = int(parts[-1])
        subnet = (num // 250) % 250 + 1
        host = (num % 250) + 1
        return f"10.0.{subnet}.{host}"
    h = abs(hash(emp_id))
    return f"10.0.{(h >> 8) % 250 + 1}.{(h & 0xFF) % 250 + 1}"

def backfill_employees() -> None:
    db = SessionLocal()
    try:
        employees = db.query(Employee).all()
        updated_count = 0
        assets_created = 0

        for emp in employees:
            changed = False
            # Check known fixtures first
            if emp.emp_id in EMPLOYEE_BACKFILL:
                fix = EMPLOYEE_BACKFILL[emp.emp_id]
                if not emp.device_id:
                    emp.device_id = fix["device_id"]
                    changed = True
                if not emp.ip_address:
                    emp.ip_address = fix["ip_address"]
                    changed = True
                if not emp.os_type:
                    emp.os_type = fix["os_type"]
                    changed = True
                if not emp.access_level:
                    emp.access_level = fix["access_level"]
                    changed = True

            # General default fallback for any employee
            if not emp.device_id:
                emp.device_id = f"{emp.emp_id}-laptop"
                changed = True
            if not emp.os_type:
                emp.os_type = "Windows 11"
                changed = True
            if not emp.ip_address:
                emp.ip_address = generate_default_ip(emp.emp_id)
                changed = True
            if not emp.access_level:
                emp.access_level = AccessLevelEnum.READ
                changed = True
            if not emp.updated_at:
                emp.updated_at = datetime.datetime.utcnow()
                changed = True

            if changed:
                updated_count += 1
                print(f"  Back-filled employee: {emp.emp_id} -> device_id={emp.device_id}, os_type={emp.os_type}, ip={emp.ip_address}")

            # Check if an Asset record exists for this employee
            has_device_asset = any(a.asset_type == AssetTypeEnum.DEVICE for a in emp.assets)
            if not has_device_asset:
                new_asset = Asset(
                    asset_id=emp.device_id,
                    asset_type=AssetTypeEnum.DEVICE,
                    ip_address=emp.ip_address,
                    mac_address=None,
                    employee_id=emp.id,
                )
                db.add(new_asset)
                assets_created += 1
                print(f"  Created default Asset for {emp.emp_id}: {emp.device_id}")

        db.commit()
        print(f"Back-fill complete: {updated_count} employees updated, {assets_created} assets created.")
    finally:
        db.close()

if __name__ == "__main__":
    backfill_employees()
