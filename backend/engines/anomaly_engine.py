import datetime
from typing import Dict, Any, Tuple

try:
    import numpy as np
    from sklearn.ensemble import IsolationForest
    HAS_SKLEARN = True
except ImportError:
    HAS_SKLEARN = False

class AnomalyDetectionEngine:
    def __init__(self):
        self.model = None
        if HAS_SKLEARN:
            # Pre-train Isolation Forest with synthetic normal user activity feature matrix
            # Features: [login_hour, data_download_mb, file_access_count, privilege_level, unrecognized_device_flag]
            X_normal = np.random.normal(loc=[13, 20, 15, 1, 0], scale=[2, 5, 4, 0.2, 0.05], size=(200, 5))
            self.model = IsolationForest(contamination=0.08, random_state=42)
            self.model.fit(X_normal)

    def evaluate_activity(self, activity_data: Dict[str, Any]) -> Tuple[bool, float, str]:
        """
        Evaluates an activity log entry and returns: (is_anomaly, anomaly_risk_score, anomaly_type_description)
        """
        act_type = activity_data.get("activity_type", "")
        details = activity_data.get("details", "").lower()
        
        score = 0.0
        reasons = []

        # Rule 1: Unusual Login Time (Between 11 PM and 5 AM)
        time_str = activity_data.get("timestamp", "")
        if "23:" in time_str or "00:" in time_str or "01:" in time_str or "02:" in time_str or "03:" in time_str or "04:" in time_str:
            score += 35.0
            reasons.append("Unusual Login Time")

        # Rule 2: Data Exfiltration / Massive Downloads
        if "download" in details or "transfer" in details or "files" in details:
            if "1," in details or "gb" in details or "restricted" in details or "exceed" in details or "300%" in details:
                score += 45.0
                reasons.append("Abnormal Data Download / Exfiltration")

        # Rule 3: Privilege Abuse / Unauthorized Access
        if "privilege" in details or "denied" in details or "elevated" in details or "unauthorized" in details or "payroll" in details:
            score += 40.0
            reasons.append("Privilege Abuse / Unauthorized Access")

        # Rule 4: Suspicious USB / Personal Cloud
        if "usb" in details or "unregistered" in details or "personal cloud" in details or "external drive" in details:
            score += 40.0
            reasons.append("Suspicious Device Usage")

        # ML model check if scikit-learn is available
        if HAS_SKLEARN and self.model:
            hour = 14
            try:
                if ":" in time_str:
                    hour = int(time_str.split(":")[0][-2:])
            except Exception:
                pass
            
            download_mb = 500 if ("1," in details or "gb" in details) else 15
            file_count = 100 if "files" in details else 5
            priv_flag = 3 if "elevated" in details else 1
            device_flag = 1 if ("usb" in details or "unrecognized" in details) else 0

            sample = np.array([[hour, download_mb, file_count, priv_flag, device_flag]])
            prediction = self.model.predict(sample)[0] # -1 for anomaly, 1 for normal
            if prediction == -1:
                score = max(score, 65.0)
                if not reasons:
                    reasons.append("Isolation Forest Anomaly Detected")

        is_anomaly = score >= 30.0
        description = ", ".join(reasons) if reasons else "Normal Activity Baseline"
        return is_anomaly, min(score, 100.0), description

anomaly_engine = AnomalyDetectionEngine()
