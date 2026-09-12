"""Document store: MongoDB when reachable, a PostgreSQL table when it is not.

The relational schema normalises activity into typed columns, which is what
makes the analytics fast -- but normalisation is lossy. The original log line a
SIEM exported, with whatever vendor-specific fields it carried, does not survive
the trip into ``activity_events``. For a forensic investigation that raw record
is exactly what an analyst needs to produce as evidence.

So MongoDB owns the document-shaped, append-heavy, schema-flexible material the
architecture assigns it:

  raw_events            the untouched ingested payload, before normalisation
  case_notes            investigation notes as written, with their revisions
  evidence              evidence documents attached to incidents
  notification_log      what was delivered to whom, and how

PostgreSQL stays authoritative for everything dashboards aggregate, because
those need joins. Nothing here is on the critical path: when Mongo is absent
the same documents land in a ``document_archive`` table instead, and every
caller behaves identically.
"""
from __future__ import annotations

import json
import logging
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import JSON, DateTime, Index, String, Text, select
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.config import settings
# Imported from session, not db.base: db.base pulls in every model, and this
# module is imported by services that models themselves do not depend on.
from app.db.session import Base

logger = logging.getLogger("itbis.documents")

RAW_EVENTS = "raw_events"
CASE_NOTES = "case_notes"
EVIDENCE = "evidence"
NOTIFICATION_LOG = "notification_log"

COLLECTIONS = (RAW_EVENTS, CASE_NOTES, EVIDENCE, NOTIFICATION_LOG)


class ArchivedDocument(Base):
    """Fallback storage used when MongoDB is not configured or not reachable.

    Deliberately shaped like a Mongo document -- an opaque JSON body under a
    collection name -- so switching backends changes no calling code.
    """

    __tablename__ = "document_archive"
    __table_args__ = (Index("ix_archive_collection_created", "collection", "created_at"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    collection: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    document_id: Mapped[str] = mapped_column(String(64), index=True, nullable=False)
    ref_id: Mapped[Optional[str]] = mapped_column(String(64), index=True, nullable=True)
    body: Mapped[dict] = mapped_column(JSON, nullable=False)
    text_blob: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False
    )


def _searchable_text(document: Dict[str, Any]) -> str:
    """Flatten a document's string values so the fallback can still be searched."""
    parts: List[str] = []

    def walk(value: Any) -> None:
        if isinstance(value, str):
            parts.append(value)
        elif isinstance(value, dict):
            for item in value.values():
                walk(item)
        elif isinstance(value, (list, tuple)):
            for item in value:
                walk(item)

    walk(document)
    return " ".join(parts)[:8000]


class DocumentStore:
    """Uniform document surface over MongoDB or the relational fallback."""

    def __init__(self) -> None:
        self._client = None
        self._db = None
        self._backend = "postgresql"
        self._connect()

    def _connect(self) -> None:
        url = (settings.MONGODB_URL or "").strip()
        if not url:
            logger.info("MONGODB_URL not set - archiving documents in PostgreSQL")
            return
        try:
            from pymongo import MongoClient  # lazy: keeps the dependency optional

            client = MongoClient(url, serverSelectionTimeoutMS=2000)
            client.admin.command("ping")
        except Exception as exc:
            logger.warning("MongoDB at %s unreachable (%s) - archiving in PostgreSQL", url, exc)
            return
        self._client = client
        self._db = client[settings.MONGODB_DB]
        self._backend = "mongodb"
        self._ensure_indexes()
        logger.info("Document store: MongoDB '%s'", settings.MONGODB_DB)

    def _ensure_indexes(self) -> None:
        try:
            for name in COLLECTIONS:
                self._db[name].create_index("ref_id")
                self._db[name].create_index("created_at")
        except Exception as exc:  # pragma: no cover - index creation is best effort
            logger.warning("Could not create MongoDB indexes (%s)", exc)

    @property
    def backend(self) -> str:
        return self._backend

    @property
    def available(self) -> bool:
        return self._db is not None

    def store(
        self,
        collection: str,
        document: Dict[str, Any],
        *,
        db: Optional[Session] = None,
        ref_id: Optional[str] = None,
    ) -> str:
        """Persist one document and return its identifier."""
        document_id = uuid.uuid4().hex
        body = dict(document)
        body.setdefault("created_at", datetime.now(timezone.utc).isoformat())
        body["document_id"] = document_id
        if ref_id is not None:
            body["ref_id"] = str(ref_id)

        if self._db is not None:
            try:
                self._db[collection].insert_one(dict(body))
                return document_id
            except Exception as exc:
                logger.warning("MongoDB write to %s failed (%s) - falling back", collection, exc)

        if db is None:
            # Without a session there is nowhere to fall back to. Archiving is
            # supplementary, so this is logged rather than raised.
            logger.warning("Document for %s dropped: no Mongo and no session", collection)
            return document_id

        db.add(
            ArchivedDocument(
                collection=collection,
                document_id=document_id,
                ref_id=str(ref_id) if ref_id is not None else None,
                body=json.loads(json.dumps(body, default=str)),
                text_blob=_searchable_text(body),
            )
        )
        db.flush()
        return document_id

    def store_many(
        self,
        collection: str,
        documents: List[Dict[str, Any]],
        *,
        db: Optional[Session] = None,
    ) -> int:
        """Bulk variant used by ingestion, where batches run to thousands of rows."""
        if not documents:
            return 0
        stamped: List[Dict[str, Any]] = []
        now = datetime.now(timezone.utc).isoformat()
        for doc in documents:
            body = dict(doc)
            body.setdefault("created_at", now)
            body["document_id"] = uuid.uuid4().hex
            stamped.append(body)

        if self._db is not None:
            try:
                self._db[collection].insert_many([dict(d) for d in stamped], ordered=False)
                return len(stamped)
            except Exception as exc:
                logger.warning("MongoDB bulk write to %s failed (%s) - falling back", collection, exc)

        if db is None:
            return 0
        db.add_all(
            [
                ArchivedDocument(
                    collection=collection,
                    document_id=d["document_id"],
                    ref_id=str(d["ref_id"]) if d.get("ref_id") is not None else None,
                    body=json.loads(json.dumps(d, default=str)),
                    text_blob=_searchable_text(d),
                )
                for d in stamped
            ]
        )
        db.flush()
        return len(stamped)

    def find(
        self,
        collection: str,
        *,
        ref_id: Optional[str] = None,
        limit: int = 50,
        db: Optional[Session] = None,
    ) -> List[Dict[str, Any]]:
        """Most recent documents in a collection, optionally scoped to one owner."""
        if self._db is not None:
            try:
                query: Dict[str, Any] = {}
                if ref_id is not None:
                    query["ref_id"] = str(ref_id)
                rows = (
                    self._db[collection]
                    .find(query, {"_id": False})
                    .sort("created_at", -1)
                    .limit(limit)
                )
                return list(rows)
            except Exception as exc:
                logger.warning("MongoDB read from %s failed (%s) - falling back", collection, exc)

        if db is None:
            return []
        stmt = select(ArchivedDocument).where(ArchivedDocument.collection == collection)
        if ref_id is not None:
            stmt = stmt.where(ArchivedDocument.ref_id == str(ref_id))
        stmt = stmt.order_by(ArchivedDocument.created_at.desc()).limit(limit)
        return [row.body for row in db.execute(stmt).scalars().all()]

    def count(self, collection: str, *, db: Optional[Session] = None) -> int:
        if self._db is not None:
            try:
                return int(self._db[collection].count_documents({}))
            except Exception:
                pass
        if db is None:
            return 0
        from sqlalchemy import func

        return int(
            db.execute(
                select(func.count(ArchivedDocument.id)).where(
                    ArchivedDocument.collection == collection
                )
            ).scalar_one()
        )

    def stats(self, db: Optional[Session] = None) -> Dict[str, int]:
        return {name: self.count(name, db=db) for name in COLLECTIONS}


documents = DocumentStore()
