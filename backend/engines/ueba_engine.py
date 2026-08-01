from typing import List, Dict, Any

class UEBAEngine:
    def __init__(self):
        self.peer_averages = {
            "Finance": {"avg_data_mb": 450.0, "avg_risk_score": 28.5},
            "Engineering": {"avg_data_mb": 1200.0, "avg_risk_score": 32.0},
            "Sales": {"avg_data_mb": 300.0, "avg_risk_score": 18.0},
            "HR": {"avg_data_mb": 150.0, "avg_risk_score": 14.0},
            "Legal": {"avg_data_mb": 250.0, "avg_risk_score": 22.0},
            "IT": {"avg_data_mb": 800.0, "avg_risk_score": 35.0},
        }

    def analyze_user_behavior(self, employee: Dict[str, Any], current_data_mb: float, risk_score: float) -> Dict[str, Any]:
        dept = employee.get("department", "Engineering")
        peer_info = self.peer_averages.get(dept, {"avg_data_mb": 400.0, "avg_risk_score": 25.0})
        
        peer_score = peer_info["avg_risk_score"]
        diff = risk_score - peer_score
        percentile = min(99.9, max(5.0, 50.0 + (diff * 1.5)))

        if risk_score >= 85:
            prediction = "Imminent Threat"
        elif risk_score >= 65:
            prediction = "High Risk Level"
        elif risk_score >= 40:
            prediction = "Moderate Risk Level"
        else:
            prediction = "Low Risk Level"

        return {
            "employee_id": employee.get("employee_id"),
            "employee_name": employee.get("name"),
            "department": dept,
            "baseline_working_hours": "09:00 - 18:00 EST",
            "data_transfer_baseline_mb": peer_info["avg_data_mb"],
            "current_data_transfer_mb": current_data_mb,
            "anomalous_login_count": 2 if risk_score > 50 else 0,
            "peer_group_avg_score": peer_score,
            "user_score": risk_score,
            "peer_percentile": round(percentile, 1),
            "threat_prediction": prediction
        }

ueba_engine = UEBAEngine()
