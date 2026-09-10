"""Reports and export system (module 12).

Report types: insider threat, behavioural analytics, investigation, compliance
and risk assessment - each exportable as PDF (ReportLab) or Excel (openpyxl).
"""
from __future__ import annotations

import io
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml import features as F
from app.ml import risk as risk_engine
from app.models.alert import Alert
from app.models.anomaly import Anomaly
from app.models.behavior import BehaviorBaseline
from app.models.employee import Employee
from app.models.incident import Incident
from app.services import dashboards

REPORT_TYPES = [
    "insider_threat",
    "behavioral_analytics",
    "investigation",
    "compliance",
    "risk_assessment",
]


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _report_meta(report_type: str, days: int) -> Dict[str, Any]:
    generated_at = _now()
    return {
        "report_type": report_type,
        "generated_at": generated_at.isoformat(),
        "window_days": days,
        "period_start": (generated_at - timedelta(days=days)).date().isoformat(),
        "period_end": generated_at.date().isoformat(),
    }


def _insider_threat_report(db: Session, days: int, since: datetime) -> Dict[str, Any]:
    anomalies = list(
        db.execute(
            select(Anomaly).where(Anomaly.detected_at >= since).order_by(Anomaly.score.desc()).limit(200)
        ).scalars().all()
    )
    alerts = list(
        db.execute(
            select(Alert)
            .where(Alert.triggered_at >= since)
            .order_by(Alert.priority, Alert.triggered_at.desc())
            .limit(200)
        ).scalars().all()
    )
    return {
        "title": "Insider Threat Report",
        "summary": {
            **risk_engine.organisational_risk(db),
            "anomalies_detected": len(anomalies),
            "alerts_raised": len(alerts),
            "security_metrics": dashboards.security_metrics(db, days),
        },
        "tables": {
            "Top risk employees": [
                {
                    "Employee": e["full_name"],
                    "Code": e["employee_code"],
                    "Department": e["department"] or "-",
                    "Risk score": e["risk_score"],
                    "Category": e["risk_category"],
                    "Watchlist": "yes" if e["on_watchlist"] else "no",
                }
                for e in dashboards.top_risky(db, 20)
            ],
            "Detected anomalies": [
                {
                    "Detected": F.as_utc(a.detected_at).strftime("%Y-%m-%d %H:%M"),
                    "Employee": a.employee.full_name if a.employee else a.employee_id,
                    "Category": a.category,
                    "Method": a.detection_method,
                    "Severity": a.severity,
                    "Score": round(float(a.score), 1),
                    "Title": a.title,
                }
                for a in anomalies[:80]
            ],
            "Alerts": [
                {
                    "Triggered": F.as_utc(al.triggered_at).strftime("%Y-%m-%d %H:%M"),
                    "Employee": al.employee.full_name if al.employee else al.employee_id,
                    "Severity": al.severity,
                    "Priority": al.priority,
                    "Status": al.status,
                    "Title": al.title,
                }
                for al in alerts[:80]
            ],
        },
    }


def _behavioral_report(db: Session, days: int) -> Dict[str, Any]:
    baselines = list(
        db.execute(
            select(BehaviorBaseline).order_by(BehaviorBaseline.quality_score.desc()).limit(300)
        ).scalars().all()
    )
    employees = {e.id: e for e in db.execute(select(Employee)).scalars().all()}
    return {
        "title": "Behavioural Analytics Report",
        "summary": {
            "baselines": len(baselines),
            "average_quality": round(sum(b.quality_score for b in baselines) / len(baselines), 2)
            if baselines
            else 0.0,
            "anomalies_by_category": dashboards.anomalies_by_category(db, days),
            "compliance": dashboards.compliance_metrics(db),
        },
        "tables": {
            "Behavioural baselines": [
                {
                    "Employee": employees[b.employee_id].full_name
                    if b.employee_id in employees
                    else b.employee_id,
                    "Events": b.events_analysed,
                    "Days": b.days_observed,
                    "Login hour": round(b.mean_login_hour, 1),
                    "Daily events": round(b.mean_daily_events, 1),
                    "Daily downloads (MB)": round(b.mean_daily_downloads, 1),
                    "After-hours %": round(b.after_hours_ratio * 100, 1),
                    "Quality": round(b.quality_score, 1),
                }
                for b in baselines[:120]
            ]
        },
    }


def _investigation_report(db: Session, days: int, incident_id: Optional[int]) -> Dict[str, Any]:
    stmt = select(Incident).where(Incident.id == incident_id) if incident_id else select(Incident).order_by(
        Incident.opened_at.desc()
    )
    incidents = list(db.execute(stmt.limit(200)).scalars().all())
    return {
        "title": "Investigation Report",
        "summary": {
            "incidents": len(incidents),
            "incident_summary": dashboards.incident_summary(db),
            "security_metrics": dashboards.security_metrics(db, days),
        },
        "tables": {
            "Incidents": [
                {
                    "Reference": i.reference,
                    "Opened": F.as_utc(i.opened_at).strftime("%Y-%m-%d %H:%M"),
                    "Employee": i.employee.full_name if i.employee else i.employee_id,
                    "Severity": i.severity,
                    "Status": i.status,
                    "Risk": round(float(i.risk_score), 1),
                    "Outcome": i.outcome or "-",
                    "Title": i.title,
                }
                for i in incidents
            ]
        },
    }


def _compliance_report(db: Session, days: int) -> Dict[str, Any]:
    return {
        "title": "Compliance Report",
        "summary": {
            **dashboards.compliance_metrics(db),
            "security_metrics": dashboards.security_metrics(db, days),
        },
        "tables": {
            "Department coverage": [
                {
                    "Department": d["department"],
                    "Headcount": d["headcount"],
                    "Average risk": d["average_risk"],
                    "High risk employees": d["high_risk_employees"],
                }
                for d in dashboards.department_risk(db)
            ]
        },
    }


def _risk_assessment_report(db: Session) -> Dict[str, Any]:
    register = [
        dashboards.employee_risk_row(e)
        for e in db.execute(
            select(Employee).order_by(Employee.current_risk_score.desc()).limit(300)
        ).scalars().all()
    ]
    return {
        "title": "Risk Assessment Report",
        "summary": {**risk_engine.organisational_risk(db), "weights": risk_engine.WEIGHTS},
        "tables": {
            "Employee risk register": [
                {
                    "Employee": e["full_name"],
                    "Code": e["employee_code"],
                    "Department": e["department"] or "-",
                    "Designation": e["designation"] or "-",
                    "Risk score": e["risk_score"],
                    "Category": e["risk_category"],
                    "Privileged": "yes" if e["is_privileged"] else "no",
                    "Status": e["employment_status"],
                }
                for e in register
            ],
            "Risk distribution": [
                {"Category": k, "Employees": v} for k, v in risk_engine.risk_distribution(db).items()
            ],
        },
    }


def build_report(
    db: Session,
    report_type: str,
    days: int = 30,
    incident_id: Optional[int] = None,
) -> Dict[str, Any]:
    """Assemble a report as structured data; renderers turn it into PDF/Excel."""
    if report_type not in REPORT_TYPES:
        raise ValueError(
            f"Unknown report type '{report_type}'. Expected one of: {', '.join(REPORT_TYPES)}"
        )
    meta = _report_meta(report_type, days)
    since = _now() - timedelta(days=days)

    if report_type == "insider_threat":
        report = _insider_threat_report(db, days, since)
    elif report_type == "behavioral_analytics":
        report = _behavioral_report(db, days)
    elif report_type == "investigation":
        report = _investigation_report(db, days, incident_id)
    elif report_type == "compliance":
        report = _compliance_report(db, days)
    else:
        report = _risk_assessment_report(db)

    report["meta"] = meta
    return report


# --------------------------------------------------------------- PDF export
def _flatten_summary(summary: Dict[str, Any]) -> List[tuple]:
    rows: List[tuple] = []
    for key, value in summary.items():
        if isinstance(value, dict):
            for sub_key, sub_value in value.items():
                if isinstance(sub_value, (dict, list)):
                    continue
                rows.append((f"{key}.{sub_key}".replace("_", " ").capitalize(), sub_value))
        elif isinstance(value, list):
            continue
        else:
            rows.append((str(key).replace("_", " ").capitalize(), value))
    return rows


def render_pdf(report: Dict[str, Any]) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        PageBreak,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=landscape(A4),
        title=report.get("title", "Report"),
        author="Insider Threat Behavioral Intelligence System",
        leftMargin=14 * mm,
        rightMargin=14 * mm,
        topMargin=14 * mm,
        bottomMargin=14 * mm,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleX", parent=styles["Title"], fontSize=19, textColor=colors.HexColor("#0f172a"))
    h2 = ParagraphStyle("H2X", parent=styles["Heading2"], fontSize=12.5, textColor=colors.HexColor("#1e293b"), spaceBefore=10)
    small = ParagraphStyle("SmallX", parent=styles["Normal"], fontSize=8.5, textColor=colors.HexColor("#475569"))
    cell = ParagraphStyle("CellX", parent=styles["Normal"], fontSize=7.6, leading=9.2)

    meta = report.get("meta", {})
    story: List[Any] = [
        Paragraph(report.get("title", "Report"), title_style),
        Paragraph("Insider Threat Behavioral Intelligence System", small),
        Paragraph(
            f"Period {meta.get('period_start')} to {meta.get('period_end')} "
            f"({meta.get('window_days')} days) &nbsp;|&nbsp; Generated {meta.get('generated_at', '')[:19].replace('T', ' ')} UTC",
            small,
        ),
        Spacer(1, 7 * mm),
        Paragraph("Executive summary", h2),
    ]

    summary_rows = _flatten_summary(report.get("summary", {}))
    if summary_rows:
        data = [["Metric", "Value"]] + [[str(k), str(v)] for k, v in summary_rows]
        table = Table(data, colWidths=[95 * mm, 60 * mm], repeatRows=1)
        table.setStyle(
            TableStyle(
                [
                    ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                    ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                    ("FONTSIZE", (0, 0), (-1, -1), 8),
                    ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#cbd5e1")),
                    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f1f5f9")]),
                    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                ]
            )
        )
        story.append(table)

    severity_colors = {
        "critical": colors.HexColor("#b91c1c"),
        "high": colors.HexColor("#c2410c"),
        "medium": colors.HexColor("#a16207"),
        "low": colors.HexColor("#15803d"),
    }

    for name, rows in report.get("tables", {}).items():
        story.append(PageBreak())
        story.append(Paragraph(name, h2))
        if not rows:
            story.append(Paragraph("No records for this period.", small))
            continue
        headers = list(rows[0].keys())
        data = [headers] + [[Paragraph(str(r.get(h, "")), cell) for h in headers] for r in rows[:120]]
        available = doc.width
        table = Table(data, colWidths=[available / len(headers)] * len(headers), repeatRows=1)
        style = [
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTSIZE", (0, 0), (-1, 0), 8),
            ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#cbd5e1")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]
        if "Severity" in headers:
            column = headers.index("Severity")
            for row_index, row in enumerate(rows[:120], start=1):
                colour = severity_colors.get(str(row.get("Severity", "")).lower())
                if colour is not None:
                    style.append(("TEXTCOLOR", (column, row_index), (column, row_index), colour))
        table.setStyle(TableStyle(style))
        story.append(table)
        if len(rows) > 120:
            story.append(Spacer(1, 3 * mm))
            story.append(Paragraph(f"Showing 120 of {len(rows)} records. Use the Excel export for the full data set.", small))

    doc.build(story)
    return buffer.getvalue()


# ------------------------------------------------------------- Excel export
def render_excel(report: Dict[str, Any]) -> bytes:
    from openpyxl import Workbook
    from openpyxl.styles import Alignment, Font, PatternFill
    from openpyxl.utils import get_column_letter

    workbook = Workbook()
    header_fill = PatternFill("solid", fgColor="1E293B")
    header_font = Font(color="FFFFFF", bold=True, size=10)

    sheet = workbook.active
    sheet.title = "Summary"
    sheet["A1"] = report.get("title", "Report")
    sheet["A1"].font = Font(bold=True, size=14)
    meta = report.get("meta", {})
    sheet["A2"] = (
        f"Period {meta.get('period_start')} to {meta.get('period_end')} "
        f"({meta.get('window_days')} days), generated {meta.get('generated_at', '')[:19].replace('T', ' ')} UTC"
    )
    sheet["A4"] = "Metric"
    sheet["B4"] = "Value"
    for column in ("A4", "B4"):
        sheet[column].fill = header_fill
        sheet[column].font = header_font
    for index, (key, value) in enumerate(_flatten_summary(report.get("summary", {})), start=5):
        sheet[f"A{index}"] = key
        sheet[f"B{index}"] = value
    sheet.column_dimensions["A"].width = 46
    sheet.column_dimensions["B"].width = 26
    sheet.freeze_panes = "A5"

    used_titles = {"Summary"}
    for name, rows in report.get("tables", {}).items():
        title = name[:28] or "Sheet"
        suffix = 2
        while title in used_titles:
            title = f"{name[:25]}_{suffix}"
            suffix += 1
        used_titles.add(title)

        tab = workbook.create_sheet(title)
        if not rows:
            tab["A1"] = "No records for this period."
            continue
        headers = list(rows[0].keys())
        tab.append(headers)
        for column_index, _ in enumerate(headers, start=1):
            cell = tab.cell(row=1, column=column_index)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")
        for row in rows:
            tab.append([row.get(header, "") for header in headers])
        for column_index, header in enumerate(headers, start=1):
            longest = max(
                [len(str(header))] + [len(str(row.get(header, ""))) for row in rows[:400]]
            )
            tab.column_dimensions[get_column_letter(column_index)].width = min(max(longest + 2, 10), 52)
        tab.freeze_panes = "A2"
        tab.auto_filter.ref = tab.dimensions

    buffer = io.BytesIO()
    workbook.save(buffer)
    return buffer.getvalue()


def filename_for(report: Dict[str, Any], extension: str) -> str:
    meta = report.get("meta", {})
    stamp = meta.get("generated_at", _now().isoformat())[:10]
    return f"{meta.get('report_type', 'report')}_{stamp}.{extension}"
