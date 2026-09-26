from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, ConfigDict


class ReportFilterParams(BaseModel):
    report_type: str = "Executive Security Summary"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    user_id: Optional[str] = None
    department: Optional[str] = None
    severity: Optional[str] = None
    name: Optional[str] = None


class ReportGenerateRequest(BaseModel):
    report_type: str = "Executive Security Summary"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    user_id: Optional[str] = None
    department: Optional[str] = None
    severity: Optional[str] = None
    name: Optional[str] = None


class ReportSaveRequest(BaseModel):
    name: Optional[str] = None
    report_type: str = "Executive Security Summary"
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    filters: Optional[Dict[str, Any]] = None
    summary_data: Optional[Dict[str, Any]] = None


class ReportResponse(BaseModel):
    id: int
    report_id: str
    name: str
    report_type: str
    created_by: str
    created_at: datetime
    date_from: Optional[str] = None
    date_to: Optional[str] = None
    filters: Dict[str, Any] = {}
    summary_data: Dict[str, Any] = {}
    status: str
    pdf_path: Optional[str] = None
    excel_path: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class ReportListResponse(BaseModel):
    total: int
    reports: List[ReportResponse]
