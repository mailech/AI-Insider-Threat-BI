import datetime
from typing import Optional, List, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import DeviceAsset, Employee, TelemetryLog, User
from app.schemas import DeviceFleetItem, DeviceFleetListResponse
from app.auth import get_current_user

router = APIRouter(prefix="/devices", tags=["Entity / Device-Centric Fleet Intelligence"])


@router.get("", response_model=DeviceFleetListResponse)
def get_device_fleet(
    device_type: Optional[str] = Query(None, description="Filter by device type (Laptop, Workstation, Cloud Bastion, Mobile)"),
    risk_status: Optional[str] = Query(None, description="Filter by risk status (NORMAL, ELEVATED, HIGH_ANOMALY_DENSITY)"),
    search: Optional[str] = Query(None, description="Search keyword across asset ID, IP, MAC, employee name"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Feature D: Entity/Device-Centric View.
    Aggregates all hardware assets across the fleet, correlating device-level telemetry volume,
    anomaly densities, and elevated risk status independent of employee assignment.
    """
    assets = db.query(DeviceAsset).join(Employee, DeviceAsset.employee_id == Employee.id).all()

    device_items: List[DeviceFleetItem] = []
    type_counts: Dict[str, int] = {}
    elevated_count = 0

    for asset in assets:
        emp = asset.employee
        d_type = asset.asset_type or "Laptop"
        type_counts[d_type] = type_counts.get(d_type, 0) + 1

        # Query all telemetry logs for this device asset (by IP or by employee matching asset)
        logs = db.query(TelemetryLog).filter(
            (TelemetryLog.source_ip == asset.ip_address) |
            (TelemetryLog.employee_id == asset.employee_id)
        ).order_by(desc(TelemetryLog.timestamp)).all()

        total_events = len(logs)
        anomaly_logs = [l for l in logs if l.anomaly_category or l.severity in ["CRITICAL", "HIGH"]]
        anomaly_count = len(anomaly_logs)

        recent_cats = list(dict.fromkeys([l.anomaly_category for l in anomaly_logs if l.anomaly_category]))[:3]
        last_seen = logs[0].timestamp if logs else (emp.last_active or datetime.datetime.utcnow())

        # Determine risk status based on anomaly density
        if anomaly_count >= 4:
            r_status = "HIGH_ANOMALY_DENSITY"
            elevated_count += 1
        elif anomaly_count >= 1:
            r_status = "ELEVATED"
            elevated_count += 1
        else:
            r_status = "NORMAL"

        # Apply filters
        if device_type and device_type.lower() != "all" and d_type.lower() != device_type.lower():
            continue
        if risk_status and risk_status.lower() != "all" and r_status.lower() != risk_status.lower():
            continue
        if search and search.strip():
            term = search.strip().lower()
            match_asset = term in asset.asset_id.lower()
            match_ip = term in asset.ip_address.lower()
            match_mac = (asset.mac_address and term in asset.mac_address.lower())
            match_emp = emp and (term in emp.full_name.lower() or term in emp.id.lower() or term in emp.department.lower())
            if not (match_asset or match_ip or match_mac or match_emp):
                continue

        # Model name heuristic
        model_name = "Dell Latitude 5530" if d_type == "Laptop" else "Precision Tower 7865" if d_type == "Workstation" else "AWS EC2 Bastion" if d_type == "Cloud Bastion" else "iPhone 15 Pro (MDM)"

        device_items.append(DeviceFleetItem(
            id=asset.id,
            asset_id=asset.asset_id,
            device_type=d_type,
            model_name=model_name,
            assigned_ip=asset.ip_address,
            mac_address=asset.mac_address or "00:1A:2B:3C:4D:5E",
            os_version=asset.os_name or "Windows 11 Enterprise",
            employee_id=asset.employee_id,
            employee_name=emp.full_name if emp else asset.employee_id,
            department=emp.department if emp else "Unknown",
            total_telemetry_events=total_events,
            anomaly_events_count=anomaly_count,
            risk_status=r_status,
            last_seen=last_seen,
            recent_anomaly_categories=recent_cats
        ))

    # Sort items by anomaly density desc, then asset_id
    device_items.sort(key=lambda d: (-d.anomaly_events_count, d.asset_id))

    return DeviceFleetListResponse(
        total_devices=len(assets),
        elevated_devices_count=elevated_count,
        device_type_counts=type_counts,
        devices=device_items
    )

