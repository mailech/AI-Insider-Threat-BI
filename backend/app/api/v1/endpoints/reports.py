import os
import uuid
from typing import Any, List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from sqlalchemy import desc

from backend.app.db.session import get_db
from backend.app.models.user import User
from backend.app.models.report import Report
from backend.app.schemas.report import (
    ReportGenerateRequest, ReportSaveRequest, ReportResponse, ReportListResponse
)
from backend.app.services.report_generator import ReportGeneratorService
from backend.app.api.deps import get_current_user, record_audit

router = APIRouter()


@router.post("/generate")
def generate_report_preview(
    req: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Collects real system telemetry and returns structured JSON for the Report Preview modal.
    """
    report_data = ReportGeneratorService.collect_data(
        db=db,
        report_type=req.report_type,
        date_from=req.date_from,
        date_to=req.date_to,
        user_id=req.user_id,
        department=req.department,
        severity=req.severity,
        author=current_user.full_name or current_user.username
    )
    return report_data


@router.get("", response_model=ReportListResponse)
def list_saved_reports(
    report_type: Optional[str] = None,
    status_filter: Optional[str] = None,
    search: Optional[str] = None,
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Retrieves saved reports with optional search and type filtering.
    """
    query = db.query(Report)

    if report_type and report_type != "ALL":
        query = query.filter(Report.report_type == report_type)
    if status_filter and status_filter != "ALL":
        query = query.filter(Report.status == status_filter)
    if search:
        query = query.filter(Report.name.ilike(f"%{search}%") | Report.report_id.ilike(f"%{search}%"))

    total = query.count()
    reports = query.order_by(desc(Report.created_at)).offset(skip).limit(limit).all()

    return ReportListResponse(total=total, reports=reports)


@router.get("/{report_id}", response_model=ReportResponse)
def get_saved_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Get metadata for a specific saved report.
    """
    report = db.query(Report).filter(Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Saved report not found.")
    return report


@router.post("/save", response_model=ReportResponse)
def save_report(
    save_req: ReportSaveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Saves a generated report into the database. Avoids duplicates.
    """
    report_id = f"RPT-2026-{uuid.uuid4().hex[:6].upper()}"
    report_name = save_req.name or f"{save_req.report_type} - {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}"

    # Generate persistent files on disk
    os.makedirs(ReportGeneratorService.REPORT_DIR, exist_ok=True)
    safe_name = "".join(c for c in report_name if c.isalnum() or c in (' ', '_', '-')).strip().replace(' ', '_')
    pdf_filename = f"{safe_name}_{report_id}.pdf"
    excel_filename = f"{safe_name}_{report_id}.xlsx"
    
    pdf_path = os.path.join(ReportGeneratorService.REPORT_DIR, pdf_filename)
    excel_path = os.path.join(ReportGeneratorService.REPORT_DIR, excel_filename)

    # Collect complete data if not provided
    report_data = save_req.summary_data
    if not report_data:
        filters = save_req.filters or {}
        report_data = ReportGeneratorService.collect_data(
            db=db,
            report_type=save_req.report_type,
            date_from=save_req.date_from,
            date_to=save_req.date_to,
            user_id=filters.get("user_id"),
            department=filters.get("department"),
            severity=filters.get("severity"),
            author=current_user.full_name or current_user.username
        )

    # Write files to disk
    ReportGeneratorService.generate_pdf(report_data, output_path=pdf_path)
    ReportGeneratorService.generate_excel(report_data, output_path=excel_path)

    new_report = Report(
        report_id=report_id,
        name=report_name,
        report_type=save_req.report_type,
        created_by=current_user.full_name or current_user.username,
        date_from=save_req.date_from,
        date_to=save_req.date_to,
        filters=save_req.filters or {},
        summary_data=report_data,
        status="GENERATED",
        pdf_path=pdf_path,
        excel_path=excel_path
    )
    db.add(new_report)
    db.commit()
    db.refresh(new_report)

    record_audit(
        db, current_user.username, current_user.role, "SAVE_REPORT", f"/api/reports/{report_id}",
        {"report_name": save_req.name, "report_type": save_req.report_type}
    )

    return new_report


@router.post("/export/pdf")
def export_direct_pdf(
    req: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Response:
    """
    Directly streams a freshly generated PDF report without needing prior save.
    """
    report_data = ReportGeneratorService.collect_data(
        db=db,
        report_type=req.report_type,
        date_from=req.date_from,
        date_to=req.date_to,
        user_id=req.user_id,
        department=req.department,
        severity=req.severity,
        author=current_user.full_name or current_user.username
    )
    pdf_bytes = ReportGeneratorService.generate_pdf(report_data)

    filename_prefix = req.report_type.replace(" ", "_")
    if req.user_id:
        filename_prefix = f"Employee_Risk_{req.user_id}"
    filename = f"{filename_prefix}_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{report_id}/pdf")
def download_saved_pdf(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Response:
    """
    Downloads the PDF for a previously saved report.
    """
    report = db.query(Report).filter(Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Saved report not found.")

    if report.pdf_path and os.path.exists(report.pdf_path):
        with open(report.pdf_path, "rb") as f:
            pdf_bytes = f.read()
    else:
        # Re-generate if file missing on disk
        data = report.summary_data or ReportGeneratorService.collect_data(
            db=db, report_type=report.report_type, date_from=report.date_from, date_to=report.date_to, author=report.created_by
        )
        pdf_bytes = ReportGeneratorService.generate_pdf(data)

    filename = f"{report.name.replace(' ', '_')}_{report.report_id}.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.post("/export/excel")
def export_direct_excel(
    req: ReportGenerateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Response:
    """
    Directly streams a freshly generated Excel (.xlsx) report without needing prior save.
    """
    report_data = ReportGeneratorService.collect_data(
        db=db,
        report_type=req.report_type,
        date_from=req.date_from,
        date_to=req.date_to,
        user_id=req.user_id,
        department=req.department,
        severity=req.severity,
        author=current_user.full_name or current_user.username
    )
    excel_bytes = ReportGeneratorService.generate_excel(report_data)

    filename_prefix = req.report_type.replace(" ", "_")
    if req.user_id:
        filename_prefix = f"Employee_Risk_{req.user_id}"
    filename = f"{filename_prefix}_{datetime.now(timezone.utc).strftime('%Y-%m-%d')}.xlsx"

    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.get("/{report_id}/excel")
def download_saved_excel(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Response:
    """
    Downloads the Excel file for a previously saved report.
    """
    report = db.query(Report).filter(Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Saved report not found.")

    if report.excel_path and os.path.exists(report.excel_path):
        with open(report.excel_path, "rb") as f:
            excel_bytes = f.read()
    else:
        data = report.summary_data or ReportGeneratorService.collect_data(
            db=db, report_type=report.report_type, date_from=report.date_from, date_to=report.date_to, author=report.created_by
        )
        excel_bytes = ReportGeneratorService.generate_excel(data)

    filename = f"{report.name.replace(' ', '_')}_{report.report_id}.xlsx"
    return Response(
        content=excel_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )


@router.delete("/{report_id}")
def delete_saved_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Any:
    """
    Deletes a saved report and any files on disk.
    """
    report = db.query(Report).filter(Report.report_id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Saved report not found.")

    # Remove files if exist
    if report.pdf_path and os.path.exists(report.pdf_path):
        try:
            os.remove(report.pdf_path)
        except Exception:
            pass

    if report.excel_path and os.path.exists(report.excel_path):
        try:
            os.remove(report.excel_path)
        except Exception:
            pass

    db.delete(report)
    db.commit()

    record_audit(
        db, current_user.username, current_user.role, "DELETE_REPORT", f"/api/reports/{report_id}",
        {"report_id": report_id, "report_name": report.name}
    )

    return {"status": "SUCCESS", "message": f"Report {report_id} deleted successfully."}
