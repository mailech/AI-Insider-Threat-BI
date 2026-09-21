import pandas as pd
from typing import List, Dict, Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import AnomalyScore, Employee, User, ActivityLog, ActivityType
from app.schemas import AnomalyScoreResponse
from app.auth import get_current_user
from app.ml_engine.explainability import generate_shap_lime_explanations
from app.ml_engine.graph_analytics import compute_graph_metrics, export_graph_for_ui
from app.services.ml_service import run_complete_behavioral_intelligence_pipeline

router = APIRouter(prefix="/anomalies", tags=["Anomaly Detection & Explainability Engine"])

@router.get("", response_model=List[AnomalyScoreResponse])
def get_anomaly_scores(
    employee_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AnomalyScore)
    if employee_id:
        query = query.filter(AnomalyScore.employee_id == employee_id)
    return query.order_by(AnomalyScore.ensemble_score.desc()).limit(limit).all()

@router.get("/explain/{employee_id}")
def get_employee_anomaly_explanation(
    employee_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
    if not emp:
        raise HTTPException(status_code=404, detail="Employee not found")
        
    score_rec = db.query(AnomalyScore).filter(AnomalyScore.employee_id == employee_id).order_by(AnomalyScore.timestamp.desc()).first()
    
    # Extract behavioral profile features
    bp = emp.behavioral_profile
    if bp:
        features_dict = {
            "mean_login_hour": bp.mean_login_hour,
            "mean_logout_hour": bp.mean_logout_hour,
            "files_per_day": bp.files_per_day,
            "usb_per_day": bp.usb_per_day,
            "emails_per_day": bp.emails_per_day,
            "network_mb_per_day": bp.network_mb_per_day,
            "out_of_session_access": bp.out_of_session_access,
            "degree_centrality": bp.degree_centrality,
            "betweenness_centrality": bp.betweenness_centrality,
            "keyword_flag_rate": bp.keyword_flag_ratio
        }
    else:
        features_dict = {}
        
    return {
        "employee_id": emp.employee_id,
        "name": emp.name,
        "department": emp.department,
        "risk_score": emp.risk_score,
        "risk_level": emp.risk_level.value,
        "models": {
            "isolation_forest": score_rec.isolation_forest if score_rec else 0.0,
            "oneclass_svm": score_rec.oneclass_svm if score_rec else 0.0,
            "neural_autoencoder": score_rec.autoencoder if score_rec else 0.0,
            "graph_centrality": score_rec.graph_analytics if score_rec else 0.0,
            "pytorch_gnn": score_rec.gnn_score if score_rec else 0.0,
            "ensemble_composite": score_rec.ensemble_score if score_rec else 0.0
        },
        "shap_feature_importance": score_rec.shap_explanation if score_rec and score_rec.shap_explanation else {},
        "lime_weights": score_rec.lime_explanation if score_rec and score_rec.lime_explanation else {},
        "behavioral_features": features_dict
    }

@router.get("/graph-network")
def get_graph_network_topology(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    file_logs = db.query(ActivityLog).filter(ActivityLog.activity_type == ActivityType.FILE_ACCESS).limit(100).all()
    usb_logs = db.query(ActivityLog).filter(ActivityLog.activity_type == ActivityType.USB_USAGE).limit(50).all()
    
    df_files = pd.DataFrame([{"employee_id": l.employee_id, "file": l.resource or "data.csv"} for l in file_logs])
    df_usb = pd.DataFrame([{"employee_id": l.employee_id, "device": l.resource or "usb_1"} for l in usb_logs])
    
    G, _ = compute_graph_metrics(df_files, df_usb)
    
    high_risk_emps = [e.employee_id for e in db.query(Employee).filter(Employee.risk_score >= 60.0).all()]
    ui_graph = export_graph_for_ui(G, high_risk_emps)
    return ui_graph
