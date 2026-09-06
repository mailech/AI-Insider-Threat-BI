from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app import models
from app.deps import get_current_user, require_roles
from app.services import baseline_service, anomaly_service, risk_service, alert_service

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.post("/run-baselines")
def run_baselines(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("administrator", "soc_engineer", "security_manager")),
):
    baseline_service.build_all_baselines(db)
    return {"status": "ok", "message": "Behavioral baselines refreshed"}


@router.post("/run-anomaly-detection")
def run_anomaly_detection(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("administrator", "soc_engineer", "security_manager")),
):
    count = anomaly_service.detect_anomalies_all(db)
    return {"status": "ok", "anomalies_created": count}


@router.post("/run-risk-scoring")
def run_risk_scoring(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("administrator", "soc_engineer", "security_manager")),
):
    results = risk_service.compute_risk_scores_all(db)
    return {"status": "ok", "scores_computed": len(results)}


@router.post("/run-alerts")
def run_alerts(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("administrator", "soc_engineer", "security_manager")),
):
    created = alert_service.generate_alerts_from_risk_scores(db)
    return {"status": "ok", "alerts_created": len(created)}


@router.post("/run-all")
def run_all(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("administrator", "soc_engineer", "security_manager")),
):
    """Runs the full pipeline: baselines -> anomaly detection -> risk scoring -> alerts."""
    baseline_service.build_all_baselines(db)
    anomalies = anomaly_service.detect_anomalies_all(db)
    scores = risk_service.compute_risk_scores_all(db)
    alerts = alert_service.generate_alerts_from_risk_scores(db)
    return {
        "status": "ok",
        "anomalies_created": anomalies,
        "scores_computed": len(scores),
        "alerts_created": len(alerts),
    }
