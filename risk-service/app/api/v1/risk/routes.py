from __future__ import annotations

from fastapi import APIRouter, HTTPException, status

from risk_service.app.schemas.risk import RiskScoreRequest, RiskScoreResponse, RiskTimelineResponse
from risk_service.app.services.risk_engine import RiskEngine
from risk_service.app.repositories.risk_repository import RiskRepository

router = APIRouter(prefix="/api/v1", tags=["risk"])


@router.post("/risk/score", response_model=RiskScoreResponse, status_code=status.HTTP_201_CREATED)
async def score_risk(payload: RiskScoreRequest) -> RiskScoreResponse:
    engine = RiskEngine()
    result = engine.calculate_risk(payload)
    return RiskScoreResponse(
        employee_id=result.employee_id,
        severity=result.severity.value,
        score=result.score,
        score_breakdown=result.score_breakdown,
        trend_direction=result.trend_direction,
        historical_weight=result.historical_weight,
        computed_at=result.computed_at,
        explanation=result.explanation,
    )


@router.get("/risk/timeline/{employee_id}", response_model=RiskTimelineResponse)
async def get_timeline(employee_id: str) -> RiskTimelineResponse:
    repository = RiskRepository()
    history = repository.get_timeline(employee_id)
    if not history:
        raise HTTPException(status_code=404, detail="No timeline exists for this employee")
    return RiskTimelineResponse(employee_id=employee_id, timeline=history)
