from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.services.report_service import ReportService
from app.auth.roles import require_role


router = APIRouter(
    prefix="/reports",
    tags=["Reports"]
)


# =========================================================
# RISK ASSESSMENT REPORT
# =========================================================

@router.get(
    "/risk",
    dependencies=[Depends(require_role(["Admin", "Security Analyst"]))]
)
def risk_assessment_report(db: Session = Depends(get_db)):
    return ReportService.get_risk_assessment_report(db)


# =========================================================
# BEHAVIORAL ANALYTICS REPORT
# =========================================================

@router.get(
    "/behavior",
    dependencies=[Depends(require_role(["Admin", "Security Analyst"]))]
)
def behavioral_analytics_report(db: Session = Depends(get_db)):
    return ReportService.get_behavioral_analytics_report(db)


# =========================================================
# INSIDER THREAT / ALERT REPORT
# =========================================================

@router.get(
    "/threats",
    dependencies=[Depends(require_role(["Admin", "Security Analyst"]))]
)
def threat_report(db: Session = Depends(get_db)):
    return ReportService.get_threat_report(db)


# =========================================================
# INVESTIGATION REPORT
# =========================================================

@router.get(
    "/investigations",
    dependencies=[Depends(require_role(["Admin", "Security Analyst"]))]
)
def investigation_report(db: Session = Depends(get_db)):
    return ReportService.get_investigation_report(db)


# =========================================================
# COMPLIANCE REPORT
# =========================================================

@router.get(
    "/compliance",
    dependencies=[Depends(require_role(["Admin", "Security Analyst"]))]
)
def compliance_report(db: Session = Depends(get_db)):
    return ReportService.get_compliance_report(db)