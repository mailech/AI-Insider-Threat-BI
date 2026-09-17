"""
CYBER AI — Reports & Export REST API Endpoints
"""

from typing import Dict, Any, Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, Response
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services.reports import (
    fetch_report_data,
    generate_pdf_report,
    generate_excel_report
)

router = APIRouter(prefix="/reports", tags=["Reports & Export System"])


class ReportFilterRequest(BaseModel):
    report_type: str = Field(..., description="insider_threat | behavioral_analytics | investigation | compliance | risk_assessment")
    time_range: Optional[str] = Field("30d", description="7d | 30d | 90d | ALL")
    department: Optional[str] = Field("ALL", description="ALL | Engineering | HR | Finance | Executive | IT Operations")
    min_risk: Optional[str] = Field("ALL", description="ALL | HIGH_CRITICAL")
    employee_id: Optional[str] = Field(None, description="Employee ID for investigation report")
    framework: Optional[str] = Field("SOC2", description="SOC2 | ISO27001 | HIPAA | NIST_CSF")


REPORT_TYPES_METADATA = [
    {
        "id": "insider_threat",
        "title": "Insider Threat Report",
        "badge": "THREAT INTEL",
        "icon": "AlertTriangle",
        "description": "High-risk employee roster, off-hours access bursts, privilege escalation events, exfiltration risk scores.",
        "default_time_range": "30d",
        "supports_employee_target": False,
        "supports_framework": False
    },
    {
        "id": "behavioral_analytics",
        "title": "Behavioral Analytics (UEBA)",
        "badge": "STATISTICAL AI",
        "icon": "Activity",
        "description": "User & entity behavioral baseline, Z-score peer group outliers, anomaly indices, 72h risk velocity forecast.",
        "default_time_range": "30d",
        "supports_employee_target": False,
        "supports_framework": False
    },
    {
        "id": "investigation",
        "title": "Investigation Dossier",
        "badge": "FORENSICS",
        "icon": "Search",
        "description": "Target subject forensic audit trail, chronological event ledger, triggered SOC rules, IP telemetry trace map.",
        "default_time_range": "30d",
        "supports_employee_target": True,
        "supports_framework": False
    },
    {
        "id": "compliance",
        "title": "Compliance Audit Report",
        "badge": "GOVERNANCE",
        "icon": "ShieldCheck",
        "description": "Regulatory control audit matrix for SOC 2, ISO 27001, HIPAA, and NIST CSF with audit evidence status.",
        "default_time_range": "90d",
        "supports_employee_target": False,
        "supports_framework": True
    },
    {
        "id": "risk_assessment",
        "title": "Risk Assessment Report",
        "badge": "EXECUTIVE",
        "icon": "BarChart3",
        "description": "Organizational risk score posture, departmental threat rating matrix, high-risk assets, SOC mitigation roadmap.",
        "default_time_range": "30d",
        "supports_employee_target": False,
        "supports_framework": False
    }
]


@router.get("/types", response_model=List[Dict[str, Any]])
def get_report_types():
    """Returns available report types and their filter capabilities."""
    return REPORT_TYPES_METADATA


@router.post("/preview")
def get_report_preview(
    payload: ReportFilterRequest,
    db: Session = Depends(get_db)
):
    """Generates structured JSON preview data for web presentation."""
    try:
        data = fetch_report_data(db, payload.report_type, payload.model_dump())
        return data
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to generate report preview: {str(err)}")


@router.post("/export/pdf")
def export_report_pdf(
    payload: ReportFilterRequest,
    db: Session = Depends(get_db)
):
    """Generates and downloads a styled PDF document."""
    try:
        report_data = fetch_report_data(db, payload.report_type, payload.model_dump())
        pdf_bytes = generate_pdf_report(report_data)
        filename = f"cyber_ai_{payload.report_type}_report.pdf"
        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to export PDF: {str(err)}")


@router.post("/export/excel")
def export_report_excel(
    payload: ReportFilterRequest,
    db: Session = Depends(get_db)
):
    """Generates and downloads a styled Excel (.xlsx) workbook."""
    try:
        report_data = fetch_report_data(db, payload.report_type, payload.model_dump())
        excel_bytes = generate_excel_report(report_data)
        filename = f"cyber_ai_{payload.report_type}_report.xlsx"
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f'attachment; filename="{filename}"'}
        )
    except ValueError as err:
        raise HTTPException(status_code=400, detail=str(err))
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Failed to export Excel: {str(err)}")
