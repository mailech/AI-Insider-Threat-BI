"""Report generation utilities — PDF (ReportLab) and Excel (openpyxl)."""

from app.reports.pdf_generator import (
    generate_behavioral_report,
    generate_compliance_report,
    generate_insider_threat_report,
    generate_investigation_report,
    generate_risk_assessment_report,
)
from app.reports.excel_generator import (
    generate_behavioral_excel,
    generate_insider_threat_excel,
    generate_risk_assessment_excel,
)

__all__ = [
    # PDF
    "generate_insider_threat_report",
    "generate_behavioral_report",
    "generate_investigation_report",
    "generate_compliance_report",
    "generate_risk_assessment_report",
    # Excel
    "generate_insider_threat_excel",
    "generate_behavioral_excel",
    "generate_risk_assessment_excel",
]
