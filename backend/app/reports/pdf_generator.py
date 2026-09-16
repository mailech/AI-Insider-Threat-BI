"""PDF report generators using ReportLab.

Each public function accepts a SQLAlchemy *Session* (or *AsyncSession*-compatible
object), queries the database, and writes a polished PDF to *output_path*.

All reports share a common house style:
  - Deep-navy header band with company branding
  - Auto-generated timestamp in the sub-header
  - Summary statistics boxes
  - Colour-coded severity/risk tables
  - Page footer with page numbers
"""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm, mm
from reportlab.platypus import (
    HRFlowable,
    Image,
    KeepTogether,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)
from reportlab.platypus.flowables import Flowable
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.activity import ActivityLog, ActivityType
from app.models.alert import Alert, AlertStatus
from app.models.anomaly import Anomaly, AnomalyCategory, AnomalyStatus, Severity
from app.models.behavior import BehaviorProfile
from app.models.employee import Employee
from app.models.investigation import Investigation, InvestigationEvent, InvestigationStatus
from app.models.risk import RiskBand, RiskScore

# ---------------------------------------------------------------------------
# Brand palette
# ---------------------------------------------------------------------------
NAVY = colors.HexColor("#0F172A")
INDIGO = colors.HexColor("#4F46E5")
TEAL = colors.HexColor("#0D9488")
SLATE = colors.HexColor("#64748B")
LIGHT_GREY = colors.HexColor("#F1F5F9")
WHITE = colors.white

SEVERITY_COLORS: dict[str, colors.Color] = {
    Severity.CRITICAL: colors.HexColor("#DC2626"),
    Severity.HIGH: colors.HexColor("#EA580C"),
    Severity.MEDIUM: colors.HexColor("#D97706"),
    Severity.LOW: colors.HexColor("#65A30D"),
    Severity.INFORMATIONAL: colors.HexColor("#0EA5E9"),
}

RISK_BAND_COLORS: dict[str, colors.Color] = {
    RiskBand.CRITICAL: colors.HexColor("#DC2626"),
    RiskBand.HIGH: colors.HexColor("#EA580C"),
    RiskBand.MEDIUM: colors.HexColor("#D97706"),
    RiskBand.LOW: colors.HexColor("#65A30D"),
}

ALERT_STATUS_COLORS: dict[str, colors.Color] = {
    AlertStatus.OPEN: colors.HexColor("#DC2626"),
    AlertStatus.ACKNOWLEDGED: colors.HexColor("#D97706"),
    AlertStatus.CLOSED: colors.HexColor("#65A30D"),
}

INVESTIGATION_STATUS_COLORS: dict[str, colors.Color] = {
    InvestigationStatus.OPEN: colors.HexColor("#DC2626"),
    InvestigationStatus.IN_PROGRESS: colors.HexColor("#D97706"),
    InvestigationStatus.ESCALATED: colors.HexColor("#EA580C"),
    InvestigationStatus.RESOLVED: colors.HexColor("#65A30D"),
    InvestigationStatus.CLOSED: colors.HexColor("#64748B"),
}

# ---------------------------------------------------------------------------
# Styles
# ---------------------------------------------------------------------------
_styles = getSampleStyleSheet()

TITLE_STYLE = ParagraphStyle(
    "ReportTitle",
    parent=_styles["Title"],
    fontSize=22,
    textColor=WHITE,
    alignment=TA_CENTER,
    spaceAfter=4,
)
SUBTITLE_STYLE = ParagraphStyle(
    "ReportSubtitle",
    parent=_styles["Normal"],
    fontSize=10,
    textColor=colors.HexColor("#CBD5E1"),
    alignment=TA_CENTER,
)
SECTION_HEADING = ParagraphStyle(
    "SectionHeading",
    parent=_styles["Heading2"],
    fontSize=13,
    textColor=NAVY,
    spaceBefore=14,
    spaceAfter=6,
    borderPad=(0, 0, 2, 0),
)
BODY_STYLE = ParagraphStyle(
    "Body",
    parent=_styles["Normal"],
    fontSize=9,
    textColor=colors.HexColor("#1E293B"),
    leading=13,
)
CELL_STYLE = ParagraphStyle(
    "Cell",
    parent=_styles["Normal"],
    fontSize=8,
    textColor=colors.HexColor("#1E293B"),
    leading=11,
    wordWrap="CJK",
)
CELL_BOLD = ParagraphStyle(
    "CellBold",
    parent=CELL_STYLE,
    fontName="Helvetica-Bold",
)
FOOTER_STYLE = ParagraphStyle(
    "Footer",
    parent=_styles["Normal"],
    fontSize=7,
    textColor=SLATE,
    alignment=TA_CENTER,
)

# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------


def _now_str() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")


def _page_size() -> tuple[float, float]:
    return A4


def _make_doc(output_path: str | Path) -> SimpleDocTemplate:
    return SimpleDocTemplate(
        str(output_path),
        pagesize=A4,
        leftMargin=1.8 * cm,
        rightMargin=1.8 * cm,
        topMargin=1.5 * cm,
        bottomMargin=2.0 * cm,
        title="InsiderIQ Report",
        author="InsiderIQ Platform",
    )


def _header_block(title: str, subtitle: str) -> list[Flowable]:
    """Return a navy banner block with title and subtitle."""
    w, _ = A4
    usable = w - 3.6 * cm  # left + right margins

    header_table = Table(
        [[Paragraph(title, TITLE_STYLE)], [Paragraph(subtitle, SUBTITLE_STYLE)]],
        colWidths=[usable],
    )
    header_table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), NAVY),
                ("ROUNDEDCORNERS", [6]),
                ("TOPPADDING", (0, 0), (-1, -1), 14),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 14),
                ("LEFTPADDING", (0, 0), (-1, -1), 18),
                ("RIGHTPADDING", (0, 0), (-1, -1), 18),
            ]
        )
    )
    return [header_table, Spacer(1, 10)]


def _stat_box_row(stats: list[tuple[str, str | int | float]]) -> Flowable:
    """Render a horizontal row of KPI stat boxes."""
    w, _ = A4
    usable = w - 3.6 * cm
    n = len(stats)
    col_w = usable / n

    label_style = ParagraphStyle(
        "StatLabel",
        parent=_styles["Normal"],
        fontSize=8,
        textColor=SLATE,
        alignment=TA_CENTER,
    )
    value_style = ParagraphStyle(
        "StatValue",
        parent=_styles["Normal"],
        fontSize=18,
        fontName="Helvetica-Bold",
        textColor=NAVY,
        alignment=TA_CENTER,
    )

    cells = [[Paragraph(str(v), value_style), Paragraph(lbl, label_style)] for lbl, v in stats]
    tbl = Table([cells], colWidths=[col_w] * n)
    tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GREY),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 10),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ]
        )
    )
    return tbl


def _section(title: str) -> list[Flowable]:
    return [
        Spacer(1, 6),
        Paragraph(title, SECTION_HEADING),
        HRFlowable(width="100%", thickness=1, color=INDIGO, spaceAfter=6),
    ]


def _severity_color(severity: str) -> colors.Color:
    return SEVERITY_COLORS.get(severity, SLATE)


def _risk_color(band: str) -> colors.Color:
    return RISK_BAND_COLORS.get(band, SLATE)


def _colored_badge(text: str, bg: colors.Color) -> Paragraph:
    style = ParagraphStyle(
        "Badge",
        parent=CELL_STYLE,
        backColor=bg,
        textColor=WHITE,
        borderRadius=3,
        alignment=TA_CENTER,
        fontSize=7,
        fontName="Helvetica-Bold",
        leftIndent=3,
        rightIndent=3,
    )
    return Paragraph(text, style)


def _page_footer(canvas, doc) -> None:  # noqa: ANN001
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(SLATE)
    w, _ = A4
    canvas.drawString(1.8 * cm, 1.2 * cm, "InsiderIQ — Confidential")
    canvas.drawCentredString(w / 2, 1.2 * cm, f"Generated {_now_str()}")
    canvas.drawRightString(w - 1.8 * cm, 1.2 * cm, f"Page {doc.page}")
    canvas.restoreState()


def _std_table(header: list[str], rows: list[list[Any]], col_widths: list[float]) -> Table:
    """Create a standard styled table with a navy header row."""
    header_cells = [Paragraph(h, CELL_BOLD) for h in header]
    data = [header_cells] + [[Paragraph(str(c), CELL_STYLE) for c in row] for row in rows]

    tbl = Table(data, colWidths=col_widths, repeatRows=1)
    n_rows = len(data)
    style = [
        ("BACKGROUND", (0, 0), (-1, 0), NAVY),
        ("TEXTCOLOR", (0, 0), (-1, 0), WHITE),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE", (0, 0), (-1, -1), 8),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [WHITE, LIGHT_GREY]),
        ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("RIGHTPADDING", (0, 0), (-1, -1), 6),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ]
    tbl.setStyle(TableStyle(style))
    return tbl


# ---------------------------------------------------------------------------
# 1. Insider Threat Summary Report
# ---------------------------------------------------------------------------


def generate_insider_threat_report(db: Session, output_path: str | Path) -> Path:
    """Generate a comprehensive insider threat summary PDF.

    Sections
    --------
    - KPI stat boxes (employees, anomalies, alerts, investigations)
    - Anomaly breakdown by severity
    - Top 10 highest-risk employees
    - Open alerts table
    - Recent investigations table
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = _make_doc(output_path)
    story: list[Flowable] = []

    # --- Header ---
    story += _header_block(
        "Insider Threat Summary Report",
        f"InsiderIQ Platform  •  {_now_str()}",
    )

    # --- KPIs ---
    total_employees = db.scalar(select(func.count()).select_from(Employee)) or 0
    total_anomalies = db.scalar(select(func.count()).select_from(Anomaly)) or 0
    open_alerts = (
        db.scalar(
            select(func.count()).select_from(Alert).where(Alert.status == AlertStatus.OPEN)
        )
        or 0
    )
    open_investigations = (
        db.scalar(
            select(func.count())
            .select_from(Investigation)
            .where(Investigation.status.in_([InvestigationStatus.OPEN, InvestigationStatus.IN_PROGRESS]))
        )
        or 0
    )
    critical_anomalies = (
        db.scalar(
            select(func.count())
            .select_from(Anomaly)
            .where(Anomaly.severity == Severity.CRITICAL)
        )
        or 0
    )

    story.append(
        _stat_box_row(
            [
                ("Monitored Employees", total_employees),
                ("Total Anomalies", total_anomalies),
                ("Open Alerts", open_alerts),
                ("Active Investigations", open_investigations),
                ("Critical Anomalies", critical_anomalies),
            ]
        )
    )
    story.append(Spacer(1, 8))

    # --- Anomaly breakdown by severity ---
    story += _section("Anomaly Distribution by Severity")

    sev_rows = []
    for sev in Severity:
        count = (
            db.scalar(
                select(func.count()).select_from(Anomaly).where(Anomaly.severity == sev)
            )
            or 0
        )
        new_count = (
            db.scalar(
                select(func.count())
                .select_from(Anomaly)
                .where(Anomaly.severity == sev, Anomaly.status == AnomalyStatus.NEW)
            )
            or 0
        )
        pct = f"{(count / total_anomalies * 100):.1f}%" if total_anomalies else "0.0%"
        sev_rows.append([str(sev), count, new_count, pct])

    w, _ = A4
    usable = w - 3.6 * cm
    sev_table = _std_table(
        ["Severity", "Total", "New / Unreviewed", "% of Total"],
        sev_rows,
        [usable * 0.30, usable * 0.20, usable * 0.30, usable * 0.20],
    )
    # Overlay severity badge colour on the first column of each data row
    sev_color_cmds = []
    for r_idx, sev in enumerate(Severity, start=1):
        bg = _severity_color(sev)
        sev_color_cmds += [
            ("BACKGROUND", (0, r_idx), (0, r_idx), bg),
            ("TEXTCOLOR", (0, r_idx), (0, r_idx), WHITE),
            ("FONTNAME", (0, r_idx), (0, r_idx), "Helvetica-Bold"),
        ]
    sev_table.setStyle(TableStyle(sev_color_cmds))
    story.append(sev_table)

    # --- Top 10 highest-risk employees ---
    story += _section("Top 10 Highest-Risk Employees")

    # Subquery: latest risk score per employee
    latest_rs_subq = (
        select(
            RiskScore.employee_id,
            func.max(RiskScore.computed_at).label("max_computed_at"),
        )
        .group_by(RiskScore.employee_id)
        .subquery()
    )
    top_risk = (
        db.execute(
            select(Employee, RiskScore)
            .join(RiskScore, RiskScore.employee_id == Employee.id)
            .join(
                latest_rs_subq,
                (latest_rs_subq.c.employee_id == RiskScore.employee_id)
                & (latest_rs_subq.c.max_computed_at == RiskScore.computed_at),
            )
            .order_by(RiskScore.risk_score.desc())
            .limit(10)
        )
        .all()
    )

    risk_rows = []
    for emp, rs in top_risk:
        risk_rows.append(
            [
                emp.employee_code,
                emp.full_name,
                emp.department,
                emp.designation,
                f"{rs.risk_score:.2f}",
                str(rs.risk_band),
            ]
        )

    if risk_rows:
        risk_header = ["Code", "Name", "Department", "Designation", "Risk Score", "Risk Band"]
        risk_col_widths = [
            usable * 0.10,
            usable * 0.20,
            usable * 0.20,
            usable * 0.20,
            usable * 0.14,
            usable * 0.16,
        ]
        risk_tbl = _std_table(risk_header, risk_rows, risk_col_widths)
        # Colour the Risk Band cell per band value
        band_style_cmds = []
        for r_idx, row in enumerate(risk_rows, start=1):
            band_val = row[5]
            bg = _risk_color(band_val)
            band_style_cmds += [
                ("BACKGROUND", (5, r_idx), (5, r_idx), bg),
                ("TEXTCOLOR", (5, r_idx), (5, r_idx), WHITE),
            ]
        if band_style_cmds:
            risk_tbl.setStyle(TableStyle(band_style_cmds))
        story.append(risk_tbl)
    else:
        story.append(Paragraph("No risk score data available.", BODY_STYLE))

    # --- Open alerts ---
    story += _section("Open Alerts")

    open_alert_rows_q = (
        db.execute(
            select(Alert, Employee)
            .join(Employee, Employee.id == Alert.employee_id)
            .where(Alert.status == AlertStatus.OPEN)
            .order_by(Alert.raised_at.desc())
            .limit(25)
        )
        .all()
    )

    alert_rows = []
    for alert, emp in open_alert_rows_q:
        alert_rows.append(
            [
                alert.raised_at.strftime("%Y-%m-%d %H:%M"),
                emp.full_name,
                emp.department,
                alert.title[:60],
                str(alert.severity),
            ]
        )

    if alert_rows:
        story.append(
            _std_table(
                ["Raised At", "Employee", "Department", "Title", "Severity"],
                alert_rows,
                [
                    usable * 0.18,
                    usable * 0.22,
                    usable * 0.18,
                    usable * 0.28,
                    usable * 0.14,
                ],
            )
        )
    else:
        story.append(Paragraph("No open alerts.", BODY_STYLE))

    # --- Recent Investigations ---
    story += _section("Recent Investigations (Last 20)")

    inv_rows_q = (
        db.execute(
            select(Investigation, Employee)
            .join(Employee, Employee.id == Investigation.employee_id)
            .order_by(Investigation.created_at.desc())
            .limit(20)
        )
        .all()
    )

    inv_rows = []
    for inv, emp in inv_rows_q:
        inv_rows.append(
            [
                inv.reference,
                inv.title[:55],
                emp.full_name,
                str(inv.severity),
                str(inv.status),
                inv.created_at.strftime("%Y-%m-%d") if inv.created_at else "",
            ]
        )

    if inv_rows:
        story.append(
            _std_table(
                ["Ref", "Title", "Employee", "Severity", "Status", "Created"],
                inv_rows,
                [
                    usable * 0.10,
                    usable * 0.28,
                    usable * 0.18,
                    usable * 0.14,
                    usable * 0.14,
                    usable * 0.16,
                ],
            )
        )
    else:
        story.append(Paragraph("No investigations found.", BODY_STYLE))

    doc.build(story, onFirstPage=_page_footer, onLaterPages=_page_footer)
    return output_path


# ---------------------------------------------------------------------------
# 2. Behavioral Analytics Report
# ---------------------------------------------------------------------------


def generate_behavioral_report(db: Session, output_path: str | Path) -> Path:
    """PDF report covering behavioral baselines and recent activity patterns."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = _make_doc(output_path)
    story: list[Flowable] = []

    story += _header_block(
        "Behavioral Analytics Report",
        f"InsiderIQ Platform  •  {_now_str()}",
    )

    w, _ = A4
    usable = w - 3.6 * cm

    # --- KPIs ---
    total_profiles = db.scalar(select(func.count()).select_from(BehaviorProfile)) or 0
    total_activities = db.scalar(select(func.count()).select_from(ActivityLog)) or 0
    anomaly_count = db.scalar(select(func.count()).select_from(Anomaly)) or 0

    story.append(
        _stat_box_row(
            [
                ("Behavior Profiles", total_profiles),
                ("Total Activity Logs", total_activities),
                ("Total Anomalies", anomaly_count),
            ]
        )
    )
    story.append(Spacer(1, 8))

    # --- Activity breakdown by type ---
    story += _section("Activity Volume by Type")

    act_rows = []
    for act_type in ActivityType:
        count = (
            db.scalar(
                select(func.count())
                .select_from(ActivityLog)
                .where(ActivityLog.activity_type == act_type)
            )
            or 0
        )
        pct = f"{(count / total_activities * 100):.1f}%" if total_activities else "0.0%"
        act_rows.append([str(act_type), count, pct])

    story.append(
        _std_table(
            ["Activity Type", "Count", "% of Total"],
            act_rows,
            [usable * 0.50, usable * 0.25, usable * 0.25],
        )
    )

    # --- Anomaly breakdown by category ---
    story += _section("Anomaly Distribution by Category")

    cat_rows = []
    for cat in AnomalyCategory:
        count = (
            db.scalar(
                select(func.count()).select_from(Anomaly).where(Anomaly.category == cat)
            )
            or 0
        )
        pct = f"{(count / anomaly_count * 100):.1f}%" if anomaly_count else "0.0%"
        cat_rows.append([str(cat), count, pct])

    story.append(
        _std_table(
            ["Anomaly Category", "Count", "% of Total"],
            cat_rows,
            [usable * 0.60, usable * 0.20, usable * 0.20],
        )
    )

    # --- Behavioral profiles table ---
    story += _section("Employee Behavioral Baselines (up to 50)")

    profiles_q = (
        db.execute(
            select(BehaviorProfile, Employee)
            .join(Employee, Employee.id == BehaviorProfile.employee_id)
            .order_by(Employee.department, Employee.last_name)
            .limit(50)
        )
        .all()
    )

    profile_rows = []
    for bp, emp in profiles_q:
        profile_rows.append(
            [
                emp.employee_code,
                emp.full_name,
                emp.department,
                f"{bp.typical_login_hour_start:02d}:00–{bp.typical_login_hour_end:02d}:00",
                f"{bp.typical_daily_logins:.1f}",
                f"{bp.typical_daily_downloads:.1f}",
                f"{bp.typical_daily_data_volume_mb:.0f} MB",
            ]
        )

    if profile_rows:
        story.append(
            _std_table(
                ["Code", "Name", "Department", "Login Window", "Logins/Day", "Downloads/Day", "Data/Day"],
                profile_rows,
                [
                    usable * 0.09,
                    usable * 0.18,
                    usable * 0.16,
                    usable * 0.16,
                    usable * 0.13,
                    usable * 0.14,
                    usable * 0.14,
                ],
            )
        )
    else:
        story.append(Paragraph("No behavioral profiles found.", BODY_STYLE))

    # --- High-deviation anomalies ---
    story += _section("Top 20 Anomalies by Baseline Deviation")

    top_anomalies = (
        db.execute(
            select(Anomaly, Employee)
            .join(Employee, Employee.id == Anomaly.employee_id)
            .order_by(Anomaly.baseline_deviation.desc())
            .limit(20)
        )
        .all()
    )

    anom_rows = []
    for anom, emp in top_anomalies:
        anom_rows.append(
            [
                anom.detected_at.strftime("%Y-%m-%d"),
                emp.full_name,
                str(anom.category),
                str(anom.severity),
                f"{anom.baseline_deviation:.2f}x",
                f"{anom.observed_value:.1f}",
                f"{anom.baseline_value:.1f}",
            ]
        )

    if anom_rows:
        story.append(
            _std_table(
                ["Date", "Employee", "Category", "Severity", "Deviation", "Observed", "Baseline"],
                anom_rows,
                [
                    usable * 0.12,
                    usable * 0.17,
                    usable * 0.22,
                    usable * 0.12,
                    usable * 0.12,
                    usable * 0.12,
                    usable * 0.13,
                ],
            )
        )
    else:
        story.append(Paragraph("No anomaly data available.", BODY_STYLE))

    doc.build(story, onFirstPage=_page_footer, onLaterPages=_page_footer)
    return output_path


# ---------------------------------------------------------------------------
# 3. Single Investigation Detail Report
# ---------------------------------------------------------------------------


def generate_investigation_report(
    db: Session, investigation_id: str | uuid.UUID, output_path: str | Path
) -> Path:
    """Generate a detailed PDF for a single investigation.

    Includes: metadata, related employee / risk / anomaly, full event timeline.
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    inv_id = uuid.UUID(str(investigation_id))
    inv: Investigation | None = db.get(Investigation, inv_id)
    if inv is None:
        raise ValueError(f"Investigation {investigation_id} not found.")

    emp: Employee = inv.employee

    doc = _make_doc(output_path)
    story: list[Flowable] = []

    story += _header_block(
        f"Investigation Report — {inv.reference}",
        f"InsiderIQ Platform  •  {_now_str()}",
    )

    w, _ = A4
    usable = w - 3.6 * cm

    # --- Summary metadata ---
    story += _section("Investigation Overview")

    meta = [
        ["Reference", inv.reference, "Status", str(inv.status)],
        ["Title", inv.title, "Severity", str(inv.severity)],
        ["Created", inv.created_at.strftime("%Y-%m-%d %H:%M") if inv.created_at else "—", "Resolved", inv.resolved_at.strftime("%Y-%m-%d %H:%M") if inv.resolved_at else "Pending"],
        ["Created By", (inv.created_by.full_name if inv.created_by else "—"), "Assigned To", (inv.assigned_to.full_name if inv.assigned_to else "Unassigned")],
    ]
    meta_tbl = Table(
        [[Paragraph(str(c), CELL_BOLD if i % 2 == 0 else CELL_STYLE) for i, c in enumerate(row)] for row in meta],
        colWidths=[usable * 0.18, usable * 0.32, usable * 0.18, usable * 0.32],
    )
    meta_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GREY),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(meta_tbl)

    # Description
    if inv.description:
        story.append(Spacer(1, 8))
        story.append(Paragraph("<b>Description:</b>", CELL_BOLD))
        story.append(Paragraph(inv.description, BODY_STYLE))

    # Resolution
    if inv.resolution:
        story.append(Spacer(1, 6))
        story.append(Paragraph("<b>Resolution:</b>", CELL_BOLD))
        story.append(Paragraph(inv.resolution, BODY_STYLE))

    # --- Subject employee ---
    story += _section("Subject Employee")

    emp_data = [
        [Paragraph("Employee Code", CELL_BOLD), Paragraph(emp.employee_code, CELL_STYLE),
         Paragraph("Full Name", CELL_BOLD), Paragraph(emp.full_name, CELL_STYLE)],
        [Paragraph("Department", CELL_BOLD), Paragraph(emp.department, CELL_STYLE),
         Paragraph("Designation", CELL_BOLD), Paragraph(emp.designation, CELL_STYLE)],
        [Paragraph("Email", CELL_BOLD), Paragraph(emp.email, CELL_STYLE),
         Paragraph("Access Level", CELL_BOLD), Paragraph(emp.access_level, CELL_STYLE)],
        [Paragraph("Manager", CELL_BOLD), Paragraph(emp.manager or "—", CELL_STYLE),
         Paragraph("", CELL_STYLE), Paragraph("", CELL_STYLE)],
    ]
    emp_tbl = Table(
        emp_data,
        colWidths=[usable * 0.18, usable * 0.32, usable * 0.18, usable * 0.32],
    )
    emp_tbl.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), LIGHT_GREY),
                ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#CBD5E1")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
            ]
        )
    )
    story.append(emp_tbl)

    # --- Latest risk score ---
    latest_rs = (
        db.execute(
            select(RiskScore)
            .where(RiskScore.employee_id == emp.id)
            .order_by(RiskScore.computed_at.desc())
            .limit(1)
        )
        .scalar_one_or_none()
    )
    if latest_rs:
        story += _section("Latest Risk Score")
        story.append(
            _stat_box_row(
                [
                    ("Risk Score", f"{latest_rs.risk_score:.2f}"),
                    ("Risk Band", str(latest_rs.risk_band)),
                    ("Logon Count", int(latest_rs.logon_count)),
                    ("After-Hours Logons", int(latest_rs.after_hours_logon_count)),
                    ("File Copies", int(latest_rs.file_copy_count)),
                ]
            )
        )

    # --- Event timeline ---
    story += _section("Investigation Timeline")

    if inv.events:
        timeline_rows = []
        for evt in inv.events:
            timeline_rows.append(
                [
                    evt.occurred_at.strftime("%Y-%m-%d %H:%M"),
                    evt.event_type,
                    evt.actor_name or "System",
                    evt.message[:120],
                ]
            )
        story.append(
            _std_table(
                ["Timestamp", "Event Type", "Actor", "Message"],
                timeline_rows,
                [usable * 0.18, usable * 0.18, usable * 0.18, usable * 0.46],
            )
        )
    else:
        story.append(Paragraph("No timeline events recorded.", BODY_STYLE))

    doc.build(story, onFirstPage=_page_footer, onLaterPages=_page_footer)
    return output_path


# ---------------------------------------------------------------------------
# 4. Compliance Audit Report
# ---------------------------------------------------------------------------


def generate_compliance_report(db: Session, output_path: str | Path) -> Path:
    """Compliance-focused PDF: alert SLA, investigation closure rates, open risks."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = _make_doc(output_path)
    story: list[Flowable] = []

    story += _header_block(
        "Compliance Audit Report",
        f"InsiderIQ Platform  •  {_now_str()}",
    )

    w, _ = A4
    usable = w - 3.6 * cm

    # --- Alert status distribution ---
    total_alerts = db.scalar(select(func.count()).select_from(Alert)) or 0
    open_alerts = (
        db.scalar(select(func.count()).select_from(Alert).where(Alert.status == AlertStatus.OPEN))
        or 0
    )
    ack_alerts = (
        db.scalar(select(func.count()).select_from(Alert).where(Alert.status == AlertStatus.ACKNOWLEDGED))
        or 0
    )
    closed_alerts = (
        db.scalar(select(func.count()).select_from(Alert).where(Alert.status == AlertStatus.CLOSED))
        or 0
    )

    closure_rate = f"{(closed_alerts / total_alerts * 100):.1f}%" if total_alerts else "N/A"

    story.append(
        _stat_box_row(
            [
                ("Total Alerts", total_alerts),
                ("Open", open_alerts),
                ("Acknowledged", ack_alerts),
                ("Closed", closed_alerts),
                ("Closure Rate", closure_rate),
            ]
        )
    )
    story.append(Spacer(1, 8))

    # --- Investigation status distribution ---
    story += _section("Investigation Status Distribution")

    total_invs = db.scalar(select(func.count()).select_from(Investigation)) or 0
    inv_status_rows = []
    for status in InvestigationStatus:
        count = (
            db.scalar(
                select(func.count())
                .select_from(Investigation)
                .where(Investigation.status == status)
            )
            or 0
        )
        pct = f"{(count / total_invs * 100):.1f}%" if total_invs else "0.0%"
        inv_status_rows.append([str(status), count, pct])

    story.append(
        _std_table(
            ["Status", "Count", "% of Total"],
            inv_status_rows,
            [usable * 0.50, usable * 0.25, usable * 0.25],
        )
    )

    # --- Unresolved high/critical investigations ---
    story += _section("Unresolved High / Critical Investigations")

    unresolved_q = (
        db.execute(
            select(Investigation, Employee)
            .join(Employee, Employee.id == Investigation.employee_id)
            .where(
                Investigation.severity.in_([Severity.HIGH, Severity.CRITICAL]),
                Investigation.status.notin_([InvestigationStatus.RESOLVED, InvestigationStatus.CLOSED]),
            )
            .order_by(Investigation.created_at)
        )
        .all()
    )

    unresolved_rows = []
    for inv, emp in unresolved_q:
        age_days = ""
        if inv.created_at:
            delta = datetime.now(timezone.utc) - inv.created_at
            age_days = str(delta.days)
        unresolved_rows.append(
            [
                inv.reference,
                inv.title[:50],
                emp.full_name,
                str(inv.severity),
                str(inv.status),
                age_days,
            ]
        )

    if unresolved_rows:
        story.append(
            _std_table(
                ["Ref", "Title", "Employee", "Severity", "Status", "Age (days)"],
                unresolved_rows,
                [
                    usable * 0.10,
                    usable * 0.28,
                    usable * 0.18,
                    usable * 0.14,
                    usable * 0.16,
                    usable * 0.14,
                ],
            )
        )
    else:
        story.append(Paragraph("No unresolved high/critical investigations.", BODY_STYLE))

    # --- Alert severity breakdown ---
    story += _section("Alert Severity Breakdown")

    sev_alert_rows = []
    for sev in Severity:
        count = (
            db.scalar(
                select(func.count()).select_from(Alert).where(Alert.severity == sev)
            )
            or 0
        )
        open_c = (
            db.scalar(
                select(func.count())
                .select_from(Alert)
                .where(Alert.severity == sev, Alert.status == AlertStatus.OPEN)
            )
            or 0
        )
        pct = f"{(count / total_alerts * 100):.1f}%" if total_alerts else "0.0%"
        sev_alert_rows.append([str(sev), count, open_c, pct])

    story.append(
        _std_table(
            ["Severity", "Total Alerts", "Open Alerts", "% of All Alerts"],
            sev_alert_rows,
            [usable * 0.28, usable * 0.24, usable * 0.24, usable * 0.24],
        )
    )

    # --- Risk band distribution ---
    story += _section("Current Risk Band Distribution")

    latest_rs_subq = (
        select(
            RiskScore.employee_id,
            func.max(RiskScore.computed_at).label("max_computed_at"),
        )
        .group_by(RiskScore.employee_id)
        .subquery()
    )
    risk_band_rows = []
    for band in RiskBand:
        count = (
            db.scalar(
                select(func.count())
                .select_from(RiskScore)
                .join(
                    latest_rs_subq,
                    (latest_rs_subq.c.employee_id == RiskScore.employee_id)
                    & (latest_rs_subq.c.max_computed_at == RiskScore.computed_at),
                )
                .where(RiskScore.risk_band == band)
            )
            or 0
        )
        risk_band_rows.append([str(band), count])

    story.append(
        _std_table(
            ["Risk Band", "Employee Count"],
            risk_band_rows,
            [usable * 0.50, usable * 0.50],
        )
    )

    doc.build(story, onFirstPage=_page_footer, onLaterPages=_page_footer)
    return output_path


# ---------------------------------------------------------------------------
# 5. Risk Assessment Report
# ---------------------------------------------------------------------------


def generate_risk_assessment_report(db: Session, output_path: str | Path) -> Path:
    """PDF report covering risk scores, distribution, and top-risk employees."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    doc = _make_doc(output_path)
    story: list[Flowable] = []

    story += _header_block(
        "Risk Assessment Report",
        f"InsiderIQ Platform  •  {_now_str()}",
    )

    w, _ = A4
    usable = w - 3.6 * cm

    # --- KPIs ---
    latest_rs_subq = (
        select(
            RiskScore.employee_id,
            func.max(RiskScore.computed_at).label("max_computed_at"),
        )
        .group_by(RiskScore.employee_id)
        .subquery()
    )

    assessed_employees = (
        db.scalar(
            select(func.count())
            .select_from(RiskScore)
            .join(
                latest_rs_subq,
                (latest_rs_subq.c.employee_id == RiskScore.employee_id)
                & (latest_rs_subq.c.max_computed_at == RiskScore.computed_at),
            )
        )
        or 0
    )

    avg_score_row = db.execute(
        select(func.avg(RiskScore.risk_score))
        .select_from(RiskScore)
        .join(
            latest_rs_subq,
            (latest_rs_subq.c.employee_id == RiskScore.employee_id)
            & (latest_rs_subq.c.max_computed_at == RiskScore.computed_at),
        )
    ).scalar()
    avg_score = f"{avg_score_row:.2f}" if avg_score_row is not None else "N/A"

    critical_count = (
        db.scalar(
            select(func.count())
            .select_from(RiskScore)
            .join(
                latest_rs_subq,
                (latest_rs_subq.c.employee_id == RiskScore.employee_id)
                & (latest_rs_subq.c.max_computed_at == RiskScore.computed_at),
            )
            .where(RiskScore.risk_band == RiskBand.CRITICAL)
        )
        or 0
    )
    high_count = (
        db.scalar(
            select(func.count())
            .select_from(RiskScore)
            .join(
                latest_rs_subq,
                (latest_rs_subq.c.employee_id == RiskScore.employee_id)
                & (latest_rs_subq.c.max_computed_at == RiskScore.computed_at),
            )
            .where(RiskScore.risk_band == RiskBand.HIGH)
        )
        or 0
    )

    story.append(
        _stat_box_row(
            [
                ("Assessed Employees", assessed_employees),
                ("Avg Risk Score", avg_score),
                ("Critical Risk", critical_count),
                ("High Risk", high_count),
            ]
        )
    )
    story.append(Spacer(1, 8))

    # --- Risk band distribution ---
    story += _section("Risk Band Distribution")

    band_rows = []
    for band in RiskBand:
        count = (
            db.scalar(
                select(func.count())
                .select_from(RiskScore)
                .join(
                    latest_rs_subq,
                    (latest_rs_subq.c.employee_id == RiskScore.employee_id)
                    & (latest_rs_subq.c.max_computed_at == RiskScore.computed_at),
                )
                .where(RiskScore.risk_band == band)
            )
            or 0
        )
        pct = f"{(count / assessed_employees * 100):.1f}%" if assessed_employees else "0.0%"
        band_rows.append([str(band), count, pct])

    story.append(
        _std_table(
            ["Risk Band", "Employee Count", "% of Assessed"],
            band_rows,
            [usable * 0.40, usable * 0.30, usable * 0.30],
        )
    )

    # --- Full risk scores table ---
    story += _section("All Employee Risk Scores (Latest)")

    all_risk = (
        db.execute(
            select(Employee, RiskScore)
            .join(RiskScore, RiskScore.employee_id == Employee.id)
            .join(
                latest_rs_subq,
                (latest_rs_subq.c.employee_id == RiskScore.employee_id)
                & (latest_rs_subq.c.max_computed_at == RiskScore.computed_at),
            )
            .order_by(RiskScore.risk_score.desc())
        )
        .all()
    )

    risk_score_rows = []
    for emp, rs in all_risk:
        risk_score_rows.append(
            [
                emp.employee_code,
                emp.full_name,
                emp.department,
                f"{rs.risk_score:.3f}",
                str(rs.risk_band),
                int(rs.logon_count),
                int(rs.after_hours_logon_count),
                int(rs.usb_connect_count),
                int(rs.file_copy_count),
                int(rs.email_count),
                rs.computed_at.strftime("%Y-%m-%d"),
            ]
        )

    if risk_score_rows:
        story.append(
            _std_table(
                ["Code", "Name", "Dept", "Score", "Band", "Logons", "After Hrs", "USB", "Files", "Emails", "Computed"],
                risk_score_rows,
                [
                    usable * 0.08,
                    usable * 0.14,
                    usable * 0.12,
                    usable * 0.07,
                    usable * 0.08,
                    usable * 0.07,
                    usable * 0.08,
                    usable * 0.07,
                    usable * 0.07,
                    usable * 0.07,
                    usable * 0.15,
                ],
            )
        )
    else:
        story.append(Paragraph("No risk score data available.", BODY_STYLE))

    doc.build(story, onFirstPage=_page_footer, onLaterPages=_page_footer)
    return output_path
