from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db

from app.schemas.investigation import (
    InvestigationCreate,
    InvestigationAssign,
    InvestigationStatusUpdate,
    InvestigationResolve,
    InvestigationResponse,
)

from app.services.investigation_service import InvestigationService

from app.services.investigation_workflow_service import (
    InvestigationWorkflowService,
)

from app.auth.roles import require_role


router = APIRouter(
    prefix="/investigation",
    tags=["Threat Investigation"]
)


# ============================================================
# GET ALL PERSISTENT INVESTIGATION CASES
# ============================================================

@router.get(
    "/cases",
    response_model=list[InvestigationResponse]
)
def get_all_investigations(
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):

    investigations = (
        InvestigationWorkflowService.get_all_investigations(db)
    )

    return [
        {
            "id": investigation.id,
            "investigation_id": investigation.investigation_id,
            "employee_id": investigation.employee_id,
            "alert_id": investigation.alert_id,
            "title": investigation.title,
            "description": investigation.description,
            "severity": investigation.severity,
            "status": investigation.status,
            "assigned_analyst": investigation.assigned_analyst,
            "resolution_notes": investigation.resolution_notes,

            "created_at": (
                investigation.created_at.isoformat()
                if investigation.created_at
                else None
            ),

            "updated_at": (
                investigation.updated_at.isoformat()
                if investigation.updated_at
                else None
            ),

            "resolved_at": (
                investigation.resolved_at.isoformat()
                if investigation.resolved_at
                else None
            ),
        }

        for investigation in investigations
    ]


# ============================================================
# GET SINGLE INVESTIGATION CASE
# ============================================================

@router.get(
    "/case/{investigation_id}",
    response_model=InvestigationResponse
)
def get_investigation_by_id(
    investigation_id: str,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):

    investigation = (
        InvestigationWorkflowService.get_investigation_by_id(
            db,
            investigation_id
        )
    )

    if not investigation:
        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )

    return {
        "id": investigation.id,
        "investigation_id": investigation.investigation_id,
        "employee_id": investigation.employee_id,
        "alert_id": investigation.alert_id,
        "title": investigation.title,
        "description": investigation.description,
        "severity": investigation.severity,
        "status": investigation.status,
        "assigned_analyst": investigation.assigned_analyst,
        "resolution_notes": investigation.resolution_notes,

        "created_at": (
            investigation.created_at.isoformat()
            if investigation.created_at
            else None
        ),

        "updated_at": (
            investigation.updated_at.isoformat()
            if investigation.updated_at
            else None
        ),

        "resolved_at": (
            investigation.resolved_at.isoformat()
            if investigation.resolved_at
            else None
        ),
    }


# ============================================================
# UPDATE INVESTIGATION STATUS
# ============================================================

@router.put(
    "/case/{investigation_id}/status",
    response_model=InvestigationResponse
)
def update_investigation_status(
    investigation_id: str,
    status_data: InvestigationStatusUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):

    try:

        investigation = (
            InvestigationWorkflowService.update_status(
                db=db,
                investigation_id=investigation_id,
                status=status_data.status,
            )
        )

    except ValueError as e:

        raise HTTPException(
            status_code=400,
            detail=str(e)
        )

    if not investigation:

        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )

    return {
        "id": investigation.id,
        "investigation_id": investigation.investigation_id,
        "employee_id": investigation.employee_id,
        "alert_id": investigation.alert_id,
        "title": investigation.title,
        "description": investigation.description,
        "severity": investigation.severity,
        "status": investigation.status,
        "assigned_analyst": investigation.assigned_analyst,
        "resolution_notes": investigation.resolution_notes,

        "created_at": (
            investigation.created_at.isoformat()
            if investigation.created_at
            else None
        ),

        "updated_at": (
            investigation.updated_at.isoformat()
            if investigation.updated_at
            else None
        ),

        "resolved_at": (
            investigation.resolved_at.isoformat()
            if investigation.resolved_at
            else None
        ),
    }


# ============================================================
# ASSIGN INVESTIGATION TO ANALYST
# ============================================================

@router.put(
    "/case/{investigation_id}/assign",
    response_model=InvestigationResponse
)
def assign_investigation_analyst(
    investigation_id: str,
    assignment_data: InvestigationAssign,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):

    investigation = (
        InvestigationWorkflowService.assign_analyst(
            db=db,
            investigation_id=investigation_id,
            assigned_analyst=assignment_data.assigned_analyst,
        )
    )

    if not investigation:

        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )

    return {
        "id": investigation.id,
        "investigation_id": investigation.investigation_id,
        "employee_id": investigation.employee_id,
        "alert_id": investigation.alert_id,
        "title": investigation.title,
        "description": investigation.description,
        "severity": investigation.severity,
        "status": investigation.status,
        "assigned_analyst": investigation.assigned_analyst,
        "resolution_notes": investigation.resolution_notes,

        "created_at": (
            investigation.created_at.isoformat()
            if investigation.created_at
            else None
        ),

        "updated_at": (
            investigation.updated_at.isoformat()
            if investigation.updated_at
            else None
        ),

        "resolved_at": (
            investigation.resolved_at.isoformat()
            if investigation.resolved_at
            else None
        ),
    }


# ============================================================
# RESOLVE INVESTIGATION
# ============================================================

@router.put(
    "/case/{investigation_id}/resolve",
    response_model=InvestigationResponse
)
def resolve_investigation(
    investigation_id: str,
    resolve_data: InvestigationResolve,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):

    investigation = (
        InvestigationWorkflowService.resolve_investigation(
            db=db,
            investigation_id=investigation_id,
            resolution_notes=resolve_data.resolution_notes,
        )
    )

    if not investigation:

        raise HTTPException(
            status_code=404,
            detail="Investigation not found"
        )

    return {
        "id": investigation.id,
        "investigation_id": investigation.investigation_id,
        "employee_id": investigation.employee_id,
        "alert_id": investigation.alert_id,
        "title": investigation.title,
        "description": investigation.description,
        "severity": investigation.severity,
        "status": investigation.status,
        "assigned_analyst": investigation.assigned_analyst,
        "resolution_notes": investigation.resolution_notes,

        "created_at": (
            investigation.created_at.isoformat()
            if investigation.created_at
            else None
        ),

        "updated_at": (
            investigation.updated_at.isoformat()
            if investigation.updated_at
            else None
        ),

        "resolved_at": (
            investigation.resolved_at.isoformat()
            if investigation.resolved_at
            else None
        ),
    }


# ============================================================
# EXISTING INVESTIGATION ANALYSIS
# ============================================================

@router.get(
    "/{employee_id}",
)
def get_employee_investigation(
    employee_id: str,
    activity_limit: int = 100,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):

    activity_limit = min(
        max(activity_limit, 1),
        500
    )

    result = InvestigationService.get_investigation(
        db,
        employee_id,
        activity_limit
    )

    if not result:

        raise HTTPException(
            status_code=404,
            detail="Employee not found"
        )

    return result


# ============================================================
# CREATE PERSISTENT INVESTIGATION
# ============================================================

@router.post(
    "/create",
    response_model=InvestigationResponse
)
def create_investigation(
    investigation_data: InvestigationCreate,
    db: Session = Depends(get_db),
    current_user=Depends(
        require_role([
            "Admin",
            "Security Analyst"
        ])
    )
):

    investigation = (
        InvestigationWorkflowService.create_investigation(
            db=db,
            employee_id=investigation_data.employee_id,
            alert_id=investigation_data.alert_id,
            title=investigation_data.title,
            description=investigation_data.description,
            severity=investigation_data.severity,
        )
    )

    return {
        "id": investigation.id,
        "investigation_id": investigation.investigation_id,
        "employee_id": investigation.employee_id,
        "alert_id": investigation.alert_id,
        "title": investigation.title,
        "description": investigation.description,
        "severity": investigation.severity,
        "status": investigation.status,
        "assigned_analyst": investigation.assigned_analyst,
        "resolution_notes": investigation.resolution_notes,

        "created_at": (
            investigation.created_at.isoformat()
            if investigation.created_at
            else None
        ),

        "updated_at": (
            investigation.updated_at.isoformat()
            if investigation.updated_at
            else None
        ),

        "resolved_at": (
            investigation.resolved_at.isoformat()
            if investigation.resolved_at
            else None
        ),
    }