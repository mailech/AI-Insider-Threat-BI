from __future__ import annotations

from datetime import datetime

from risk_service.app.models.risk_score import RiskScore, RiskSeverity
from risk_service.app.schemas.risk import RiskScoreRequest


class RiskEngine:
    def calculate_risk(self, request: RiskScoreRequest) -> RiskScore:
        weighted_score = (
            request.anomaly_score * 0.45
            + request.baseline_distance * 0.35
            + request.peer_distance * 0.20
        )

        historical_adjustment = weighted_score * request.historical_weight
        final_score = min(100.0, round(weighted_score + historical_adjustment, 2))

        if final_score >= 85:
            severity = RiskSeverity.CRITICAL
        elif final_score >= 65:
            severity = RiskSeverity.HIGH
        elif final_score >= 40:
            severity = RiskSeverity.MEDIUM
        else:
            severity = RiskSeverity.LOW

        trend_direction = "increasing" if request.peer_distance > 50 else "stable"

        return RiskScore(
            employee_id=request.employee_id,
            severity=severity,
            score=final_score,
            score_breakdown={
                "anomaly_score": round(request.anomaly_score * 0.45, 2),
                "baseline_distance": round(request.baseline_distance * 0.35, 2),
                "peer_distance": round(request.peer_distance * 0.20, 2),
                "historical_adjustment": round(historical_adjustment, 2),
            },
            trend_direction=trend_direction,
            historical_weight=request.historical_weight,
            computed_at=datetime.utcnow(),
            explanation=(
                f"Risk score derived from anomaly score, baseline drift, peer deviation, "
                f"and a historical weighting of {request.historical_weight:.2f}."
            ),
        )
