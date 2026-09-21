from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import InsiderRiskScore, Employee, User, RiskLevel
from app.schemas import RiskScoreResponse
from app.auth import get_current_user
from app.services.risk_service import InsiderRiskScoringEngine

router = APIRouter(prefix="/risk-scoring", tags=["Insider Risk Scoring Engine"])

@router.get("", response_model=List[RiskScoreResponse])
def get_risk_scores(
    employee_id: Optional[str] = Query(None),
    risk_level: Optional[RiskLevel] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(InsiderRiskScore)
    if employee_id:
        query = query.filter(InsiderRiskScore.employee_id == employee_id)
    if risk_level:
        query = query.filter(InsiderRiskScore.risk_level == risk_level)
    return query.order_by(InsiderRiskScore.overall_score.desc()).limit(limit).all()

@router.get("/formula")
def get_scoring_formula():
    return {
        "formula": "Insider Risk Score = 0.35 * Behavioral Anomalies + 0.25 * Privilege Misuse Indicators + 0.20 * Data Access Violations + 0.10 * Access Pattern Deviations + 0.10 * Historical Security Events",
        "weights": {
            "behavioral_anomalies": 0.35,
            "privilege_misuse": 0.25,
            "data_access_violations": 0.20,
            "access_pattern_deviations": 0.10,
            "historical_security_events": 0.10
        },
        "thresholds": {
            "Low": "0 - 29.9",
            "Medium": "30.0 - 59.9",
            "High": "60.0 - 79.9",
            "Critical": "80.0 - 100.0"
        }
    }

@router.get("/distribution")
def get_risk_distribution(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    employees = db.query(Employee).all()
    
    counts = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0}
    by_dept = {}
    
    for emp in employees:
        lvl = emp.risk_level.value if emp.risk_level else "Low"
        counts[lvl] = counts.get(lvl, 0) + 1
        
        if emp.department not in by_dept:
            by_dept[emp.department] = {"Low": 0, "Medium": 0, "High": 0, "Critical": 0, "avg_score": 0.0, "total": 0, "score_sum": 0.0}
            
        by_dept[emp.department][lvl] += 1
        by_dept[emp.department]["score_sum"] += emp.risk_score
        by_dept[emp.department]["total"] += 1
        
    dept_distribution = []
    for dept, data in by_dept.items():
        dept_distribution.append({
            "department": dept,
            "low": data["Low"],
            "medium": data["Medium"],
            "high": data["High"],
            "critical": data["Critical"],
            "avg_risk_score": round(data["score_sum"] / max(1, data["total"]), 2)
        })
        
    return {
        "total_employees": len(employees),
        "risk_levels": counts,
        "department_distribution": dept_distribution
    }

@router.post("/calculate-custom")
def calculate_custom_risk(
    behavioral: float,
    privilege: float,
    data_access: float,
    access_pattern: float,
    historical: float,
    current_user: User = Depends(get_current_user)
):
    score, level, breakdown = InsiderRiskScoringEngine.calculate_risk_score(
        behavioral_anomalies_score=behavioral,
        privilege_misuse_score=privilege,
        data_access_violations_score=data_access,
        access_pattern_deviations_score=access_pattern,
        historical_security_events_score=historical
    )
    return breakdown
