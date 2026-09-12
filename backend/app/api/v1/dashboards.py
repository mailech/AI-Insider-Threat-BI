"""Role-based dashboards and analytics (module 10).

Caching lives here rather than in the service layer: these are HTTP read models,
the service functions stay pure and directly testable, and a stale dashboard for
up to ``CACHE_TTL_SECONDS`` is an acceptable trade for collapsing dozens of
aggregate queries into one round trip. Any write that changes the underlying
numbers calls ``invalidate_analytics()``, so the window is the only staleness.
"""
from __future__ import annotations

from typing import Any, Callable

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, require_admin, require_analyst, require_manager, require_soc
from app.core.cache import DASHBOARD_PREFIX, cache
from app.db.session import get_db
from app.models.enums import Role
from app.models.user import User
from app.schemas.analytics import AdminDashboard, AnalystDashboard, ManagerDashboard, SocDashboard
from app.services import dashboards as service

router = APIRouter(prefix="/dashboards", tags=["Dashboards & Analytics"])


def _cached(key: str, producer: Callable[[], Any]) -> Any:
    return cache.get_or_set(f"{DASHBOARD_PREFIX}{key}", producer)


@router.get("/analyst", response_model=AnalystDashboard)
def analyst_dashboard(user: User = Depends(require_analyst), db: Session = Depends(get_db)) -> Any:
    """Security Analyst dashboard: alerts, risk scores, investigation queue."""
    # Keyed per user: the investigation queue is the caller's own workload.
    return _cached(f"analyst:{user.id}", lambda: service.analyst_dashboard(db, user))


@router.get("/soc", response_model=SocDashboard)
def soc_dashboard(user: User = Depends(require_soc), db: Session = Depends(get_db)) -> Any:
    """SOC dashboard: security events, anomalies, active investigations, intel."""
    return _cached(f"soc:{user.id}", lambda: service.soc_dashboard(db, user))


@router.get("/manager", response_model=ManagerDashboard)
def manager_dashboard(user: User = Depends(require_manager), db: Session = Depends(get_db)) -> Any:
    """Security Manager dashboard: organisational posture, trends, compliance."""
    return _cached(f"manager:{user.id}", lambda: service.manager_dashboard(db, user))


@router.get("/admin", response_model=AdminDashboard)
def admin_dashboard(user: User = Depends(require_admin), db: Session = Depends(get_db)) -> Any:
    """Admin dashboard: users, platform analytics, system health, audit."""
    return _cached(f"admin:{user.id}", lambda: service.admin_dashboard(db, user))


@router.get("/me", response_model=dict)
def my_dashboard(user: User = Depends(get_current_user), db: Session = Depends(get_db)) -> Any:
    """Return the dashboard matching the caller's role."""
    builders = {
        Role.SECURITY_ANALYST.value: ("analyst", service.analyst_dashboard),
        Role.SOC_ENGINEER.value: ("soc", service.soc_dashboard),
        Role.SECURITY_MANAGER.value: ("manager", service.manager_dashboard),
        Role.ADMINISTRATOR.value: ("admin", service.admin_dashboard),
    }
    name, builder = builders.get(user.role, ("analyst", service.analyst_dashboard))
    data = _cached(f"{name}:{user.id}", lambda: builder(db, user))
    return {"dashboard": name, "role": user.role, "data": data}


@router.get("/metrics", response_model=dict)
def security_metrics(
    days: int = Query(30, ge=1, le=365),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """MTTD / MTTI / MTTR and detection-quality metrics."""
    return _cached(f"metrics:{days}", lambda: service.security_metrics(db, days))


@router.get("/timeline", response_model=list)
def events_timeline(
    days: int = Query(14, ge=1, le=90),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    return _cached(f"timeline:{days}", lambda: service.events_timeline(db, days))
