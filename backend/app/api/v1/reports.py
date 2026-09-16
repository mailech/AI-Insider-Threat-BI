"""Report download endpoints (PDF and Excel)."""

import tempfile
import uuid
from enum import StrEnum
from pathlib import Path

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.db.session import get_db
from app.models.user import User
from app.reports import (
    generate_behavioral_excel,
    generate_behavioral_report,
    generate_compliance_report,
    generate_insider_threat_excel,
    generate_insider_threat_report,
    generate_investigation_report,
    generate_risk_assessment_excel,
    generate_risk_assessment_report,
)

router = APIRouter(prefix="/reports", tags=["reports"])


class PDFReportType(StrEnum):
    INSIDER_THREAT = "insider_threat"
    BEHAVIORAL = "behavioral"
    INVESTIGATION = "investigation"
    COMPLIANCE = "compliance"
    RISK_ASSESSMENT = "risk_assessment"


class ExcelReportType(StrEnum):
    INSIDER_THREAT = "insider_threat"
    BEHAVIORAL = "behavioral"
    RISK_ASSESSMENT = "risk_assessment"


@router.get(
    "/pdf",
    summary="Download a PDF report",
    response_class=FileResponse,
)
def download_pdf(
    report_type: PDFReportType = Query(PDFReportType.INSIDER_THREAT),
    investigation_id: uuid.UUID | None = Query(
        None, description="Required when report_type=investigation"
    ),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FileResponse:
    tmp_dir = Path(tempfile.mkdtemp())
    output_path = tmp_dir / f"{report_type}.pdf"

    try:
        if report_type == PDFReportType.INSIDER_THREAT:
            generate_insider_threat_report(db, output_path)
        elif report_type == PDFReportType.BEHAVIORAL:
            generate_behavioral_report(db, output_path)
        elif report_type == PDFReportType.INVESTIGATION:
            if investigation_id is None:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="investigation_id is required for report_type=investigation",
                )
            generate_investigation_report(db, investigation_id, output_path)
        elif report_type == PDFReportType.COMPLIANCE:
            generate_compliance_report(db, output_path)
        elif report_type == PDFReportType.RISK_ASSESSMENT:
            generate_risk_assessment_report(db, output_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown report type: {report_type}",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {exc}",
        ) from exc

    filename = f"{report_type}_report.pdf"
    return FileResponse(
        path=str(output_path),
        media_type="application/pdf",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get(
    "/excel",
    summary="Download an Excel report",
    response_class=FileResponse,
)
def download_excel(
    report_type: ExcelReportType = Query(ExcelReportType.INSIDER_THREAT),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
) -> FileResponse:
    tmp_dir = Path(tempfile.mkdtemp())
    output_path = tmp_dir / f"{report_type}.xlsx"

    try:
        if report_type == ExcelReportType.INSIDER_THREAT:
            generate_insider_threat_excel(db, output_path)
        elif report_type == ExcelReportType.BEHAVIORAL:
            generate_behavioral_excel(db, output_path)
        elif report_type == ExcelReportType.RISK_ASSESSMENT:
            generate_risk_assessment_excel(db, output_path)
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Unknown report type: {report_type}",
            )
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Report generation failed: {exc}",
        ) from exc

    filename = f"{report_type}_report.xlsx"
    return FileResponse(
        path=str(output_path),
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename=filename,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
