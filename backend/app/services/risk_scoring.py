from dataclasses import dataclass


@dataclass(frozen=True)
class RiskSignals:
    behavioral_anomalies: float
    privilege_misuse: float
    data_access_violations: float
    access_pattern_deviations: float
    historical_security_events: float


def calculate_risk_score(signals: RiskSignals) -> int:
    """Apply the weighted model specified in the project brief, returning 0-100."""
    weighted_score = (
        signals.behavioral_anomalies * 0.35
        + signals.privilege_misuse * 0.25
        + signals.data_access_violations * 0.20
        + signals.access_pattern_deviations * 0.10
        + signals.historical_security_events * 0.10
    )
    return max(0, min(100, round(weighted_score)))


def risk_category(score: int) -> str:
    if score >= 85:
        return "Critical"
    if score >= 65:
        return "High"
    if score >= 35:
        return "Medium"
    return "Low"
