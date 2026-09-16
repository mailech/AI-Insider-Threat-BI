"""Risk scoring orchestration: features -> model service -> persisted score."""

import uuid

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.db.base import utcnow
from app.models.employee import Employee
from app.models.risk import RiskBand, RiskScore
from app.services import ml_client
from app.services.features import extract_features


def compute_risk(db: Session, employee_id: uuid.UUID, lookback_days: int = 30) -> RiskScore:
    """Score one employee through the model service and persist the result."""
    features = extract_features(db, employee_id, lookback_days)
    result = ml_client.score_single(features)
    score = RiskScore(
        employee_id=employee_id,
        computed_at=utcnow(),
        lookback_days=lookback_days,
        **features,
        decision_function_score=float(result["decision_function_score"]),
        predict_label=int(result["predict_label"]),
        risk_score=float(result["risk_score"]),
        risk_band=RiskBand(result["risk_band"]),
    )
    db.add(score)
    db.commit()
    db.refresh(score)
    return score


def compute_fleet(db: Session, lookback_days: int = 30) -> list[RiskScore]:
    """Score every employee in a single batch call to the model service."""
    employees = list(
        db.scalars(select(Employee).order_by(Employee.employee_code))
    )
    if not employees:
        return []

    feature_rows = [
        {
            "employee_id": str(emp.id),
            **extract_features(db, emp.id, lookback_days),
        }
        for emp in employees
    ]

    results = ml_client.score_batch(feature_rows)

    computed_at = utcnow()
    scores: list[RiskScore] = []

    for employee, features, result in zip(
        employees, feature_rows, results, strict=True
    ):
        score = RiskScore(
            employee_id=employee.id,
            computed_at=computed_at,
            lookback_days=lookback_days,
            **{
                key: value
                for key, value in features.items()
                if key != "employee_id"
            },
            decision_function_score=float(result["decision_function_score"]),
            predict_label=int(result["predict_label"]),
            risk_score=float(result["risk_score"]),
            risk_band=RiskBand(result["risk_band"]),
        )
        db.add(score)
        scores.append(score)

    db.commit()

    for score in scores:
        db.refresh(score)

    return scores

def latest_score(db: Session, employee_id: uuid.UUID) -> RiskScore | None:
    return db.scalars(
        select(RiskScore)
        .where(RiskScore.employee_id == employee_id)
        .order_by(RiskScore.computed_at.desc(), RiskScore.created_at.desc())
        .limit(1)
    ).first()


def latest_scores(db: Session) -> dict[uuid.UUID, RiskScore]:
    """Most recent persisted score per employee."""
    newest = (
        select(
            RiskScore.employee_id.label("employee_id"),
            func.max(RiskScore.computed_at).label("computed_at"),
        )
        .group_by(RiskScore.employee_id)
        .subquery()
    )
    rows = db.scalars(
        select(RiskScore).join(
            newest,
            (RiskScore.employee_id == newest.c.employee_id)
            & (RiskScore.computed_at == newest.c.computed_at),
        )
    )
    return {row.employee_id: row for row in rows}


def score_history(db: Session, employee_id: uuid.UUID, limit: int = 50) -> list[RiskScore]:
    return list(
        db.scalars(
            select(RiskScore)
            .where(RiskScore.employee_id == employee_id)
            .order_by(RiskScore.computed_at.desc())
            .limit(limit)
        )
    )
