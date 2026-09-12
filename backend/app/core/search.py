"""Search adapter: OpenSearch when reachable, PostgreSQL ILIKE when it is not.

An investigator's first question is rarely expressible as a filter. "Which
employees touched anything called *payroll* last month" spans activity events,
anomalies, alerts and case notes at once, and none of those share a table.

OpenSearch answers that in one query. Without it the fallback runs a scoped
ILIKE across the same four sources and unions the results -- slower and without
relevance ranking, but the same answer, which is what keeps the feature usable
on a laptop with no search cluster running.

OpenSearch speaks the Elasticsearch wire protocol, so the ``opensearch-py`` and
``elasticsearch`` clients are interchangeable here; whichever is installed is
used.
"""
from __future__ import annotations

import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.core.config import settings

logger = logging.getLogger("itbis.search")

EVENTS_INDEX = "events"
ANOMALIES_INDEX = "anomalies"
ALERTS_INDEX = "alerts"
NOTES_INDEX = "notes"

INDEXES = (EVENTS_INDEX, ANOMALIES_INDEX, ALERTS_INDEX, NOTES_INDEX)


class SearchBackend:
    """Uniform search surface over OpenSearch or the relational fallback."""

    def __init__(self) -> None:
        self._client = None
        self._backend = "postgresql"
        self._connect()

    def _connect(self) -> None:
        url = (settings.OPENSEARCH_URL or "").strip()
        if not url:
            logger.info("OPENSEARCH_URL not set - search runs against PostgreSQL")
            return
        client = None
        try:
            from opensearchpy import OpenSearch  # type: ignore

            client = OpenSearch(url, timeout=3)
        except ImportError:
            try:
                from elasticsearch import Elasticsearch  # type: ignore

                client = Elasticsearch(url, request_timeout=3)
            except ImportError:
                logger.info("No OpenSearch/Elasticsearch client installed - using PostgreSQL")
                return
        try:
            client.info()
        except Exception as exc:
            logger.warning("Search cluster at %s unreachable (%s) - using PostgreSQL", url, exc)
            return
        self._client = client
        self._backend = "opensearch"
        logger.info("Search backend: OpenSearch at %s", url)

    def _index_name(self, index: str) -> str:
        return f"{settings.SEARCH_INDEX_PREFIX}-{index}"

    @property
    def backend(self) -> str:
        return self._backend

    @property
    def available(self) -> bool:
        return self._client is not None

    def index_many(self, index: str, documents: List[Dict[str, Any]]) -> int:
        """Index a batch. A failure here is logged, never raised -- search is
        an accelerator, and losing it must not fail the write that triggered it."""
        if self._client is None or not documents:
            return 0
        name = self._index_name(index)
        body: List[Dict[str, Any]] = []
        for doc in documents:
            body.append({"index": {"_index": name, "_id": str(doc.get("id", ""))}})
            body.append(doc)
        try:
            self._client.bulk(body=body, refresh=False)
            return len(documents)
        except Exception as exc:
            logger.warning("Bulk index into %s failed (%s)", name, exc)
            return 0

    def _search_cluster(self, index: str, query: str, limit: int) -> List[Dict[str, Any]]:
        try:
            response = self._client.search(
                index=self._index_name(index),
                body={
                    "size": limit,
                    "query": {
                        "multi_match": {
                            "query": query,
                            "fields": ["title^2", "description", "text", "resource", "employee_name"],
                            "fuzziness": "AUTO",
                        }
                    },
                },
            )
        except Exception as exc:
            logger.warning("Search on %s failed (%s) - falling back", index, exc)
            return []
        hits = response.get("hits", {}).get("hits", [])
        return [dict(h.get("_source", {}), _score=h.get("_score")) for h in hits]

    # ------------------------------------------------------------ fallback
    def _search_relational(
        self, db: Session, index: str, query: str, limit: int
    ) -> List[Dict[str, Any]]:
        from app.core.documents import ArchivedDocument
        from app.models.activity import ActivityEvent
        from app.models.alert import Alert
        from app.models.anomaly import Anomaly
        from app.models.employee import Employee

        like = f"%{query}%"

        if index == EVENTS_INDEX:
            rows = db.execute(
                select(ActivityEvent, Employee.full_name)
                .join(Employee, Employee.id == ActivityEvent.employee_id)
                .where(
                    or_(
                        ActivityEvent.resource.ilike(like),
                        ActivityEvent.application.ilike(like),
                        ActivityEvent.activity_type.ilike(like),
                        ActivityEvent.destination.ilike(like),
                        ActivityEvent.hostname.ilike(like),
                        ActivityEvent.raw_payload.ilike(like),
                        Employee.full_name.ilike(like),
                    )
                )
                .order_by(ActivityEvent.event_time.desc())
                .limit(limit)
            ).all()
            return [
                {
                    "id": e.id,
                    "kind": "event",
                    "title": f"{e.activity_type} - {e.resource or e.application or '-'}",
                    "text": e.raw_payload or e.destination or "",
                    "employee_name": name,
                    "employee_id": e.employee_id,
                    "occurred_at": e.event_time.isoformat() if e.event_time else None,
                    "link": f"/activity?employee={e.employee_id}",
                }
                for e, name in rows
            ]

        if index == ANOMALIES_INDEX:
            rows = db.execute(
                select(Anomaly, Employee.full_name)
                .join(Employee, Employee.id == Anomaly.employee_id)
                .where(
                    or_(
                        Anomaly.title.ilike(like),
                        Anomaly.description.ilike(like),
                        Anomaly.category.ilike(like),
                        Employee.full_name.ilike(like),
                    )
                )
                .order_by(Anomaly.detected_at.desc())
                .limit(limit)
            ).all()
            return [
                {
                    "id": a.id,
                    "kind": "anomaly",
                    "title": a.title,
                    "text": a.description or "",
                    "severity": a.severity,
                    "employee_name": name,
                    "employee_id": a.employee_id,
                    "occurred_at": a.detected_at.isoformat() if a.detected_at else None,
                    "link": f"/anomalies?focus={a.id}",
                }
                for a, name in rows
            ]

        if index == ALERTS_INDEX:
            rows = db.execute(
                select(Alert, Employee.full_name)
                .join(Employee, Employee.id == Alert.employee_id)
                .where(
                    or_(
                        Alert.title.ilike(like),
                        Alert.description.ilike(like),
                        Employee.full_name.ilike(like),
                    )
                )
                .order_by(Alert.created_at.desc())
                .limit(limit)
            ).all()
            return [
                {
                    "id": a.id,
                    "kind": "alert",
                    "title": a.title,
                    "text": a.description or "",
                    "severity": a.severity,
                    "status": a.status,
                    "employee_name": name,
                    "employee_id": a.employee_id,
                    "occurred_at": a.created_at.isoformat() if a.created_at else None,
                    "link": f"/alerts/{a.id}",
                }
                for a, name in rows
            ]

        rows = db.execute(
            select(ArchivedDocument)
            .where(
                ArchivedDocument.collection.in_(["case_notes", "evidence"]),
                ArchivedDocument.text_blob.ilike(like),
            )
            .order_by(ArchivedDocument.created_at.desc())
            .limit(limit)
        ).scalars().all()
        return [
            {
                "id": r.document_id,
                "kind": "note",
                "title": r.body.get("title") or "Case note",
                "text": (r.text_blob or "")[:400],
                "occurred_at": r.created_at.isoformat() if r.created_at else None,
                "link": f"/investigations/{r.ref_id}" if r.ref_id else "/investigations",
            }
            for r in rows
        ]

    def search(
        self,
        query: str,
        *,
        db: Session,
        indexes: Optional[List[str]] = None,
        limit: int = 20,
    ) -> Dict[str, Any]:
        """Search every source and return a merged, newest-first result set."""
        query = (query or "").strip()
        targets = [i for i in (indexes or list(INDEXES)) if i in INDEXES]
        if not query or not targets:
            return {"backend": self._backend, "query": query, "total": 0, "results": []}

        results: List[Dict[str, Any]] = []
        for index in targets:
            hits: List[Dict[str, Any]] = []
            if self._client is not None:
                hits = self._search_cluster(index, query, limit)
            if not hits:
                hits = self._search_relational(db, index, query, limit)
            results.extend(hits)

        results.sort(key=lambda r: (r.get("occurred_at") or ""), reverse=True)
        return {
            "backend": self._backend,
            "query": query,
            "total": len(results),
            "results": results[:limit],
        }

    def reindex(self, db: Session, limit: int = 5000) -> Dict[str, int]:
        """Rebuild the cluster indexes from PostgreSQL. No-op without a cluster."""
        if self._client is None:
            return {index: 0 for index in INDEXES}
        counts: Dict[str, int] = {}
        for index in (EVENTS_INDEX, ANOMALIES_INDEX, ALERTS_INDEX):
            docs = self._search_relational(db, index, "", limit)
            counts[index] = self.index_many(index, docs)
        counts[NOTES_INDEX] = 0
        return counts


search_backend = SearchBackend()


def index_alert(alert, employee_name: str) -> None:
    """Push one alert into the cluster as it is created."""
    if not search_backend.available:
        return
    search_backend.index_many(
        ALERTS_INDEX,
        [
            {
                "id": alert.id,
                "kind": "alert",
                "title": alert.title,
                "text": alert.description or "",
                "severity": alert.severity,
                "status": alert.status,
                "employee_name": employee_name,
                "employee_id": alert.employee_id,
                "occurred_at": datetime.now(timezone.utc).isoformat(),
                "link": f"/alerts/{alert.id}",
            }
        ],
    )
