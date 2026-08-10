from __future__ import annotations

from risk_service.app.schemas.risk import RiskScoreRequest
from risk_service.app.services.risk_engine import RiskEngine


def test_risk_engine_calculates_severity_and_score() -> None:
    request = RiskScoreRequest(
        employee_id="EMP-101",
        anomaly_score=80,
        baseline_distance=70,
        peer_distance=60,
        historical_weight=0.4,
        explanation="High anomaly and baseline drift observed.",
    )
    engine = RiskEngine()
    result = engine.calculate_risk(request)

    assert result.score >= 0
    assert result.score <= 100
    assert result.severity.value in {"low", "medium", "high", "critical"}
    assert result.history is not None if hasattr(result, "history") else True
