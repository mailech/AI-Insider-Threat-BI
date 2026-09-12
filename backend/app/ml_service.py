import os
import datetime
from typing import Dict, List, Any, Tuple, Optional
import numpy as np
import joblib
from sqlalchemy.orm import Session
from sqlalchemy import func

from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest

from app.models import Employee, TelemetryLog, User, AuditLog
from app.audit_service import log_audit_event

BUNDLE_PATH = os.path.join(os.path.dirname(__file__), "ml_bundle.joblib")

FEATURE_COLUMNS = [
    "daily_event_volume",
    "off_hours_ratio",
    "data_transfer_volume_mb",
    "privilege_change_count",
    "anomaly_tag_count",
]


def get_employee_baseline_login_window(db: Session, employee_id: str) -> Tuple[float, float]:
    """
    Derives personalized typical login hours [earliest_h, latest_h] for a specific employee
    from their historical LOGIN telemetry logs (reusing the Behavioral Baseline logic).
    """
    login_logs = (
        db.query(TelemetryLog)
        .filter(TelemetryLog.employee_id == employee_id, TelemetryLog.event_type == "LOGIN")
        .all()
    )
    if login_logs:
        login_hours = [l.timestamp.hour + (l.timestamp.minute / 60.0) for l in login_logs]
        login_hours.sort()
        earliest_h = login_hours[0]
        latest_h = login_hours[-1]
        # Allow ±30m buffer around their observed login range
        return max(0.0, earliest_h - 0.5), min(24.0, latest_h + 0.5)
    
    # Default corporate envelope fallback if no logins found
    return (8.0, 18.5)


def extract_daily_feature_vectors(db: Session) -> Tuple[List[Dict[str, Any]], np.ndarray]:
    """
    Feature Engineering: Aggregates each employee's telemetry into per-employee-per-day feature vectors.
    Returns list of metadata dicts and numpy 2D array of features.
    """
    employees = db.query(Employee).all()
    feature_rows = []
    
    for emp in employees:
        emp_start_h, emp_end_h = get_employee_baseline_login_window(db, emp.id)
        
        # Group telemetry logs for this employee by calendar date (YYYY-MM-DD)
        logs = (
            db.query(TelemetryLog)
            .filter(TelemetryLog.employee_id == emp.id)
            .order_by(TelemetryLog.timestamp)
            .all()
        )
        
        # Group by date
        daily_groups: Dict[str, List[TelemetryLog]] = {}
        for log in logs:
            day_str = log.timestamp.strftime("%Y-%m-%d")
            daily_groups.setdefault(day_str, []).append(log)
            
        for day_str, day_logs in daily_groups.items():
            total_events = len(day_logs)
            if total_events == 0:
                continue
                
            # 1. Daily event volume
            daily_event_volume = float(total_events)
            
            # 2. Off-hours activity ratio (using employee's own personalized baseline window)
            off_hours_events = 0
            transfer_mb = 0.0
            privilege_changes = 0
            anomaly_tags = 0
            
            for l in day_logs:
                h = l.timestamp.hour + (l.timestamp.minute / 60.0)
                if h < emp_start_h or h > emp_end_h:
                    off_hours_events += 1
                    
                # 3. Data transfer volume (MB)
                if l.event_type in ("FILE_DOWNLOAD", "FILE_UPLOAD", "DATA_TRANSFER"):
                    payload = l.payload or {}
                    if "file_size_mb" in payload:
                        transfer_mb += float(payload["file_size_mb"])
                    elif "bytes_transferred" in payload:
                        transfer_mb += float(payload["bytes_transferred"]) / (1024.0 * 1024.0)
                    elif "data_volume_mb" in payload:
                        transfer_mb += float(payload["data_volume_mb"])
                    elif "transfer_volume_mb" in payload:
                        transfer_mb += float(payload["transfer_volume_mb"])
                    else:
                        transfer_mb += 25.0  # default representative transfer size
                elif l.event_type == "USB_DEVICE":
                    payload = l.payload or {}
                    if "bytes_written" in payload:
                        transfer_mb += float(payload["bytes_written"]) / (1024.0 * 1024.0)
                    elif "data_written_mb" in payload:
                        transfer_mb += float(payload["data_written_mb"])
                        
                # 4. Privilege-change count
                if l.event_type == "PRIVILEGE_CHANGE":
                    privilege_changes += 1
                    
                # 5. Anomaly-tag count
                if l.anomaly_category is not None or l.severity in ("HIGH", "CRITICAL"):
                    anomaly_tags += 1
                    
            off_hours_ratio = float(off_hours_events) / float(total_events)
            
            row = {
                "employee_id": emp.id,
                "date": day_str,
                "daily_event_volume": daily_event_volume,
                "off_hours_ratio": round(off_hours_ratio, 4),
                "data_transfer_volume_mb": round(transfer_mb, 2),
                "privilege_change_count": float(privilege_changes),
                "anomaly_tag_count": float(anomaly_tags),
            }
            feature_rows.append(row)
            
    if not feature_rows:
        # Synthetic fallback if database is empty
        X = np.zeros((1, len(FEATURE_COLUMNS)))
        return [], X
        
    X = np.array([
        [
            r["daily_event_volume"],
            r["off_hours_ratio"],
            r["data_transfer_volume_mb"],
            r["privilege_change_count"],
            r["anomaly_tag_count"],
        ]
        for r in feature_rows
    ], dtype=np.float64)
    
    return feature_rows, X


def train_and_evaluate_ml_model(db: Session, current_user: Optional[User] = None) -> Dict[str, Any]:
    """
    Trains the multi-feature IsolationForest model on per-employee-per-day feature vectors,
    calculates empirical normalization bounds from observed decision_function distribution,
    evaluates current ML corroboration scores for all 16 employees, and persists the bundle.
    """
    feature_rows, X = extract_daily_feature_vectors(db)
    
    if len(feature_rows) == 0 or X.shape[0] < 2:
        return {
            "is_trained": False,
            "sample_size": 0,
            "last_trained": None,
            "message": "Insufficient telemetry data for Isolation Forest fit."
        }
        
    # Fit StandardScaler
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Fit Isolation Forest (100 estimators, contamination='auto', fixed random_state for reproducibility)
    iso_forest = IsolationForest(
        n_estimators=100,
        contamination="auto",
        random_state=42,
        n_jobs=-1
    )
    iso_forest.fit(X_scaled)
    
    # Calculate empirical decision function scores across the real training batch
    train_decision_scores = iso_forest.decision_function(X_scaled)
    
    # Correction 1: Derive empirical bounds from the actual fitted output distribution (1st and 99th percentiles)
    observed_min = float(np.percentile(train_decision_scores, 1.0))
    observed_max = float(np.percentile(train_decision_scores, 99.0))
    if observed_max <= observed_min:
        observed_min = float(np.min(train_decision_scores))
        observed_max = float(np.max(train_decision_scores))
        if observed_max <= observed_min:
            observed_max = observed_min + 0.1
            
    # Persist joblib bundle
    now_iso = datetime.datetime.utcnow().isoformat()
    bundle = {
        "model": iso_forest,
        "scaler": scaler,
        "feature_cols": FEATURE_COLUMNS,
        "observed_min": observed_min,
        "observed_max": observed_max,
        "last_trained": now_iso,
        "sample_size": len(feature_rows),
        "hyperparameters": {
            "n_estimators": 100,
            "contamination": "auto",
            "random_state": 42
        }
    }
    
    joblib.dump(bundle, BUNDLE_PATH)
    
    # Evaluate and assign current ML Corroboration Score to each of the 16 employees
    # For each employee, construct an aggregated feature vector representing their active profile
    employees = db.query(Employee).all()
    emp_scores = {}
    
    for emp in employees:
        emp_rows = [r for r in feature_rows if r["employee_id"] == emp.id]
        if emp_rows:
            # We take the peak anomaly representation across their daily vectors
            # to capture their highest behavioral anomaly risk
            v_event_vol = float(np.max([r["daily_event_volume"] for r in emp_rows]))
            v_off_hours = float(np.max([r["off_hours_ratio"] for r in emp_rows]))
            v_transfer = float(np.max([r["data_transfer_volume_mb"] for r in emp_rows]))
            v_priv = float(np.max([r["privilege_change_count"] for r in emp_rows]))
            v_anom = float(np.max([r["anomaly_tag_count"] for r in emp_rows]))
            
            vec = np.array([[v_event_vol, v_off_hours, v_transfer, v_priv, v_anom]], dtype=np.float64)
            vec_scaled = scaler.transform(vec)
            raw_decision = float(iso_forest.decision_function(vec_scaled)[0])
            
            # Normalization Formula (derived from observed training distribution)
            norm_score = ((observed_max - raw_decision) / (observed_max - observed_min)) * 100.0
            ml_score = round(float(np.clip(norm_score, 0.0, 100.0)), 1)
        else:
            ml_score = 15.0
            
        emp.ml_corroboration_score = ml_score
        emp_scores[emp.id] = ml_score
        
    db.commit()
    
    if current_user:
        log_audit_event(
            db=db,
            user=current_user,
            action="RETRAIN_ML_MODEL",
            target_resource="isolation_forest_corroboration_bundle",
            details={
                "sample_size": len(feature_rows),
                "features_used": FEATURE_COLUMNS,
                "observed_min": observed_min,
                "observed_max": observed_max,
                "employees_scored": len(employees),
                "timestamp": now_iso
            }
        )
        
    return {
        "is_trained": True,
        "sample_size": len(feature_rows),
        "last_trained": now_iso,
        "features_used": FEATURE_COLUMNS,
        "observed_min": observed_min,
        "observed_max": observed_max,
        "algorithm": "Multi-Feature Isolation Forest (Unsupervised Anomaly Detection)",
        "hyperparameters": bundle["hyperparameters"],
        "employee_scores": emp_scores
    }


def get_ml_model_metadata(db: Session) -> Dict[str, Any]:
    """
    Returns current status and metadata of the persisted ML Isolation Forest bundle.
    """
    if os.path.exists(BUNDLE_PATH):
        try:
            bundle = joblib.load(BUNDLE_PATH)
            return {
                "is_trained": True,
                "last_trained": bundle.get("last_trained"),
                "sample_size": bundle.get("sample_size", 0),
                "features_used": bundle.get("feature_cols", FEATURE_COLUMNS),
                "observed_min": bundle.get("observed_min"),
                "observed_max": bundle.get("observed_max"),
                "algorithm": "Multi-Feature Isolation Forest (Unsupervised Anomaly Detection)",
                "hyperparameters": bundle.get("hyperparameters", {
                    "n_estimators": 100,
                    "contamination": "auto",
                    "random_state": 42
                }),
                "status": "Operational & Ready"
            }
        except Exception as e:
            pass
            
    # Auto-train if not yet persisted
    return train_and_evaluate_ml_model(db)


def get_employee_ml_feature_vector(db: Session, employee_id: str) -> Optional[Dict[str, Any]]:
    """
    Feature P3: Returns the exact 5-vector feature values evaluated for this employee
    by the Multi-Feature Isolation Forest model (daily event volume, off-hours ratio,
    data transfer MB, privilege-change count, anomaly-tag count).
    """
    emp = db.query(Employee).filter(Employee.id == employee_id).first()
    if not emp:
        return None

    emp_start_h, emp_end_h = get_employee_baseline_login_window(db, emp.id)
    logs = (
        db.query(TelemetryLog)
        .filter(TelemetryLog.employee_id == emp.id)
        .order_by(TelemetryLog.timestamp)
        .all()
    )

    if not logs:
        return {
            "daily_event_volume": 0.0,
            "off_hours_ratio": 0.0,
            "data_transfer_volume_mb": 0.0,
            "privilege_change_count": 0.0,
            "anomaly_tag_count": 0.0,
            "ml_score": emp.ml_corroboration_score or 0.0
        }

    daily_groups: Dict[str, List[TelemetryLog]] = {}
    for log in logs:
        day_str = log.timestamp.strftime("%Y-%m-%d")
        daily_groups.setdefault(day_str, []).append(log)

    peak_event_volume = 0.0
    peak_off_hours_ratio = 0.0
    peak_data_transfer_mb = 0.0
    total_privilege_changes = 0.0
    total_anomaly_tags = 0.0

    # Also compute peak day vector
    for day_str, day_logs in daily_groups.items():
        total_events = len(day_logs)
        peak_event_volume = max(peak_event_volume, float(total_events))
        off_hours_events = 0
        transfer_mb = 0.0

        for l in day_logs:
            h = l.timestamp.hour + (l.timestamp.minute / 60.0)
            if h < emp_start_h or h > emp_end_h:
                off_hours_events += 1

            if l.event_type in ("FILE_DOWNLOAD", "FILE_UPLOAD", "DATA_TRANSFER"):
                payload = l.payload or {}
                if "file_size_mb" in payload:
                    transfer_mb += float(payload["file_size_mb"])
                elif "bytes_transferred" in payload:
                    transfer_mb += float(payload["bytes_transferred"]) / (1024.0 * 1024.0)
                elif "data_volume_mb" in payload:
                    transfer_mb += float(payload["data_volume_mb"])
                elif "transfer_volume_mb" in payload:
                    transfer_mb += float(payload["transfer_volume_mb"])
                else:
                    transfer_mb += 25.0
            elif l.event_type == "USB_DEVICE":
                payload = l.payload or {}
                if "bytes_written" in payload:
                    transfer_mb += float(payload["bytes_written"]) / (1024.0 * 1024.0)
                elif "data_written_mb" in payload:
                    transfer_mb += float(payload["data_written_mb"])

            if l.event_type == "PRIVILEGE_CHANGE":
                total_privilege_changes += 1.0

            if l.anomaly_category is not None or l.severity in ("HIGH", "CRITICAL"):
                total_anomaly_tags += 1.0

        if total_events > 0:
            peak_off_hours_ratio = max(peak_off_hours_ratio, float(off_hours_events) / float(total_events))
        peak_data_transfer_mb = max(peak_data_transfer_mb, transfer_mb)

    return {
        "daily_event_volume": round(peak_event_volume, 1),
        "off_hours_ratio": round(peak_off_hours_ratio * 100.0, 1),
        "data_transfer_volume_mb": round(peak_data_transfer_mb, 2),
        "privilege_change_count": round(total_privilege_changes, 0),
        "anomaly_tag_count": round(total_anomaly_tags, 0),
        "ml_score": emp.ml_corroboration_score or 0.0
    }
