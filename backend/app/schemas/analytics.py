from typing import List, Dict, Any, Optional
from pydantic import BaseModel


class DashboardSummaryCards(BaseModel):
    total_employees: int
    monitored_employees: int
    anomalous_users: int
    high_risk_users: int
    critical_users: int
    active_alerts: int
    open_investigations: int


class RiskDistributionItem(BaseModel):
    name: str  # LOW, MEDIUM, HIGH, CRITICAL
    count: int
    color: str


class TrendPoint(BaseModel):
    date: str
    risk_avg: float
    anomaly_count: int
    alert_count: int
    critical_count: int


class DepartmentRiskItem(BaseModel):
    department: str
    avg_risk: float
    employee_count: int
    anomaly_count: int


class ActivityDistributionItem(BaseModel):
    name: str
    count: int
    anomaly_ratio: float


class TopAnomalousUser(BaseModel):
    user_id: str
    full_name: str
    department: str
    role: str
    risk_score: float
    severity: str
    anomaly_count: int
    top_factors: List[str]


class DashboardSummaryResponse(BaseModel):
    cards: DashboardSummaryCards
    risk_distribution: List[RiskDistributionItem]
    trend: List[TrendPoint]
    top_anomalous_users: List[TopAnomalousUser]
    department_distribution: List[DepartmentRiskItem]
    activity_distribution: List[ActivityDistributionItem]
    latest_alerts: List[Dict[str, Any]]
    active_investigations: List[Dict[str, Any]]
