from typing import Dict, Any, Tuple
from app.models import RiskLevel

class InsiderRiskScoringEngine:
    """
    Weighted Scoring Model as defined in the official specification:
    Insider Risk Score =
      - Behavioral Anomalies (35%)
      - Privilege Misuse Indicators (25%)
      - Data Access Violations (20%)
      - Access Pattern Deviations (10%)
      - Historical Security Events (10%)
    
    Categories:
      - Low: 0 - 29.9
      - Medium: 30.0 - 59.9
      - High: 60.0 - 79.9
      - Critical: 80.0 - 100.0
    """
    
    WEIGHT_BEHAVIORAL = 0.35
    WEIGHT_PRIVILEGE = 0.25
    WEIGHT_DATA_ACCESS = 0.20
    WEIGHT_ACCESS_PATTERN = 0.10
    WEIGHT_HISTORICAL_EVENTS = 0.10
    
    @classmethod
    def calculate_risk_score(
        cls,
        behavioral_anomalies_score: float,      # 0 - 100
        privilege_misuse_score: float,          # 0 - 100
        data_access_violations_score: float,    # 0 - 100
        access_pattern_deviations_score: float, # 0 - 100
        historical_security_events_score: float # 0 - 100
    ) -> Tuple[float, RiskLevel, Dict[str, Any]]:
        
        # Clamp inputs to [0, 100]
        c_beh = max(0.0, min(100.0, float(behavioral_anomalies_score)))
        c_priv = max(0.0, min(100.0, float(privilege_misuse_score)))
        c_data = max(0.0, min(100.0, float(data_access_violations_score)))
        c_pat = max(0.0, min(100.0, float(access_pattern_deviations_score)))
        c_hist = max(0.0, min(100.0, float(historical_security_events_score)))
        
        # Exact weighted sum
        overall_score = (
            cls.WEIGHT_BEHAVIORAL * c_beh +
            cls.WEIGHT_PRIVILEGE * c_priv +
            cls.WEIGHT_DATA_ACCESS * c_data +
            cls.WEIGHT_ACCESS_PATTERN * c_pat +
            cls.WEIGHT_HISTORICAL_EVENTS * c_hist
        )
        overall_score = round(overall_score, 2)
        
        # Categorization
        if overall_score >= 80.0:
            level = RiskLevel.CRITICAL
        elif overall_score >= 60.0:
            level = RiskLevel.HIGH
        elif overall_score >= 30.0:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW
            
        breakdown = {
            "overall_score": overall_score,
            "risk_level": level.value,
            "components": {
                "behavioral_anomalies": {
                    "weight": cls.WEIGHT_BEHAVIORAL,
                    "score": c_beh,
                    "weighted_contribution": round(c_beh * cls.WEIGHT_BEHAVIORAL, 2)
                },
                "privilege_misuse": {
                    "weight": cls.WEIGHT_PRIVILEGE,
                    "score": c_priv,
                    "weighted_contribution": round(c_priv * cls.WEIGHT_PRIVILEGE, 2)
                },
                "data_access_violations": {
                    "weight": cls.WEIGHT_DATA_ACCESS,
                    "score": c_data,
                    "weighted_contribution": round(c_data * cls.WEIGHT_DATA_ACCESS, 2)
                },
                "access_pattern_deviations": {
                    "weight": cls.WEIGHT_ACCESS_PATTERN,
                    "score": c_pat,
                    "weighted_contribution": round(c_pat * cls.WEIGHT_ACCESS_PATTERN, 2)
                },
                "historical_security_events": {
                    "weight": cls.WEIGHT_HISTORICAL_EVENTS,
                    "score": c_hist,
                    "weighted_contribution": round(c_hist * cls.WEIGHT_HISTORICAL_EVENTS, 2)
                }
            }
        }
        
        return overall_score, level, breakdown
