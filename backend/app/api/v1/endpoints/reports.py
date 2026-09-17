"""
ITBIS — Executive Reports & Compliance Export  (Milestone 4)

Routes
------
GET /api/v1/reports/executive-summary   JSON threat posture for security managers
GET /api/v1/reports/export?format=csv   CSV compliance export
GET /api/v1/reports/export?format=pdf   PDF executive briefing
"""

from __future__ import annotations

import csv
import io
import logging
from datetime import datetime, timezone
from typing import Any, Literal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db, require_roles
from app.models.domain import (
    Employee,
    Incident,
    IncidentStatusEnum,
    RiskCategoryEnum,
    RoleEnum,
    User,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports & Export"])

ExportFormat = Literal["csv", "pdf"]


def _build_executive_summary(db: Session) -> dict[str, Any]:
    employees = db.query(Employee).all()
    incidents = db.query(Incident).all()
    total = len(employees)
    dist: dict[str, int] = {c.value: 0 for c in RiskCategoryEnum}
    for emp in employees:
        dist[emp.risk_category.value] += 1

    high_risk = dist["HIGH"] + dist["CRITICAL"]
    avg_score = (
        round(sum(emp.risk_score * 100 for emp in employees) / total, 1) if total else 0.0
    )

    open_incidents = [
        inc for inc in incidents
        if inc.status in (IncidentStatusEnum.NEW, IncidentStatusEnum.UNDER_INVESTIGATION)
    ]
    isolated = sum(1 for emp in employees if getattr(emp, "access_isolated", False))

    top_risks: list[dict[str, Any]] = []
    ranked = sorted(employees, key=lambda e: e.risk_score, reverse=True)[:10]
    for emp in ranked:
        top_risks.append(
            {
                "emp_id": emp.emp_id,
                "name": f"{emp.first_name} {emp.last_name}",
                "department": emp.department,
                "threat_score": round(emp.risk_score * 100),
                "risk_category": emp.risk_category.value,
                "access_isolated": bool(getattr(emp, "access_isolated", False)),
            }
        )

    incident_rows: list[dict[str, Any]] = []
    for inc in sorted(incidents, key=lambda i: i.updated_at, reverse=True)[:25]:
        emp = inc.employee
        incident_rows.append(
            {
                "id": inc.id,
                "title": inc.title,
                "status": inc.status.value,
                "severity": inc.severity.value,
                "threat_score": inc.threat_score,
                "emp_id": emp.emp_id if emp else "",
                "employee_name": f"{emp.first_name} {emp.last_name}" if emp else "",
                "department": emp.department if emp else "",
                "trigger_reason": inc.trigger_reason,
                "triggered_at": inc.triggered_at.isoformat() if inc.triggered_at else "",
            }
        )

    generated_at = datetime.now(timezone.utc).isoformat()
    return {
        "generated_at": generated_at,
        "title": "ITBIS Executive Threat Summary",
        "fleet": {
            "total_employees": total,
            "high_risk_count": high_risk,
            "critical_count": dist["CRITICAL"],
            "average_threat_score": avg_score,
            "risk_distribution": dist,
            "isolated_identities": isolated,
        },
        "incidents": {
            "total": len(incidents),
            "open": len(open_incidents),
            "new": sum(1 for i in incidents if i.status == IncidentStatusEnum.NEW),
            "under_investigation": sum(
                1 for i in incidents if i.status == IncidentStatusEnum.UNDER_INVESTIGATION
            ),
            "resolved": sum(1 for i in incidents if i.status == IncidentStatusEnum.RESOLVED),
            "false_positive": sum(
                1 for i in incidents if i.status == IncidentStatusEnum.FALSE_POSITIVE
            ),
        },
        "top_risk_employees": top_risks,
        "recent_incidents": incident_rows,
    }


@router.get(
    "/executive-summary",
    summary="JSON executive threat summary",
)
def get_executive_summary(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_active_user),
) -> dict[str, Any]:
    return _build_executive_summary(db)


def _csv_bytes(summary: dict[str, Any]) -> bytes:
    buffer = io.StringIO()
    writer = csv.writer(buffer)
    writer.writerow(["ITBIS Executive Threat Summary", summary["generated_at"]])
    writer.writerow([])
    writer.writerow(["Metric", "Value"])
    fleet = summary["fleet"]
    writer.writerow(["Total employees", fleet["total_employees"]])
    writer.writerow(["High + Critical", fleet["high_risk_count"]])
    writer.writerow(["Critical only", fleet["critical_count"]])
    writer.writerow(["Average threat score", fleet["average_threat_score"]])
    writer.writerow(["Isolated identities", fleet["isolated_identities"]])
    writer.writerow([])
    writer.writerow(["Incident status", "Count"])
    for key, value in summary["incidents"].items():
        writer.writerow([key, value])
    writer.writerow([])
    writer.writerow(
        ["emp_id", "name", "department", "threat_score", "risk_category", "access_isolated"]
    )
    for row in summary["top_risk_employees"]:
        writer.writerow(
            [
                row["emp_id"],
                row["name"],
                row["department"],
                row["threat_score"],
                row["risk_category"],
                row["access_isolated"],
            ]
        )
    writer.writerow([])
    writer.writerow(
        ["incident_id", "status", "severity", "threat_score", "emp_id", "employee_name", "title"]
    )
    for row in summary["recent_incidents"]:
        writer.writerow(
            [
                row["id"],
                row["status"],
                row["severity"],
                row["threat_score"],
                row["emp_id"],
                row["employee_name"],
                row["title"],
            ]
        )
    return buffer.getvalue().encode("utf-8")


def _pdf_bytes(summary: dict[str, Any]) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        leftMargin=0.7 * inch,
        rightMargin=0.7 * inch,
        topMargin=0.6 * inch,
        bottomMargin=0.6 * inch,
        title="ITBIS Executive Threat Summary",
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ITBISTitle",
        parent=styles["Heading1"],
        textColor=colors.HexColor("#0B0F19"),
        fontSize=16,
        spaceAfter=6,
    )
    subtitle = ParagraphStyle(
        "ITBISSub",
        parent=styles["Normal"],
        textColor=colors.HexColor("#475569"),
        fontSize=9,
        spaceAfter=14,
    )
    body = styles["Normal"]
    body.fontSize = 9

    fleet = summary["fleet"]
    incidents = summary["incidents"]
    story: list[Any] = [
        Paragraph("ITBIS Executive Threat Summary", title_style),
        Paragraph(
            f"Generated {summary['generated_at']} · Insider Threat Behavioral Intelligence System",
            subtitle,
        ),
        Paragraph(
            "This briefing summarizes fleet risk posture, open SOC incidents, and "
            "the highest-scoring identities for security-manager review.",
            body,
        ),
        Spacer(1, 10),
    ]

    kpi_data = [
        ["Total identities", str(fleet["total_employees"]), "Open incidents", str(incidents["open"])],
        ["HIGH + CRITICAL", str(fleet["high_risk_count"]), "CRITICAL identities", str(fleet["critical_count"])],
        ["Avg threat score", str(fleet["average_threat_score"]), "Isolated accounts", str(fleet["isolated_identities"])],
    ]
    kpi_table = Table(kpi_data, colWidths=[1.6 * inch, 1.5 * inch, 1.8 * inch, 1.5 * inch])
    kpi_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EEF2FF")),
                ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1E2640")),
                ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
                ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.HexColor("#CBD5E1")),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    story.append(kpi_table)
    story.append(Spacer(1, 16))
    story.append(Paragraph("Top risk employees", styles["Heading2"]))

    emp_header = ["ID", "Name", "Department", "Score", "Band"]
    emp_rows = [emp_header]
    for row in summary["top_risk_employees"][:12]:
        emp_rows.append(
            [
                row["emp_id"],
                row["name"],
                row["department"],
                str(row["threat_score"]),
                row["risk_category"],
            ]
        )
    emp_table = Table(emp_rows, colWidths=[1.1 * inch, 1.8 * inch, 1.8 * inch, 0.7 * inch, 0.9 * inch])
    emp_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E2640")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(emp_table)
    story.append(Spacer(1, 16))
    story.append(Paragraph("Recent incidents", styles["Heading2"]))

    inc_header = ["ID", "Sev", "Status", "Score", "Employee"]
    inc_rows = [inc_header]
    for row in summary["recent_incidents"][:15]:
        inc_rows.append(
            [
                str(row["id"]),
                row["severity"],
                row["status"],
                str(row["threat_score"]),
                f"{row['employee_name']} ({row['emp_id']})",
            ]
        )
    if len(inc_rows) == 1:
        inc_rows.append(["—", "—", "—", "—", "No incidents recorded"])
    inc_table = Table(inc_rows, colWidths=[0.6 * inch, 0.9 * inch, 1.7 * inch, 0.6 * inch, 2.5 * inch])
    inc_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E2640")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#CBD5E1")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#F8FAFC")]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]
        )
    )
    story.append(inc_table)
    story.append(Spacer(1, 18))
    story.append(
        Paragraph(
            "Classification: Internal — Security Operations. Do not distribute outside the SOC.",
            subtitle,
        )
    )
    doc.build(story)
    return buffer.getvalue()


@router.get(
    "/export",
    summary="Export executive report as CSV or PDF",
)
def export_report(
    format: ExportFormat = Query(default="csv", alias="format"),
    db: Session = Depends(get_db),
    _: User = Depends(require_roles([
        RoleEnum.SECURITY_ANALYST,
        RoleEnum.SOC_ENGINEER,
        RoleEnum.SECURITY_MANAGER,
        RoleEnum.ADMINISTRATOR,
    ])),
) -> StreamingResponse:
    summary = _build_executive_summary(db)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    if format == "csv":
        payload = _csv_bytes(summary)
        filename = f"itbis-executive-summary-{stamp}.csv"
        media = "text/csv"
    elif format == "pdf":
        payload = _pdf_bytes(summary)
        filename = f"itbis-executive-summary-{stamp}.pdf"
        media = "application/pdf"
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="format must be csv or pdf",
        )

    logger.info("Report export generated format=%s bytes=%d", format, len(payload))
    return StreamingResponse(
        io.BytesIO(payload),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
