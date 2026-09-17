"""
CYBER AI — UEBA Intelligence Engine REST Endpoints

Routes
------
GET /api/v1/ueba/overview         — Fleet-wide executive UEBA metrics
GET /api/v1/ueba/user/{emp_id}    — User behavior analytics, peer comparison, 14d trend, and 72h forecast
GET /api/v1/ueba/entities          — Entity behavior analytics (device/IP endpoints)
"""

from __future__ import annotations

from typing import Any, Dict, List
from fastapi import APIRouter, Depends, HTTPException, status
from motor.motor_asyncio import AsyncIOMotorDatabase
from sqlalchemy.orm import Session

from app.api.deps import get_current_active_user, get_db
from app.db.mongo import get_mongo_db_optional
from app.models.domain import User
from app.services.ueba import UEBAEngine

router = APIRouter(prefix="/ueba", tags=["UEBA Intelligence Engine"])


@router.get(
    "/overview",
    summary="Get fleet-wide UEBA overview",
    description="Returns aggregate UEBA metrics across all users and entities.",
)
async def get_ueba_overview(
    db: Session = Depends(get_db),
    mdb: AsyncIOMotorDatabase | None = Depends(get_mongo_db_optional),
    _: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    return await UEBAEngine.get_ueba_overview(db=db, mdb=mdb)


@router.get(
    "/user/{emp_id}",
    summary="Get detailed UEBA profile for a user",
    description="Returns user behavior analytics, peer comparison, 14-day trend, and 72-hour threat prediction.",
)
async def get_ueba_user_profile(
    emp_id: str,
    db: Session = Depends(get_db),
    mdb: AsyncIOMotorDatabase | None = Depends(get_mongo_db_optional),
    _: User = Depends(get_current_active_user),
) -> Dict[str, Any]:
    try:
        user_behavior = await UEBAEngine.get_user_behavior(emp_id, db, mdb)
        peer_comparison = await UEBAEngine.get_peer_comparison(emp_id, db, mdb)
        trend_points = await UEBAEngine.get_behavioral_trends(emp_id, db, mdb, days=14)
        prediction = await UEBAEngine.predict_threat_forecast(emp_id, db, mdb)

        return {
            "user_behavior": user_behavior,
            "peer_comparison": peer_comparison,
            "trend_points": trend_points,
            "prediction": prediction,
        }
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc


@router.get(
    "/entities",
    summary="Get entity behavior analytics",
    description="Returns behavioral metrics for device and IP endpoint entities.",
)
async def get_ueba_entities(
    limit: int = 15,
    db: Session = Depends(get_db),
    mdb: AsyncIOMotorDatabase | None = Depends(get_mongo_db_optional),
    _: User = Depends(get_current_active_user),
) -> List[Dict[str, Any]]:
    return await UEBAEngine.get_entity_behavior(db=db, mdb=mdb, limit=limit)
