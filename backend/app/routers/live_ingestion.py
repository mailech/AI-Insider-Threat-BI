from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.database import get_db
from app.models import Employee, EmployeeIdentityMapping, UnmappedIngestionLog, User
from app.schemas import (
    IdentityMappingCreate,
    IdentityMappingRead,
    UnmappedIngestionLogRead,
    LiveIngestionStatusResponse,
    SimulateEventRequest,
    SimulateEventResponse,
)
from app.auth import require_admin
from app.audit_service import log_audit_event
from services.windows_event_listener import (
    get_listener_status,
    process_and_route_event,
)

router = APIRouter(prefix="", tags=["Live Windows Ingestion"])


# ==============================================================================
# Ingestion Status & Health
# ==============================================================================

@router.get("/live-ingestion/status", response_model=LiveIngestionStatusResponse)
def get_live_ingestion_status_endpoint(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Administrator-only. Reports the real, unsimulated operational status of the
    Windows Event Log Listener service, host OS compatibility, and ingestion counts.
    """
    status_info = get_listener_status()

    # Query persistent database counts for mapped vs unmapped telemetry
    unmapped_count = db.query(UnmappedIngestionLog).count()

    return LiveIngestionStatusResponse(
        is_enabled=status_info["is_enabled"],
        is_running=status_info["is_running"],
        is_windows=status_info["is_windows"],
        pywin32_available=status_info["pywin32_available"],
        has_event_log_access=status_info.get("has_event_log_access", False),
        last_event_timestamp=status_info.get("last_event_timestamp"),
        total_mapped_processed=status_info.get("total_mapped_processed", 0),
        total_unmapped_processed=unmapped_count,
        channels_monitored=status_info.get("channels_monitored", []),
        poll_interval_seconds=status_info.get("poll_interval_seconds", 5.0),
        status_summary=status_info.get("status_summary", "Unknown"),
        message=status_info.get("message", ""),
    )


# ==============================================================================
# Identity Mappings Management
# ==============================================================================

@router.get("/admin/identity-mappings", response_model=List[IdentityMappingRead])
def get_identity_mappings(
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Administrator-only. Returns all registered mappings linking real Windows
    identities (DOMAIN\\user, username, SID) to existing seeded employees.
    """
    mappings = db.query(EmployeeIdentityMapping).order_by(desc(EmployeeIdentityMapping.created_at)).all()
    results = []
    for m in mappings:
        emp = db.query(Employee).filter(Employee.id == m.employee_id).first()
        results.append(
            IdentityMappingRead(
                id=m.id,
                windows_identifier=m.windows_identifier,
                employee_id=m.employee_id,
                employee_name=emp.full_name if emp else "Unknown",
                department=emp.department if emp else "Unknown",
                description=m.description,
                created_at=m.created_at,
                created_by=m.created_by,
            )
        )
    return results


@router.post("/admin/identity-mappings", response_model=IdentityMappingRead, status_code=status.HTTP_201_CREATED)
def create_identity_mapping(
    payload: IdentityMappingCreate,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Administrator-only. Creates a new mapping between a Windows account identity and
    an existing seeded employee.

    Security Guardrail:
    Strictly enforces that `employee_id` must match a pre-existing seeded employee.
    Rejects any attempt to create or link an unseeded / unknown identity.
    """
    clean_identifier = payload.windows_identifier.strip()
    if not clean_identifier:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Windows account identifier cannot be empty.",
        )

    # Validate employee existence
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                f"Referenced employee_id '{payload.employee_id}' does not exist in seeded employee roster. "
                "Per AMS security guardrails, live telemetry can only be attributed to pre-existing employees."
            ),
        )

    # Check for duplicate Windows identifier
    existing = db.query(EmployeeIdentityMapping).filter(
        EmployeeIdentityMapping.windows_identifier.ilike(clean_identifier)
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An identity mapping for '{clean_identifier}' already exists (mapped to {existing.employee_id}).",
        )

    new_mapping = EmployeeIdentityMapping(
        windows_identifier=clean_identifier,
        employee_id=emp.id,
        description=payload.description or f"Mapped to {emp.full_name} ({emp.department})",
        created_by=current_user.email,
    )
    db.add(new_mapping)
    db.commit()
    db.refresh(new_mapping)

    log_audit_event(
        db=db,
        user=current_user,
        action="IDENTITY_MAPPING_CREATED",
        target_resource=clean_identifier,
        details={
            "employee_id": emp.id,
            "employee_name": emp.full_name,
            "department": emp.department,
        },
    )

    return IdentityMappingRead(
        id=new_mapping.id,
        windows_identifier=new_mapping.windows_identifier,
        employee_id=new_mapping.employee_id,
        employee_name=emp.full_name,
        department=emp.department,
        description=new_mapping.description,
        created_at=new_mapping.created_at,
        created_by=new_mapping.created_by,
    )


@router.delete("/admin/identity-mappings/{mapping_id}", status_code=status.HTTP_200_OK)
def delete_identity_mapping(
    mapping_id: int,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Administrator-only. Deletes an existing Windows identity mapping.
    """
    mapping = db.query(EmployeeIdentityMapping).filter(EmployeeIdentityMapping.id == mapping_id).first()
    if not mapping:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Identity mapping #{mapping_id} not found.",
        )

    target_id = mapping.windows_identifier
    emp_id = mapping.employee_id
    db.delete(mapping)
    db.commit()

    log_audit_event(
        db=db,
        user=current_user,
        action="IDENTITY_MAPPING_DELETED",
        target_resource=target_id,
        details={"employee_id": emp_id, "mapping_id": mapping_id},
    )

    return {"status": "deleted", "mapping_id": mapping_id, "windows_identifier": target_id}


# ==============================================================================
# Unmapped Quarantined Ingestion Log
# ==============================================================================

@router.get("/live-ingestion/unmapped-log", response_model=List[UnmappedIngestionLogRead])
def get_unmapped_ingestion_log(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    channel: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Administrator-only. View quarantined Windows Event logs that did not match
    any seeded employee identity mapping.
    """
    query = db.query(UnmappedIngestionLog)
    if channel and channel != "All":
        query = query.filter(UnmappedIngestionLog.channel.ilike(channel))
    if search:
        query = query.filter(UnmappedIngestionLog.raw_identifier.ilike(f"%{search}%"))

    logs = query.order_by(desc(UnmappedIngestionLog.timestamp)).offset(offset).limit(limit).all()
    return logs


# ==============================================================================
# Deterministic Test Simulator (For Automated Labs & Viva Verification)
# ==============================================================================

@router.post("/live-ingestion/simulate-test-event", response_model=SimulateEventResponse)
def simulate_test_event(
    payload: SimulateEventRequest,
    current_user: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """
    Administrator-only test harness. Passes a test event through the live
    normalization, identity lookup, and quarantine pipeline.
    """
    mapped, tel_id, unmap_id, emp_id = process_and_route_event(
        db=db,
        channel=payload.channel,
        event_id=payload.event_id,
        raw_identifier=payload.raw_identifier,
        source_ip=payload.source_ip,
        raw_details=payload.details or {},
    )

    emp_name = None
    if emp_id:
        emp = db.query(Employee).filter(Employee.id == emp_id).first()
        emp_name = emp.full_name if emp else None

    if mapped:
        return SimulateEventResponse(
            status="mapped",
            mapped=True,
            employee_id=emp_id,
            employee_name=emp_name,
            telemetry_log_id=tel_id,
            unmapped_log_id=None,
            event_type="LOGIN" if payload.channel.lower() == "security" else "USB_DEVICE",
            severity="INFO",
            message=f"Successfully mapped event to employee {emp_id} ({emp_name}) with source='live_windows_listener'.",
        )
    else:
        return SimulateEventResponse(
            status="quarantined",
            mapped=False,
            employee_id=None,
            employee_name=None,
            telemetry_log_id=None,
            unmapped_log_id=unmap_id,
            event_type="LOGIN" if payload.channel.lower() == "security" else "USB_DEVICE",
            severity="LOW",
            message=(
                f"Windows account '{payload.raw_identifier}' is not mapped to any seeded employee. "
                f"Quarantined in unmapped_ingestion_logs #{unmap_id} without attributing to any employee."
            ),
        )
