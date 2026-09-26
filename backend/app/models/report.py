from datetime import datetime, timezone
from sqlalchemy import Column, Integer, String, DateTime, JSON, Text
from backend.app.db.session import Base


class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    report_id = Column(String(50), unique=True, index=True, nullable=False)  # E.g. RPT-2026-0012
    name = Column(String(150), nullable=False)
    report_type = Column(String(100), nullable=False)  # E.g. "Executive Security Summary", "Insider Threat Report"
    created_by = Column(String(100), nullable=False, default="Security Analyst")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    date_from = Column(String(20), nullable=True)
    date_to = Column(String(20), nullable=True)
    filters = Column(JSON, default=dict)
    summary_data = Column(JSON, default=dict)
    status = Column(String(30), default="GENERATED")  # GENERATED, ARCHIVED, EXPORTED
    pdf_path = Column(String(255), nullable=True)
    excel_path = Column(String(255), nullable=True)
