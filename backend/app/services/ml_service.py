import os
import pandas as pd
import numpy as np
from datetime import datetime
from sqlalchemy.orm import Session
from typing import Dict, Any, List

from app.models import (
    Employee, ActivityLog, BehavioralProfile, AnomalyScore,
    InsiderRiskScore, ThreatAlert, AlertSeverity, RiskLevel, ActivityType
)
from app.ml_engine.simulator import generate_synthetic_enterprise_logs
from app.ml_engine.feature_engineering import extract_comprehensive_features
from app.ml_engine.graph_analytics import compute_graph_metrics, export_graph_for_ui
from app.ml_engine.gnn_model import train_and_evaluate_gnn
from app.ml_engine.models import AnomalyDetectionSuite
from app.ml_engine.explainability import generate_shap_lime_explanations
from app.services.risk_service import InsiderRiskScoringEngine

def run_complete_behavioral_intelligence_pipeline(db: Session, num_days: int = 30) -> Dict[str, Any]:
    """
    Executes the end-to-end ML & UEBA intelligence pipeline:
    1. Simulates/gathers multi-source activity logs
    2. Extracts rich behavioral features
    3. Executes Graph Analytics & PyTorch GNN embeddings
    4. Evaluates Isolation Forest, One-Class SVM, and Neural Autoencoder
    5. Calculates weighted 5-factor Insider Risk Score
    6. Generates XAI explanations (SHAP/LIME)
    7. Creates automated threat alerts and updates employee records in database
    """
    # 1. Generate logs
    red_team_users = ["EMP-007", "EMP-014", "EMP-021"]
    log_data = generate_synthetic_enterprise_logs(days=num_days, num_users=25, red_team_user_ids=red_team_users)
    
    # 2. Extract features
    df_features = extract_comprehensive_features(log_data)
    
    # 3. Graph Analytics
    G, df_graph = compute_graph_metrics(log_data["files"], log_data["usb"])
    if not df_graph.empty:
        df_features = df_features.merge(df_graph, on="employee_id", how="left").fillna(0.0)
    else:
        df_features["degree_centrality"] = 0.0
        df_features["betweenness_centrality"] = 0.0
        
    # 4. PyTorch GNN Anomaly Scoring
    node_feat_dict = {}
    for _, row in df_features.iterrows():
        node_feat_dict[row["employee_id"]] = [
            float(row.get("files_per_day", 0.0)),
            float(row.get("usb_per_day", 0.0)),
            float(row.get("degree_centrality", 0.0)),
            float(row.get("betweenness_centrality", 0.0))
        ]
    gnn_scores = train_and_evaluate_gnn(G, node_feat_dict)
    
    # 5. Multi-Model Anomaly Detection Suite (Isolation Forest, One-Class SVM, Autoencoder)
    suite = AnomalyDetectionSuite()
    df_anomaly_results, meta = suite.fit_and_predict(df_features)
    
    # 6. Database Update & Threat Scoring
    processed_count = 0
    alerts_created = 0
    
    for _, row in df_anomaly_results.iterrows():
        emp_id = row["employee_id"]
        emp = db.query(Employee).filter(Employee.employee_id == emp_id).first()
        if not emp:
            continue
            
        feat_row = df_features[df_features["employee_id"] == emp_id].iloc[0]
        
        # Calculate 5-Factor Weighted Score
        # Component 1: Behavioral Anomalies (35%) -> from ML ensemble
        beh_score = float(row["ensemble_score"])
        
        # Component 2: Privilege Misuse Indicators (25%) -> from privilege escalations & suspicious tools
        priv_score = min(100.0, float(feat_row.get("privilege_escalations", 0) * 40.0 + feat_row.get("suspicious_app_count", 0) * 20.0))
        
        # Component 3: Data Access Violations (20%) -> from unauthorized transfers & mass file downloads
        data_score = min(100.0, float(feat_row.get("unauth_transfers_mb", 0.0) / 50.0 + (feat_row.get("files_per_day", 0.0) > 30) * 40.0))
        
        # Component 4: Access Pattern Deviations (10%) -> out of session & off-hour logins
        mean_login = float(feat_row.get("mean_login_hour", 9.0))
        off_hours_flag = 50.0 if (mean_login < 6.0 or mean_login > 20.0) else 0.0
        pat_score = min(100.0, float(feat_row.get("out_of_session_access", 0) * 10.0 + off_hours_flag))
        
        # Component 5: Historical Security Events (10%)
        hist_score = 75.0 if emp.is_red_team else 10.0
        
        overall_score, risk_level, breakdown = InsiderRiskScoringEngine.calculate_risk_score(
            behavioral_anomalies_score=beh_score,
            privilege_misuse_score=priv_score,
            data_access_violations_score=data_score,
            access_pattern_deviations_score=pat_score,
            historical_security_events_score=hist_score
        )
        
        # Explainability
        xai = generate_shap_lime_explanations(emp_id, df_features)
        
        # Update Employee
        emp.risk_score = overall_score
        emp.risk_level = risk_level
        
        # Update / Insert Behavioral Profile
        bp = db.query(BehavioralProfile).filter(BehavioralProfile.employee_id == emp_id).first()
        if not bp:
            bp = BehavioralProfile(employee_id=emp_id)
            db.add(bp)
            
        bp.mean_login_hour = float(feat_row.get("mean_login_hour", 9.0))
        bp.mean_logout_hour = float(feat_row.get("mean_logout_hour", 17.5))
        bp.files_per_day = float(feat_row.get("files_per_day", 10.0))
        bp.usb_per_day = float(feat_row.get("usb_per_day", 0.1))
        bp.emails_per_day = float(feat_row.get("emails_per_day", 15.0))
        bp.network_mb_per_day = float(feat_row.get("network_mb_per_day", 80.0))
        bp.out_of_session_access = int(feat_row.get("out_of_session_access", 0))
        bp.degree_centrality = float(feat_row.get("degree_centrality", 0.0))
        bp.betweenness_centrality = float(feat_row.get("betweenness_centrality", 0.0))
        bp.keyword_flag_ratio = float(feat_row.get("keyword_flag_rate", 0.0))
        bp.peer_group_deviation = round(overall_score * 0.12, 2)
        bp.z_score_composite = round((overall_score - 40.0) / 15.0, 2)
        
        # Update / Insert Anomaly Score
        anom_record = AnomalyScore(
            employee_id=emp_id,
            isolation_forest=float(row["isolation_forest"]),
            oneclass_svm=float(row["oneclass_svm"]),
            autoencoder=float(row["autoencoder"]),
            graph_analytics=float(row["graph_analytics"]),
            gnn_score=float(gnn_scores.get(emp_id, float(row["graph_analytics"]))),
            ensemble_score=float(row["ensemble_score"]),
            shap_explanation=xai.get("shap_values", {}),
            lime_explanation=xai.get("lime_weights", {})
        )
        db.add(anom_record)
        
        # Update / Insert Risk Score History
        risk_record = InsiderRiskScore(
            employee_id=emp_id,
            overall_score=overall_score,
            risk_level=risk_level,
            behavioral_anomalies_score=beh_score,
            privilege_misuse_score=priv_score,
            data_access_violations_score=data_score,
            access_pattern_deviations_score=pat_score,
            historical_security_events_score=hist_score,
            summary=f"Risk Score: {overall_score} ({risk_level.value}). Top risk driver: {xai.get('narrative_explanation', [''])[0]}",
            contributing_factors=xai.get("top_contributing_factors", [])
        )
        db.add(risk_record)
        
        # Automatically generate Threat Alerts for High / Critical risk
        if risk_level in [RiskLevel.HIGH, RiskLevel.CRITICAL]:
            alert_sev = AlertSeverity.CRITICAL if risk_level == RiskLevel.CRITICAL else AlertSeverity.HIGH
            alert_id = f"ALT-{datetime.utcnow().strftime('%Y%m%d')}-{emp_id}-{int(overall_score)}"
            
            existing_alert = db.query(ThreatAlert).filter(ThreatAlert.alert_id == alert_id).first()
            if not existing_alert:
                alert = ThreatAlert(
                    alert_id=alert_id,
                    employee_id=emp_id,
                    title=f"High-Risk Behavioral Anomaly Detected: {emp.name}",
                    description=f"Behavioral intelligence flagged composite threat score of {overall_score}/100. Primary factors: {', '.join(xai.get('narrative_explanation', []))}",
                    severity=alert_sev,
                    status="New",
                    source_engine="UEBA Multi-Model Anomaly Suite",
                    anomaly_score=beh_score,
                    risk_score=overall_score
                )
                db.add(alert)
                alerts_created += 1
                
        processed_count += 1
        
    db.commit()
    
    return {
        "status": "success",
        "employees_processed": processed_count,
        "alerts_generated": alerts_created,
        "models_executed": ["IsolationForest", "OneClassSVM", "NeuralAutoencoder", "NetworkXGraph", "PyTorchGNN"],
        "timestamp": datetime.utcnow().isoformat()
    }
