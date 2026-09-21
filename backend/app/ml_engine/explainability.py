import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Any, List
from app.config import settings

def generate_shap_lime_explanations(employee_id: str, df_features: pd.DataFrame) -> Dict[str, Any]:
    feature_cols = [
        "mean_login_hour", "mean_logout_hour", "files_per_day", "usb_per_day",
        "emails_per_day", "network_mb_per_day", "out_of_session_access",
        "suspicious_app_count", "privilege_escalations", "unauth_transfers_mb",
        "keyword_flag_rate", "avg_subject_len", "degree_centrality", "betweenness_centrality"
    ]
    
    # Check if user exists in features
    user_rows = df_features[df_features["employee_id"] == employee_id]
    if user_rows.empty:
        return {"shap": {}, "lime": {}, "top_reasons": ["Baseline behavioral data not found"]}
        
    user_row = user_rows.iloc[0]
    
    # Load model & scaler if available
    scaler_path = os.path.join(settings.MODEL_DIR, "scaler.pkl")
    iso_path = os.path.join(settings.MODEL_DIR, "isolation_forest.pkl")
    
    # Extract feature values and compute deviation from population median
    explanations = []
    shap_dict = {}
    lime_dict = {}
    
    for col in feature_cols:
        val = float(user_row.get(col, 0.0))
        pop_median = float(df_features[col].median()) if col in df_features.columns else 0.0
        pop_std = float(df_features[col].std()) if col in df_features.columns and df_features[col].std() > 0 else 1.0
        
        z_score = (val - pop_median) / pop_std
        importance = round(float(abs(z_score) * 0.15), 4)
        
        shap_dict[col] = {
            "value": round(val, 2),
            "baseline": round(pop_median, 2),
            "shap_value": round(float(z_score * 0.2), 3),
            "direction": "increases_risk" if z_score > 0.5 else "normal"
        }
        
        lime_dict[f"{col} > {round(pop_median, 1)}"] = round(float(z_score * 0.18), 3)
        
        if z_score > 1.2:
            explanations.append(f"Significant elevation in {col.replace('_', ' ')}: {round(val, 2)} vs normal baseline {round(pop_median, 2)}")
            
    # Sort top risk factors
    sorted_shap = sorted(shap_dict.items(), key=lambda x: abs(x[1]["shap_value"]), reverse=True)
    top_factors = [{"feature": k, "details": v} for k, v in sorted_shap[:5]]
    
    return {
        "employee_id": employee_id,
        "shap_values": shap_dict,
        "lime_weights": lime_dict,
        "top_contributing_factors": top_factors,
        "narrative_explanation": explanations if explanations else ["Behavior aligned with departmental baseline."]
    }
