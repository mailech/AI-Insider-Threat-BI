import os
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
import pandas as pd

from app.database import get_db
from app.models import Alert
from app.schemas import (
    AlertResponse,
    AlertStatusUpdate,
    AlertAssignRequest,
    AlertResolveRequest
)
from app.auth import get_current_user, require_roles
from app.mongodb import activity_logs
from app.audit import log_audit

router = APIRouter(
    prefix="/api/v1/alerts",
    tags=["Alert Management"]
)

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )
)

CSV_PATH = os.path.join(
    BASE_DIR,
    "data",
    "cert_r4_2",
    "behavioral_features.csv"
)


def sync_alerts_from_telemetry_and_dataset(db: Session):
    """
    Safeguard 1: Idempotent Alert Generation.
    Checks MongoDB activity_logs and behavioral_features dataset for high/critical risks.
    Updates existing unresolved alerts or inserts new ones.
    """
    try:
        # Get existing max alert index to increment safely
        existing_alerts = db.query(Alert).all()
        existing_by_emp = {}
        for a in existing_alerts:
            if a.status not in ["RESOLVED", "CLOSED"]:
                existing_by_emp[a.employee_id] = a

        next_id_counter = len(existing_alerts) + 1001

        # 1. Check MongoDB activity logs
        mongo_logs = list(
            activity_logs.find({
                "severity": {"$in": ["MEDIUM", "HIGH", "CRITICAL"]}
            })
        )

        for log in mongo_logs:
            emp_id = log.get("employee_id", "UNKNOWN")
            severity = str(log.get("severity", "LOW")).upper()
            activity_type = log.get("activity_type", "Suspicious Activity")
            description = log.get("description", "Anomalous behavior detected in telemetry")

            risk_score = 90.0 if severity == "CRITICAL" else (70.0 if severity == "HIGH" else 45.0)

            if emp_id in existing_by_emp:
                existing_alert = existing_by_emp[emp_id]
                existing_alert.risk_score = max(existing_alert.risk_score, risk_score)
                if severity in ["CRITICAL", "HIGH"]:
                    existing_alert.threat_level = severity
                existing_alert.updated_at = datetime.utcnow()
            else:
                new_alert = Alert(
                    alert_id=f"ALT-{next_id_counter}",
                    employee_id=emp_id,
                    risk_score=risk_score,
                    threat_level=severity,
                    activity_type=activity_type,
                    description=description,
                    status="NEW",
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(new_alert)
                existing_by_emp[emp_id] = new_alert
                next_id_counter += 1

        # 2. Check behavioral features dataset if present
        if os.path.exists(CSV_PATH):
            df = pd.read_csv(CSV_PATH)
            high_risk_users = df[df["threat_level"].isin(["CRITICAL", "HIGH"])]
            for _, row in high_risk_users.head(15).iterrows():
                emp_id = str(row["user"])
                threat_level = str(row["threat_level"]).upper()
                score = round(float(row.get("anomaly_score", 75.0)), 2)

                if emp_id in existing_by_emp:
                    existing_alert = existing_by_emp[emp_id]
                    existing_alert.risk_score = score
                    existing_alert.threat_level = threat_level
                    existing_alert.updated_at = datetime.utcnow()
                else:
                    new_alert = Alert(
                        alert_id=f"ALT-{next_id_counter}",
                        employee_id=emp_id,
                        risk_score=score,
                        threat_level=threat_level,
                        activity_type="Behavioral Anomaly",
                        description=f"High anomaly score detected: {score}",
                        status="NEW",
                        created_at=datetime.utcnow(),
                        updated_at=datetime.utcnow()
                    )
                    db.add(new_alert)
                    existing_by_emp[emp_id] = new_alert
                    next_id_counter += 1

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Error syncing alerts: {e}")



@router.get("", response_model=list[AlertResponse])
def get_alerts(
    status: str | None = None,
    threat_level: str | None = None,
    employee_id: str | None = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles([
            "ADMINISTRATOR",
            "SECURITY_MANAGER",
            "SOC_ENGINEER",
            "SECURITY_ANALYST"
        ])
    )
):
    # Idempotently sync alerts before listing
    sync_alerts_from_telemetry_and_dataset(db)

    query = db.query(Alert)

    if status and status.upper() != "ALL":
        query = query.filter(Alert.status == status.upper())

    if threat_level and threat_level.upper() != "ALL":
        query = query.filter(Alert.threat_level == threat_level.upper())

    if employee_id:
        query = query.filter(Alert.employee_id.ilike(f"%{employee_id}%"))

    alerts = query.order_by(Alert.updated_at.desc()).all()
    return alerts


@router.get("/{alert_id}", response_model=AlertResponse)
def get_alert_by_id(
    alert_id: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles([
            "ADMINISTRATOR",
            "SECURITY_MANAGER",
            "SOC_ENGINEER",
            "SECURITY_ANALYST"
        ])
    )
):
    alert = db.query(Alert).filter(
        (Alert.alert_id == alert_id) | (Alert.id == int(alert_id) if alert_id.isdigit() else False)
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    return alert


@router.put("/{alert_id}/status", response_model=AlertResponse)
def update_alert_status(
    alert_id: str,
    payload: AlertStatusUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles([
            "ADMINISTRATOR",
            "SECURITY_MANAGER",
            "SOC_ENGINEER"
        ])
    )
):
    alert = db.query(Alert).filter(
        (Alert.alert_id == alert_id) | (Alert.id == int(alert_id) if alert_id.isdigit() else False)
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    valid_statuses = ["NEW", "ACKNOWLEDGED", "UNDER_INVESTIGATION", "RESOLVED", "CLOSED"]
    new_status = payload.status.upper()
    if new_status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of {valid_statuses}")

    old_status = alert.status
    alert.status = new_status
    alert.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)

    log_audit(
        db,
        actor=current_user["email"],
        action="ALERT_STATUS_UPDATE",
        target=alert.alert_id,
        status="SUCCESS",
        details=f"Status updated from {old_status} to {new_status}"
    )

    return alert


@router.put("/{alert_id}/assign", response_model=AlertResponse)
def assign_investigator(
    alert_id: str,
    payload: AlertAssignRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles([
            "ADMINISTRATOR",
            "SECURITY_MANAGER",
            "SOC_ENGINEER"
        ])
    )
):
    alert = db.query(Alert).filter(
        (Alert.alert_id == alert_id) | (Alert.id == int(alert_id) if alert_id.isdigit() else False)
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.assigned_to = payload.assigned_to
    if alert.status == "NEW":
        alert.status = "UNDER_INVESTIGATION"
    alert.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)

    log_audit(
        db,
        actor=current_user["email"],
        action="ALERT_ASSIGNED",
        target=alert.alert_id,
        status="SUCCESS",
        details=f"Assigned to {payload.assigned_to}"
    )

    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
def resolve_alert(
    alert_id: str,
    payload: AlertResolveRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(
        require_roles([
            "ADMINISTRATOR",
            "SECURITY_MANAGER",
            "SOC_ENGINEER"
        ])
    )
):
    alert = db.query(Alert).filter(
        (Alert.alert_id == alert_id) | (Alert.id == int(alert_id) if alert_id.isdigit() else False)
    ).first()

    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    alert.status = "RESOLVED"
    alert.resolution_notes = payload.resolution_notes
    alert.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(alert)

    log_audit(
        db,
        actor=current_user["email"],
        action="ALERT_RESOLVED",
        target=alert.alert_id,
        status="SUCCESS",
        details=payload.resolution_notes or "Resolved without notes"
    )

    return alert
