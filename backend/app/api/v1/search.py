"""Cross-source investigation search.

An investigator's first question rarely maps to one table. "Everything touching
*payroll* last month" spans activity events, anomalies, alerts and case notes,
so this endpoint queries all four and merges the results newest-first.

Backed by OpenSearch when a cluster is configured, and by scoped PostgreSQL
ILIKE queries when it is not. The response names which backend answered, so a
slow or unranked result set is explainable rather than mysterious.
"""
from __future__ import annotations

from typing import Any, List, Optional

from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.api.deps import require_analyst, require_soc
from app.core.search import INDEXES, search_backend
from app.db.session import get_db
from app.models.user import User

router = APIRouter(prefix="/search", tags=["Search"])


@router.get("", response_model=dict)
def search(
    q: str = Query(..., min_length=2, description="Free-text query"),
    sources: Optional[List[str]] = Query(
        None, description=f"Restrict to any of: {', '.join(INDEXES)}"
    ),
    limit: int = Query(20, ge=1, le=100),
    _: User = Depends(require_analyst),
    db: Session = Depends(get_db),
) -> Any:
    """Search activity events, anomalies, alerts and investigation notes."""
    return search_backend.search(q, db=db, indexes=sources, limit=limit)


@router.post("/reindex", response_model=dict)
def reindex(
    limit: int = Query(5000, ge=100, le=50000),
    _: User = Depends(require_soc),
    db: Session = Depends(get_db),
) -> Any:
    """Rebuild the search cluster from PostgreSQL.

    A no-op that reports zero counts when no cluster is configured, so calling
    it is always safe.
    """
    counts = search_backend.reindex(db, limit=limit)
    return {"backend": search_backend.backend, "indexed": counts}
