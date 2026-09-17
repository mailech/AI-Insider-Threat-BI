"""
ITBIS — Executive Reports & Compliance Export  (Milestone 4)

Routes
------
GET /api/v1/reports/summary             JSON executive threat briefing
GET /api/v1/reports/executive-summary   Alias of /summary (backward compatible)
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
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill
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
    IncidentComment,
    IncidentStatusEnum,
    RiskCategoryEnum,
    RoleEnum,
    User,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/reports", tags=["Reports & Export"])

ExportFormat = Literal["csv", "pdf", "xlsx"]
ReportType = Literal["executive", "incidents", "anomalies"]


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

    dept_map: dict[str, dict[str, Any]] = {}
    for emp in employees:
        dept = emp.department or "Unassigned"
        bucket = dept_map.setdefault(
            dept,
            {"department": dept, "employee_count": 0, "high_risk_users": 0, "risk_score_sum": 0.0},
        )
        bucket["employee_count"] += 1
        bucket["risk_score_sum"] += float(emp.risk_score)
        if emp.risk_category in (RiskCategoryEnum.HIGH, RiskCategoryEnum.CRITICAL):
            bucket["high_risk_users"] += 1

    department_risk_breakdown: list[dict[str, Any]] = []
    for bucket in sorted(dept_map.values(), key=lambda row: row["high_risk_users"], reverse=True):
        count = int(bucket["employee_count"])
        department_risk_breakdown.append(
            {
                "department": bucket["department"],
                "employee_count": count,
                "high_risk_users": int(bucket["high_risk_users"]),
                "avg_risk_score": round(float(bucket["risk_score_sum"]) / count, 4) if count else 0.0,
            }
        )

    comments = (
        db.query(IncidentComment)
        .order_by(IncidentComment.created_at.desc())
        .limit(20)
        .all()
    )
    recent_audit_events: list[dict[str, Any]] = []
    for comment in comments:
        author = comment.author
        recent_audit_events.append(
            {
                "id": comment.id,
                "event_type": "INCIDENT_COMMENT",
                "incident_id": comment.incident_id,
                "actor": getattr(author, "email", None) if author is not None else None,
                "summary": (comment.content or "")[:240],
                "occurred_at": comment.created_at.isoformat() if comment.created_at else "",
            }
        )
    if not recent_audit_events:
        for row in incident_rows[:15]:
            recent_audit_events.append(
                {
                    "id": row["id"],
                    "event_type": "INCIDENT_TRIGGER",
                    "incident_id": row["id"],
                    "actor": None,
                    "summary": row["title"] or row["trigger_reason"],
                    "occurred_at": row["triggered_at"],
                }
            )

    resolved_count = sum(1 for i in incidents if i.status == IncidentStatusEnum.RESOLVED)
    false_positive_count = sum(
        1 for i in incidents if i.status == IncidentStatusEnum.FALSE_POSITIVE
    )
    fleet_hygiene = ((total - high_risk) / total) if total else 1.0
    resolution_rate = (
        (resolved_count + false_positive_count) / len(incidents) if incidents else 1.0
    )
    compliance_score = round((0.6 * fleet_hygiene) + (0.4 * resolution_rate), 4)

    generated_at = datetime.now(timezone.utc).isoformat()
    return {
        "generated_at": generated_at,
        "title": "ITBIS Executive Threat Summary",
        "total_incidents": len(incidents),
        "high_risk_users": high_risk,
        "compliance_score": compliance_score,
        "department_risk_breakdown": department_risk_breakdown,
        "recent_audit_events": recent_audit_events,
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
    "/summary",
    summary="JSON executive threat briefing",
)
@router.get(
    "/executive-summary",
    summary="JSON executive threat summary (alias of /summary)",
    include_in_schema=False,
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


def _xlsx_bytes(summary: dict[str, Any], report_type: ReportType) -> bytes:
    workbook = Workbook()
    header_fill = PatternFill("solid", fgColor="1E2640")
    header_font = Font(color="FFFFFF", bold=True)
    title_font = Font(bold=True, size=14, color="0B0F19")

    if report_type in ("executive", "incidents"):
        ws = workbook.active
        ws.title = "Incidents"
        ws["A1"] = "ITBIS Incident Report"
        ws["A1"].font = title_font
        ws["A2"] = summary["generated_at"]
        headers = [
            "incident_id", "status", "severity", "threat_score",
            "emp_id", "employee_name", "department", "title", "trigger_reason",
        ]
        start = 4
        for idx, header in enumerate(headers, start=1):
            ws.cell(row=start, column=idx, value=header)
        _style_header_row = start
        for col in range(1, len(headers) + 1):
            cell = ws.cell(row=_style_header_row, column=col)
            cell.fill = header_fill
            cell.font = header_font
        for row_idx, row in enumerate(summary["recent_incidents"], start=start + 1):
            values = [
                row["id"], row["status"], row["severity"], row["threat_score"],
                row["emp_id"], row["employee_name"], row["department"],
                row["title"], row["trigger_reason"],
            ]
            for col, value in enumerate(values, start=1):
                ws.cell(row=row_idx, column=col, value=value)

    if report_type == "executive":
        kpi = workbook.create_sheet("Executive KPI")
        kpi["A1"] = "ITBIS Executive Threat Summary"
        kpi["A1"].font = title_font
        kpi["A2"] = summary["generated_at"]
        fleet = summary["fleet"]
        kpi["A4"] = "Metric"
        kpi["B4"] = "Value"
        kpi["A4"].fill = header_fill
        kpi["B4"].fill = header_fill
        kpi["A4"].font = header_font
        kpi["B4"].font = header_font
        metrics = [
            ("Total employees", fleet["total_employees"]),
            ("High + Critical", fleet["high_risk_count"]),
            ("Critical only", fleet["critical_count"]),
            ("Average threat score", fleet["average_threat_score"]),
            ("Isolated identities", fleet["isolated_identities"]),
            ("Open incidents", summary["incidents"]["open"]),
        ]
        for idx, (label, value) in enumerate(metrics, start=5):
            kpi.cell(row=idx, column=1, value=label)
            kpi.cell(row=idx, column=2, value=value)

    if report_type in ("executive", "anomalies"):
        anomalies_sheet = workbook.create_sheet("Anomalies") if report_type == "executive" else workbook.active
        if report_type == "anomalies":
            anomalies_sheet.title = "Anomalies"
            anomalies_sheet["A1"] = "ITBIS Anomaly Report"
            anomalies_sheet["A1"].font = title_font
            anomalies_sheet["A2"] = summary["generated_at"]
            header_row = 4
        else:
            header_row = 1
        headers = ["emp_id", "name", "department", "threat_score", "risk_category", "access_isolated"]
        for idx, header in enumerate(headers, start=1):
            cell = anomalies_sheet.cell(row=header_row, column=idx, value=header)
            cell.fill = header_fill
            cell.font = header_font
        flagged = [
            row for row in summary["top_risk_employees"]
            if row["risk_category"] in ("HIGH", "CRITICAL")
        ]
        source = flagged if report_type == "anomalies" else summary["top_risk_employees"]
        for row_idx, row in enumerate(source, start=header_row + 1):
            values = [
                row["emp_id"], row["name"], row["department"],
                row["threat_score"], row["risk_category"], row["access_isolated"],
            ]
            for col, value in enumerate(values, start=1):
                anomalies_sheet.cell(row=row_idx, column=col, value=value)

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


@router.get(
    "/export",
    summary="Export executive, incident, or anomaly reports as CSV, PDF, or Excel",
)
def export_report(
    format: ExportFormat = Query(default="csv", alias="format"),
    report_type: ReportType = Query(default="executive"),
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
        filename = f"itbis-{report_type}-{stamp}.csv"
        media = "text/csv"
    elif format == "pdf":
        payload = _pdf_bytes(summary)
        filename = f"itbis-{report_type}-{stamp}.pdf"
        media = "application/pdf"
    elif format == "xlsx":
        payload = _xlsx_bytes(summary, report_type)
        filename = f"itbis-{report_type}-{stamp}.xlsx"
        media = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="format must be csv, pdf, or xlsx",
        )

    logger.info(
        "Report export generated format=%s type=%s bytes=%d",
        format, report_type, len(payload),
    )
    return StreamingResponse(
        io.BytesIO(payload),
        media_type=media,
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
