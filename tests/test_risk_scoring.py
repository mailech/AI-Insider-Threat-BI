import pytest
from app.services.risk_service import InsiderRiskScoringEngine
from app.models import RiskLevel

def test_exact_pdf_risk_formula_calculation():
    # Weights: 35% Beh, 25% Priv, 20% Data, 10% Pattern, 10% Hist
    # Test case: 100, 100, 100, 100, 100 -> 100.0, Critical
    score, level, breakdown = InsiderRiskScoringEngine.calculate_risk_score(
        behavioral_anomalies_score=100.0,
        privilege_misuse_score=100.0,
        data_access_violations_score=100.0,
        access_pattern_deviations_score=100.0,
        historical_security_events_score=100.0
    )
    assert score == 100.0
    assert level == RiskLevel.CRITICAL
    assert breakdown["components"]["behavioral_anomalies"]["weighted_contribution"] == 35.0
    assert breakdown["components"]["privilege_misuse"]["weighted_contribution"] == 25.0
    assert breakdown["components"]["data_access_violations"]["weighted_contribution"] == 20.0
    assert breakdown["components"]["access_pattern_deviations"]["weighted_contribution"] == 10.0
    assert breakdown["components"]["historical_security_events"]["weighted_contribution"] == 10.0

def test_risk_levels():
    # Low: 0-29.9
    score, level, _ = InsiderRiskScoringEngine.calculate_risk_score(20, 10, 10, 10, 10)
    assert score < 30.0
    assert level == RiskLevel.LOW
    
    # Medium: 30-59.9
    score, level, _ = InsiderRiskScoringEngine.calculate_risk_score(50, 40, 30, 20, 20)
    assert 30.0 <= score < 60.0
    assert level == RiskLevel.MEDIUM
    
    # High: 60-79.9
    score, level, _ = InsiderRiskScoringEngine.calculate_risk_score(70, 65, 60, 50, 40)
    assert 60.0 <= score < 80.0
    assert level == RiskLevel.HIGH
    
    # Critical: 80-100
    score, level, _ = InsiderRiskScoringEngine.calculate_risk_score(90, 85, 80, 80, 75)
    assert score >= 80.0
    assert level == RiskLevel.CRITICAL
