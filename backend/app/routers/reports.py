import io

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from openpyxl import Workbook
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas

from app.database import get_db
from app import models
from app.deps import get_current_user

router = APIRouter(prefix="/api/reports", tags=["reports"])


def _latest_risk_rows(db: Session):
    rows = []
    for emp in db.query(models.Employee).all():
        latest = (
            db.query(models.RiskScore)
            .filter(models.RiskScore.employee_id == emp.id)
            .order_by(models.RiskScore.computed_at.desc())
            .first()
        )
        rows.append(
            {
                "employee_code": emp.employee_code,
                "full_name": emp.full_name,
                "department": emp.department,
                "score": latest.score if latest else 0,
                "risk_level": latest.risk_level.value if latest else "n/a",
            }
        )
    rows.sort(key=lambda r: r["score"], reverse=True)
    return rows


@router.get("/insider-risk/excel")
def export_risk_excel(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    rows = _latest_risk_rows(db)
    wb = Workbook()
    ws = wb.active
    ws.title = "Insider Risk Report"
    ws.append(["Employee Code", "Full Name", "Department", "Risk Score", "Risk Level"])
    for r in rows:
        ws.append([r["employee_code"], r["full_name"], r["department"], r["score"], r["risk_level"]])

    buf = io.BytesIO()
    wb.save(buf)
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=insider_risk_report.xlsx"},
    )


@router.get("/insider-risk/pdf")
def export_risk_pdf(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    rows = _latest_risk_rows(db)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    width, height = letter

    c.setFont("Helvetica-Bold", 16)
    c.drawString(50, height - 50, "Insider Threat Risk Report")
    c.setFont("Helvetica", 10)

    y = height - 90
    c.drawString(50, y, "Employee")
    c.drawString(220, y, "Department")
    c.drawString(350, y, "Score")
    c.drawString(420, y, "Level")
    y -= 15
    c.line(50, y, 550, y)
    y -= 15

    for r in rows:
        if y < 60:
            c.showPage()
            y = height - 60
        c.drawString(50, y, f"{r['full_name']} ({r['employee_code']})")
        c.drawString(220, y, r["department"] or "-")
        c.drawString(350, y, str(r["score"]))
        c.drawString(420, y, r["risk_level"])
        y -= 18

    c.save()
    buf.seek(0)
    return StreamingResponse(
        buf,
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=insider_risk_report.pdf"},
    )
