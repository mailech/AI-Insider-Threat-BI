from typing import List, Dict, Any, Optional
import numpy as np
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.models.employee import Employee
from backend.app.models.feature import DailyBehavioralFeature


class ExplainableRiskEngine:
    """
    5-Factor Explainable Insider Risk Scoring Engine.
    Combines ML anomaly detection, role privileges, data sensitivity,
    access patterns, and personal historical deviation into an auditable 0-100 score.
    """

    ROLE_WEIGHTS = {
        "Executive": 95.0,
        "C-Suite": 95.0,
        "VP": 90.0,
        "Director": 85.0,
        "IT Admin": 90.0,
        "System Administrator": 90.0,
        "Database Administrator": 85.0,
        "Security Analyst": 80.0,
        "Software Engineer": 65.0,
        "Data Engineer": 70.0,
        "HR Manager": 60.0,
        "Financial Analyst": 65.0,
        "Sales Representative": 45.0,
        "Staff": 40.0
    }

    FACTOR_WEIGHTS = {
        "ml_anomaly": 0.35,
        "privilege_role": 0.25,
        "data_sensitivity": 0.20,
        "access_pattern": 0.10,
        "historical_deviation": 0.10
    }

    def __init__(self, factor_weights: Optional[Dict[str, float]] = None):
        self.weights = factor_weights or self.FACTOR_WEIGHTS

    @staticmethod
    def _safe_float(val: Any, default: float = 0.0) -> float:
        if val is None or pd.isna(val):
            return default
        try:
            res = float(val)
            return default if np.isnan(res) else res
        except (ValueError, TypeError):
            return default

    def calculate_risk(
        self,
        record: Dict[str, Any],
        employee_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Calculates the 5-factor risk score and explainable breakdown for an individual daily record.
        """
        employee_context = employee_context or {}
        role = employee_context.get("role", "Staff")
        
        # 1. Factor 1: ML Anomaly Score (0 - 100)
        iso_score = self._safe_float(record.get("anomaly_score", 0.0)) * 100.0
        threat_prob = record.get("threat_probability")
        if threat_prob is None or pd.isna(threat_prob):
            threat_prob = record.get("anomaly_score", 0.0)
        xgb_score = self._safe_float(threat_prob) * 100.0
        f1_ml = float(np.clip(0.5 * iso_score + 0.5 * xgb_score, 0.0, 100.0))

        # 2. Factor 2: Privilege & Role Factor (0 - 100)
        base_role_score = self.ROLE_WEIGHTS.get(role, 45.0)
        neuroticism = self._safe_float(employee_context.get("neuroticism", 25.0), 25.0)
        agreeableness = self._safe_float(employee_context.get("agreeableness", 30.0), 30.0)
        conscientiousness = self._safe_float(employee_context.get("conscientiousness", 30.0), 30.0)
        
        psycho_modifier = 0.0
        if neuroticism > 40.0:
            psycho_modifier += 8.0
        if agreeableness < 20.0:
            psycho_modifier += 6.0
        if conscientiousness < 20.0:
            psycho_modifier += 6.0
        
        f2_privilege = float(np.clip(base_role_score + psycho_modifier, 0.0, 100.0))

        # 3. Factor 3: Data Sensitivity & Exfiltration Factor (0 - 100)
        sens_files = self._safe_float(record.get("sensitive_file_activity", 0.0))
        usb_connects = self._safe_float(record.get("device_connect_count", 0.0))
        after_hrs_device = self._safe_float(record.get("after_hours_device", 0.0))
        attachments = self._safe_float(record.get("attachment_count", 0.0))
        susp_domains = self._safe_float(record.get("suspicious_domain_count", 0.0))
        avg_email_sz = self._safe_float(record.get("avg_email_size", 0.0))

        f3_data = (
            min(sens_files * 4.0, 40.0) +
            min(usb_connects * 15.0, 30.0) +
            min(after_hrs_device * 10.0, 20.0) +
            min(attachments * 3.0, 15.0) +
            min(susp_domains * 10.0, 20.0) +
            min(avg_email_sz * 2.0, 10.0)
        )
        f3_data = float(np.clip(f3_data, 0.0, 100.0))

        # 4. Factor 4: Access Pattern Factor (0 - 100)
        after_hrs_logon = self._safe_float(record.get("after_hours_logon", 0.0))
        weekend_logon = self._safe_float(record.get("weekend_logon", 0.0))
        unique_pcs = self._safe_float(record.get("unique_pcs", 1.0), 1.0)
        after_hrs_http = self._safe_float(record.get("after_hours_http", 0.0))
        after_hrs_file = self._safe_float(record.get("after_hours_file", 0.0))

        f4_access = (
            min(after_hrs_logon * 20.0, 40.0) +
            min(weekend_logon * 25.0, 30.0) +
            (20.0 if unique_pcs > 2 else (10.0 if unique_pcs > 1 else 0.0)) +
            min(after_hrs_http * 0.1, 15.0) +
            min(after_hrs_file * 0.5, 15.0)
        )
        f4_access = float(np.clip(f4_access, 0.0, 100.0))

        # 5. Factor 5: Historical Baseline Deviation Factor (0 - 100)
        dev_score = self._safe_float(record.get("activity_deviation_score", 0.0)) * 100.0
        z_vol = max(self._safe_float(record.get("activity_volume_zscore", 0.0)), 0.0) * 10.0
        z_file = max(self._safe_float(record.get("file_activity_zscore", 0.0)), 0.0) * 10.0
        z_sens = max(self._safe_float(record.get("sensitive_file_zscore", 0.0)), 0.0) * 10.0
        
        f5_hist = float(np.clip(0.4 * dev_score + 0.2 * z_vol + 0.2 * z_file + 0.2 * z_sens, 0.0, 100.0))

        # Weighted Composite Risk Score (0 - 100)
        composite_score = (
            self.weights["ml_anomaly"] * f1_ml +
            self.weights["privilege_role"] * f2_privilege +
            self.weights["data_sensitivity"] * f3_data +
            self.weights["access_pattern"] * f4_access +
            self.weights["historical_deviation"] * f5_hist
        )
        if np.isnan(composite_score):
            composite_score = 0.0
        composite_score = int(round(float(np.clip(composite_score, 0.0, 100.0))))

        # Risk Tier
        if composite_score >= 80:
            risk_tier = "CRITICAL"
        elif composite_score >= 65:
            risk_tier = "HIGH"
        elif composite_score >= 40:
            risk_tier = "MEDIUM"
        else:
            risk_tier = "LOW"

        # Explainable Key Risk Drivers
        drivers = []
        if f1_ml >= 70.0:
            drivers.append(f"High ML Anomaly Flag (Score: {f1_ml:.1f}/100)")
        if f3_data >= 40.0:
            drivers.append(f"Significant Sensitive Data Access ({int(sens_files)} files, {int(usb_connects)} USB events)")
        if f4_access >= 40.0:
            drivers.append(f"Off-Hours / Unusual Access Pattern ({int(after_hrs_logon)} off-hour logins, {int(weekend_logon)} weekend)")
        if f5_hist >= 60.0:
            drivers.append(f"Severe Deviation from Personal Behavioral Baseline ({f5_hist:.1f}/100)")
        if f2_privilege >= 80.0 and composite_score >= 60:
            drivers.append(f"Elevated Role Privilege Profile ({role})")

        if not drivers:
            drivers.append("Normal routine activity within expected behavioral baselines.")

        return {
            "risk_score": composite_score,
            "risk_level": risk_tier,
            "risk_breakdown": {
                "ml_anomaly_factor": round(f1_ml, 2),
                "privilege_role_factor": round(f2_privilege, 2),
                "data_sensitivity_factor": round(f3_data, 2),
                "access_pattern_factor": round(f4_access, 2),
                "historical_deviation_factor": round(f5_hist, 2)
            },
            "key_drivers": drivers
        }

    def score_dataframe(
        self,
        df: pd.DataFrame,
        employee_lookup: Optional[Dict[str, Dict[str, Any]]] = None
    ) -> pd.DataFrame:
        """
        Evaluates risk score and explanation for every row in a behavioral DataFrame.
        """
        if df.empty:
            return pd.DataFrame()

        df = df.copy()
        employee_lookup = employee_lookup or {}

        risk_scores = []
        risk_levels = []
        breakdowns = []
        drivers_list = []

        for _, row in df.iterrows():
            user_id = str(row.get("user_id", ""))
            emp_ctx = employee_lookup.get(user_id, {"role": "Staff"})
            result = self.calculate_risk(row.to_dict(), emp_ctx)
            
            risk_scores.append(result["risk_score"])
            risk_levels.append(result["risk_level"])
            breakdowns.append(result["risk_breakdown"])
            drivers_list.append(result["key_drivers"])

        df["risk_score"] = risk_scores
        df["risk_level"] = risk_levels
        df["risk_breakdown"] = breakdowns
        df["risk_drivers"] = drivers_list

        return df

    def sync_employee_risk_scores(self, scored_df: pd.DataFrame, db: Session) -> int:
        """
        Updates the latest risk score and risk level for all employees in the database.
        """
        if scored_df.empty:
            return 0

        updated_count = 0
        # Group by user_id to get the peak / latest risk score
        user_peak_risks = scored_df.groupby("user_id")["risk_score"].max()

        for user_id, max_score in user_peak_risks.items():
            emp = db.query(Employee).filter(Employee.user_id == str(user_id)).first()
            if emp:
                emp.current_risk_score = float(max_score)
                if max_score >= 80:
                    emp.current_severity = "CRITICAL"
                elif max_score >= 65:
                    emp.current_severity = "HIGH"
                elif max_score >= 40:
                    emp.current_severity = "MEDIUM"
                else:
                    emp.current_severity = "LOW"
                updated_count += 1

        db.commit()
        return updated_count
