import os
import io
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session
from sqlalchemy import desc, func

import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

from backend.app.models.employee import Employee
from backend.app.models.feature import DailyBehavioralFeature
from backend.app.models.baseline import BehavioralBaseline
from backend.app.models.alert import Alert
from backend.app.models.incident import Incident


class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and render total page count on footers.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))

        # Header rule & title (pages after first)
        if self._pageNumber > 1:
            self.setStrokeColor(colors.HexColor("#1e293b"))
            self.setLineWidth(0.5)
            self.line(40, 755, 572, 755)
            self.drawString(40, 760, "CONFIDENTIAL - SOC INSIDER THREAT INTELLIGENCE REPORT")
            self.drawRightString(572, 760, datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC"))

        # Footer rule & numbering
        self.setStrokeColor(colors.HexColor("#1e293b"))
        self.setLineWidth(0.5)
        self.line(40, 45, 572, 45)
        self.drawString(40, 32, "AI-Powered Behavioral Intelligence & Threat BI Platform")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(572, 32, page_str)
        self.restoreState()


class ReportGeneratorService:
    """
    Core service for collecting real database/ML telemetry and generating
    professional PDF reports (ReportLab) and Excel workbooks (openpyxl).
    """

    REPORT_DIR = "data/reports"

    @classmethod
    def collect_data(
        cls,
        db: Session,
        report_type: str = "Executive Security Summary",
        date_from: Optional[str] = None,
        date_to: Optional[str] = None,
        user_id: Optional[str] = None,
        department: Optional[str] = None,
        severity: Optional[str] = None,
        author: str = "Security Analyst"
    ) -> Dict[str, Any]:
        """
        Gathers complete, consistent telemetry from the database using active filters.
        """
        # Base queries
        emp_query = db.query(Employee)
        if department and department.upper() != "ALL":
            emp_query = emp_query.filter(Employee.department == department)
        if severity and severity.upper() != "ALL":
            emp_query = emp_query.filter(Employee.current_severity == severity.upper())
        if user_id:
            emp_query = emp_query.filter(Employee.user_id == user_id)

        employees = emp_query.order_by(desc(Employee.current_risk_score)).all()

        # Activity Query
        act_query = db.query(DailyBehavioralFeature)
        if date_from:
            act_query = act_query.filter(DailyBehavioralFeature.date >= date_from)
        if date_to:
            act_query = act_query.filter(DailyBehavioralFeature.date <= date_to)
        if user_id:
            act_query = act_query.filter(DailyBehavioralFeature.user_id == user_id)

        activities = act_query.order_by(desc(DailyBehavioralFeature.date)).limit(1000).all()

        # Alerts Query
        alert_query = db.query(Alert)
        if user_id:
            alert_query = alert_query.filter(Alert.user_id == user_id)
        if severity and severity.upper() != "ALL":
            alert_query = alert_query.filter(Alert.severity == severity.upper())
        if date_from:
            alert_query = alert_query.filter(Alert.timestamp >= date_from)
        if date_to:
            alert_query = alert_query.filter(Alert.timestamp <= f"{date_to}T23:59:59Z")

        alerts = alert_query.order_by(desc(Alert.id)).limit(100).all()

        # Incidents Query
        inc_query = db.query(Incident)
        if user_id:
            inc_query = inc_query.filter(Incident.user_id == user_id)
        if severity and severity.upper() != "ALL":
            inc_query = inc_query.filter(Incident.severity == severity.upper())

        incidents = inc_query.order_by(desc(Incident.id)).all()

        # Summary statistics
        total_employees = len(employees)
        monitored_employees = sum(1 for e in employees if e.is_monitored)
        critical_count = sum(1 for e in employees if e.current_severity == "CRITICAL")
        high_count = sum(1 for e in employees if e.current_severity == "HIGH")
        medium_count = sum(1 for e in employees if e.current_severity == "MEDIUM")
        low_count = sum(1 for e in employees if e.current_severity == "LOW")

        avg_risk_score = round(sum(e.current_risk_score for e in employees) / max(total_employees, 1), 1)
        total_activities = len(activities)
        total_anomalies = sum(1 for a in activities if a.is_anomaly)

        # Department risk breakdown
        dept_map = {}
        for e in employees:
            dept = e.department or "General"
            dept_map.setdefault(dept, []).append(e.current_risk_score)
        
        dept_risk_list = [
            {"department": d, "avg_risk": round(sum(scores) / len(scores), 1), "count": len(scores)}
            for d, scores in dept_map.items()
        ]

        # Specific user context for Employee Risk Report
        target_employee = None
        target_baselines = []
        if user_id:
            target_employee = db.query(Employee).filter(Employee.user_id == user_id).first()
            target_baselines = db.query(BehavioralBaseline).filter(BehavioralBaseline.user_id == user_id).all()

        return {
            "report_title": f"{report_type}",
            "report_type": report_type,
            "generated_at": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
            "author": author,
            "period": f"{date_from or 'All Time'} to {date_to or 'Present'}",
            "filters": {
                "date_from": date_from,
                "date_to": date_to,
                "user_id": user_id,
                "department": department or "ALL",
                "severity": severity or "ALL"
            },
            "metrics": {
                "total_employees": total_employees,
                "monitored_employees": monitored_employees,
                "critical_threats": critical_count,
                "high_risk_users": high_count,
                "medium_risk_users": medium_count,
                "low_risk_users": low_count,
                "avg_risk_score": avg_risk_score,
                "total_activities_analyzed": total_activities,
                "total_anomalies_detected": total_anomalies,
                "active_alerts_count": len(alerts),
                "open_incidents_count": len(incidents)
            },
            "top_risky_employees": [
                {
                    "user_id": e.user_id,
                    "full_name": e.full_name,
                    "department": e.department,
                    "role": e.role,
                    "current_risk_score": e.current_risk_score,
                    "current_severity": e.current_severity,
                    "anomaly_count": e.anomaly_count,
                    "alert_count": e.alert_count
                } for e in employees[:15]
            ],
            "alerts": [
                {
                    "alert_id": a.alert_id,
                    "user_id": a.user_id,
                    "timestamp": a.timestamp,
                    "severity": a.severity,
                    "risk_score": a.risk_score,
                    "reasons": a.reasons or [],
                    "status": a.status,
                    "assigned_analyst": a.assigned_analyst
                } for a in alerts[:25]
            ],
            "incidents": [
                {
                    "incident_id": inc.incident_id,
                    "title": inc.title,
                    "user_id": inc.user_id,
                    "severity": inc.severity,
                    "status": inc.status,
                    "assigned_analyst": inc.assigned_analyst,
                    "description": inc.description
                } for inc in incidents[:15]
            ],
            "department_breakdown": dept_risk_list,
            "target_employee": {
                "user_id": target_employee.user_id,
                "full_name": target_employee.full_name,
                "email": target_employee.email,
                "department": target_employee.department,
                "role": target_employee.role,
                "current_risk_score": target_employee.current_risk_score,
                "current_severity": target_employee.current_severity,
                "devices": target_employee.devices or [],
                "access_privileges": target_employee.access_privileges or []
            } if target_employee else None,
            "target_baselines": [
                {
                    "metric": b.metric_name,
                    "mean": b.mean,
                    "std": b.std,
                    "median": b.median,
                    "q75": b.q75,
                    "normal_hours": f"{b.normal_hours_start:.1f}h - {b.normal_hours_end:.1f}h"
                } for b in target_baselines
            ]
        }

    @classmethod
    def generate_pdf(cls, report_data: Dict[str, Any], output_path: Optional[str] = None) -> bytes:
        """
        Builds a crisp, executive SOC PDF document using ReportLab Platypus.
        """
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            leftMargin=36,
            rightMargin=36,
            topMargin=44,
            bottomMargin=54
        )

        styles = getSampleStyleSheet()
        
        # Custom styles
        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=18,
            leading=22,
            textColor=colors.HexColor("#0f172a")
        )
        subtitle_style = ParagraphStyle(
            "DocSubtitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#475569")
        )
        h2_style = ParagraphStyle(
            "Heading2Custom",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=12,
            leading=16,
            textColor=colors.HexColor("#0284c7"),
            spaceBefore=12,
            spaceAfter=6
        )
        body_style = ParagraphStyle(
            "BodyCustom",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=9,
            leading=12,
            textColor=colors.HexColor("#1e293b")
        )
        body_bold = ParagraphStyle(
            "BodyBold",
            parent=body_style,
            fontName="Helvetica-Bold"
        )
        badge_crit = ParagraphStyle(
            "BadgeCrit",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#ef4444")
        )
        badge_high = ParagraphStyle(
            "BadgeHigh",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=8,
            leading=10,
            textColor=colors.HexColor("#f97316")
        )

        story = []

        # Header Block
        title_p = Paragraph(f"CERT THREAT-BI &bull; {report_data.get('report_title', 'Security Report')}", title_style)
        subtitle_p = Paragraph(
            f"<b>Reporting Period:</b> {report_data.get('period')} &nbsp;&bull;&nbsp; "
            f"<b>Generated:</b> {report_data.get('generated_at')} &nbsp;&bull;&nbsp; "
            f"<b>Analyst:</b> {report_data.get('author')}",
            subtitle_style
        )
        story.append(title_p)
        story.append(Spacer(1, 4))
        story.append(subtitle_p)
        story.append(Spacer(1, 8))
        story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#0284c7"), spaceAfter=12))

        # Executive Metrics Cards Table
        m = report_data.get("metrics", {})
        summary_cards_data = [
            [
                Paragraph("<b>Total Monitored</b>", body_style),
                Paragraph("<b>Critical Threats</b>", body_style),
                Paragraph("<b>High Risk Users</b>", body_style),
                Paragraph("<b>Total Anomalies</b>", body_style),
                Paragraph("<b>Avg Risk Score</b>", body_style)
            ],
            [
                Paragraph(f"<font size=14><b>{m.get('total_employees', 0)}</b></font>", body_bold),
                Paragraph(f"<font size=14 color='#ef4444'><b>{m.get('critical_threats', 0)}</b></font>", body_bold),
                Paragraph(f"<font size=14 color='#f97316'><b>{m.get('high_risk_users', 0)}</b></font>", body_bold),
                Paragraph(f"<font size=14 color='#06b6d4'><b>{m.get('total_anomalies_detected', 0)}</b></font>", body_bold),
                Paragraph(f"<font size=14 color='#6366f1'><b>{m.get('avg_risk_score', 0)} / 100</b></font>", body_bold)
            ]
        ]
        t_cards = Table(summary_cards_data, colWidths=[104, 104, 104, 104, 104])
        t_cards.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(t_cards)
        story.append(Spacer(1, 14))

        # Target Employee Section (if specific employee selected)
        target_emp = report_data.get("target_employee")
        if target_emp:
            story.append(Paragraph("Employee Threat Profile", h2_style))
            emp_info = [
                [
                    Paragraph(f"<b>Employee ID:</b> {target_emp['user_id']}", body_style),
                    Paragraph(f"<b>Full Name:</b> {target_emp['full_name']}", body_style),
                    Paragraph(f"<b>Department:</b> {target_emp['department']}", body_style)
                ],
                [
                    Paragraph(f"<b>Role / Title:</b> {target_emp['role']}", body_style),
                    Paragraph(f"<b>Current Risk Score:</b> <font color='#ef4444'><b>{target_emp['current_risk_score']} ({target_emp['current_severity']})</b></font>", body_style),
                    Paragraph(f"<b>Email:</b> {target_emp['email']}", body_style)
                ]
            ]
            t_emp = Table(emp_info, colWidths=[174, 174, 174])
            t_emp.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f1f5f9")),
                ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            story.append(t_emp)
            story.append(Spacer(1, 14))

        # Top Risky Employees Table
        story.append(Paragraph("High-Risk Monitored Personnel", h2_style))
        emp_rows = [
            [
                Paragraph("<b>User ID</b>", body_bold),
                Paragraph("<b>Name & Title</b>", body_bold),
                Paragraph("<b>Department</b>", body_bold),
                Paragraph("<b>Risk Score</b>", body_bold),
                Paragraph("<b>Severity</b>", body_bold),
                Paragraph("<b>Anomalies</b>", body_bold)
            ]
        ]
        for e in report_data.get("top_risky_employees", [])[:8]:
            sev = e.get("current_severity", "LOW")
            sev_p = Paragraph(f"<b>{sev}</b>", badge_crit if sev == "CRITICAL" else (badge_high if sev == "HIGH" else body_style))
            emp_rows.append([
                Paragraph(str(e.get("user_id")), body_style),
                Paragraph(f"{e.get('full_name')}<br/><font size=7 color='#64748b'>{e.get('role')}</font>", body_style),
                Paragraph(str(e.get("department")), body_style),
                Paragraph(f"<b>{e.get('current_risk_score')}</b>", body_style),
                sev_p,
                Paragraph(str(e.get("anomaly_count", 0)), body_style)
            ])

        t_emps = Table(emp_rows, colWidths=[65, 170, 110, 65, 65, 45])
        t_emps.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        story.append(t_emps)
        story.append(Spacer(1, 14))

        # Recent Correlated Alerts Table
        alerts = report_data.get("alerts", [])
        if alerts:
            story.append(Paragraph("Security Threat Alerts Log", h2_style))
            alert_rows = [
                [
                    Paragraph("<b>Alert ID</b>", body_bold),
                    Paragraph("<b>User</b>", body_bold),
                    Paragraph("<b>Timestamp</b>", body_bold),
                    Paragraph("<b>Severity</b>", body_bold),
                    Paragraph("<b>Trigger Reasons & Evidence</b>", body_bold)
                ]
            ]
            for a in alerts[:6]:
                reasons_txt = "<br/>&bull; ".join(a.get("reasons", [])[:2])
                sev = a.get("severity", "LOW")
                sev_p = Paragraph(f"<b>{sev}</b>", badge_crit if sev == "CRITICAL" else (badge_high if sev == "HIGH" else body_style))
                alert_rows.append([
                    Paragraph(str(a.get("alert_id")), body_style),
                    Paragraph(str(a.get("user_id")), body_style),
                    Paragraph(str(a.get("timestamp"))[:19].replace("T", " "), body_style),
                    sev_p,
                    Paragraph(f"&bull; {reasons_txt}", body_style)
                ])

            t_alerts = Table(alert_rows, colWidths=[80, 60, 105, 55, 220])
            t_alerts.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#cbd5e1")),
                ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(t_alerts)

        # Build document with NumberedCanvas
        doc.build(story, canvasmaker=NumberedCanvas)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(pdf_bytes)

        return pdf_bytes

    @classmethod
    def generate_excel(cls, report_data: Dict[str, Any], output_path: Optional[str] = None) -> bytes:
        """
        Builds a multi-sheet, beautifully formatted Excel workbook using openpyxl.
        """
        wb = openpyxl.Workbook()
        
        # Styles
        header_fill = PatternFill(start_color="0F172A", end_color="0F172A", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        sub_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        sub_font = Font(name="Calibri", size=10, bold=True, color="00FFFF")
        title_font = Font(name="Calibri", size=14, bold=True, color="0F172A")
        bold_font = Font(name="Calibri", size=10, bold=True)
        regular_font = Font(name="Calibri", size=10)
        
        border_side = Side(style="thin", color="CBD5E1")
        cell_border = Border(left=border_side, right=border_side, top=border_side, bottom=border_side)

        # ----------------- Sheet 1: Executive Summary -----------------
        ws_sum = wb.active
        ws_sum.title = "Executive Summary"
        ws_sum.views.sheetView[0].showGridLines = True

        ws_sum.append([f"CERT THREAT-BI - {report_data.get('report_title', 'Report')}"])
        ws_sum.cell(row=1, column=1).font = title_font
        ws_sum.append([f"Reporting Period: {report_data.get('period')}"])
        ws_sum.append([f"Generated At: {report_data.get('generated_at')} | Author: {report_data.get('author')}"])
        ws_sum.append([])

        ws_sum.append(["Core Telemetry KPI Metric", "Value"])
        ws_sum.cell(row=5, column=1).fill = header_fill
        ws_sum.cell(row=5, column=1).font = header_font
        ws_sum.cell(row=5, column=2).fill = header_fill
        ws_sum.cell(row=5, column=2).font = header_font

        m = report_data.get("metrics", {})
        kpis = [
            ("Total Monitored Employees", m.get("total_employees", 0)),
            ("Critical Threats (Risk >= 80)", m.get("critical_threats", 0)),
            ("High Risk Users (Risk 65-79)", m.get("high_risk_users", 0)),
            ("Medium Risk Users (Risk 40-64)", m.get("medium_risk_users", 0)),
            ("Low Risk Users (Risk 0-39)", m.get("low_risk_users", 0)),
            ("Enterprise Average Risk Score", m.get("avg_risk_score", 0)),
            ("Total Behavioral Activities Analyzed", m.get("total_activities_analyzed", 0)),
            ("Total Anomaly Events Flagged", m.get("total_anomalies_detected", 0)),
            ("Active Security Alerts", m.get("active_alerts_count", 0)),
            ("Open Investigation Cases", m.get("open_incidents_count", 0))
        ]
        for row_idx, (kpi, val) in enumerate(kpis, start=6):
            ws_sum.append([kpi, val])
            ws_sum.cell(row=row_idx, column=1).font = regular_font
            ws_sum.cell(row=row_idx, column=1).border = cell_border
            ws_sum.cell(row=row_idx, column=2).font = bold_font
            ws_sum.cell(row=row_idx, column=2).border = cell_border
            ws_sum.cell(row=row_idx, column=2).alignment = Alignment(horizontal="center")

        # ----------------- Sheet 2: Employees & Risk Scores -----------------
        ws_emp = wb.create_sheet(title="Employees Risk Matrix")
        ws_emp.views.sheetView[0].showGridLines = True
        
        headers_emp = ["User ID", "Full Name", "Department", "Job Role", "Risk Score (0-100)", "Severity Tier", "Anomalies Count", "Alerts Count"]
        ws_emp.append(headers_emp)
        for col in range(1, len(headers_emp) + 1):
            cell = ws_emp.cell(row=1, column=col)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")

        for row_idx, e in enumerate(report_data.get("top_risky_employees", []), start=2):
            ws_emp.append([
                e.get("user_id"),
                e.get("full_name"),
                e.get("department"),
                e.get("role"),
                e.get("current_risk_score"),
                e.get("current_severity"),
                e.get("anomaly_count", 0),
                e.get("alert_count", 0)
            ])
            for col in range(1, len(headers_emp) + 1):
                c = ws_emp.cell(row=row_idx, column=col)
                c.font = regular_font
                c.border = cell_border

        # ----------------- Sheet 3: Security Alerts -----------------
        ws_alt = wb.create_sheet(title="Security Alerts Log")
        ws_alt.views.sheetView[0].showGridLines = True
        headers_alt = ["Alert ID", "User ID", "Timestamp", "Severity", "Risk Score", "Status", "Assigned Analyst", "Trigger Reasons"]
        ws_alt.append(headers_alt)
        for col in range(1, len(headers_alt) + 1):
            cell = ws_alt.cell(row=1, column=col)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")

        for row_idx, a in enumerate(report_data.get("alerts", []), start=2):
            reasons_str = " | ".join(a.get("reasons", []))
            ws_alt.append([
                a.get("alert_id"),
                a.get("user_id"),
                str(a.get("timestamp")),
                a.get("severity"),
                a.get("risk_score"),
                a.get("status"),
                a.get("assigned_analyst"),
                reasons_str
            ])
            for col in range(1, len(headers_alt) + 1):
                c = ws_alt.cell(row=row_idx, column=col)
                c.font = regular_font
                c.border = cell_border

        # ----------------- Sheet 4: Investigations & Incidents -----------------
        ws_inc = wb.create_sheet(title="Investigation Cases")
        ws_inc.views.sheetView[0].showGridLines = True
        headers_inc = ["Incident ID", "Title", "User ID", "Severity", "Status", "Assigned Lead", "Description"]
        ws_inc.append(headers_inc)
        for col in range(1, len(headers_inc) + 1):
            cell = ws_inc.cell(row=1, column=col)
            cell.fill = header_fill
            cell.font = header_font
            cell.alignment = Alignment(horizontal="center")

        for row_idx, inc in enumerate(report_data.get("incidents", []), start=2):
            ws_inc.append([
                inc.get("incident_id"),
                inc.get("title"),
                inc.get("user_id"),
                inc.get("severity"),
                inc.get("status"),
                inc.get("assigned_analyst"),
                inc.get("description")
            ])
            for col in range(1, len(headers_inc) + 1):
                c = ws_inc.cell(row=row_idx, column=col)
                c.font = regular_font
                c.border = cell_border

        # Auto-fit column widths across all sheets
        for sheet in wb.worksheets:
            for col in sheet.columns:
                max_len = max(len(str(cell.value or '')) for cell in col)
                col_letter = get_column_letter(col[0].column)
                sheet.column_dimensions[col_letter].width = min(max(max_len + 3, 12), 45)

        buffer = io.BytesIO()
        wb.save(buffer)
        excel_bytes = buffer.getvalue()
        buffer.close()

        if output_path:
            os.makedirs(os.path.dirname(output_path), exist_ok=True)
            with open(output_path, "wb") as f:
                f.write(excel_bytes)

        return excel_bytes
