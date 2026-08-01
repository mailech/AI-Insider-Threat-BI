from typing import Dict, Tuple
from config import RISK_WEIGHTS, get_risk_category

def calculate_insider_risk_score(
    behavioral_score: float,
    privilege_score: float,
    data_access_score: float,
    access_pattern_score: float,
    historical_score: float
) -> Tuple[float, str, Dict[str, float]]:
    """
    Calculates weighted Insider Risk Score according to the formula:
    Score = Behavioral(35%) + Privilege(25%) + Data Access(20%) + Access Pattern(10%) + Historical(10%)
    All inputs should be scaled 0 to 100.
    Returns: (total_score, category, breakdown_dict)
    """
    b_val = min(100.0, max(0.0, float(behavioral_score)))
    p_val = min(100.0, max(0.0, float(privilege_score)))
    d_val = min(100.0, max(0.0, float(data_access_score)))
    a_val = min(100.0, max(0.0, float(access_pattern_score)))
    h_val = min(100.0, max(0.0, float(historical_score)))

    weighted_score = (
        b_val * RISK_WEIGHTS["behavioral"] +
        p_val * RISK_WEIGHTS["privilege"] +
        d_val * RISK_WEIGHTS["data_access"] +
        a_val * RISK_WEIGHTS["access_pattern"] +
        h_val * RISK_WEIGHTS["historical"]
    )

    total_score = round(weighted_score, 1)
    category = get_risk_category(total_score)

    breakdown = {
        "behavioral": round(b_val * RISK_WEIGHTS["behavioral"], 1),
        "privilege": round(p_val * RISK_WEIGHTS["privilege"], 1),
        "data": round(d_val * RISK_WEIGHTS["data_access"], 1),
        "access": round(a_val * RISK_WEIGHTS["access_pattern"], 1),
        "historical": round(h_val * RISK_WEIGHTS["historical"], 1)
    }

    return total_score, category, breakdown
