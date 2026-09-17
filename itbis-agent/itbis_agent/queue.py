"""
ITBIS Endpoint Agent — Local Persistent Queue (SQLite)

Provides durable, ordered, idempotent event storage between the collectors
and the uploader. The queue survives process restarts.

Schema
------
    events(
        id            INTEGER PRIMARY KEY AUTOINCREMENT,
        idem_key      TEXT UNIQUE NOT NULL,   -- source_dataset:raw_event_id
        agent_id      TEXT NOT NULL,
        payload_json  TEXT NOT NULL,          -- serialised CanonicalEvent
        created_at    TEXT NOT NULL,          -- ISO-8601 UTC
        status        TEXT NOT NULL DEFAULT 'pending',  -- pending|sent|dead
        attempts      INTEGER NOT NULL DEFAULT 0,
        last_error    TEXT,
        next_attempt_at TEXT                   -- ISO-8601 UTC, for backoff
    )

Operations
----------
    enqueue(event)     -> bool    (False if duplicate)
    peek(limit)        -> list    (ready-to-send events, ordered by id)
    mark_sent(ids)     -> None
    mark_failed(ids, reason, delay_seconds) -> None
    mark_dead(ids, reason) -> None
    revive_dead()     -> int     (dead -> pending, for operator recovery)
    count_pending()    -> int
    pending_size_bytes -> int     (approximate)
"""
from __future__ import annotations

import sqlite3
import threading
from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime, timedelta
from pathlib import Path

import structlog

from itbis_agent.config import QueueConfig
from itbis_agent.schemas import CanonicalEvent

log = structlog.get_logger(__name__)


class PersistentQueue:
    """
    Thread-safe SQLite-backed event queue.

    SQLite is used in WAL mode for safe concurrent reads from the uploader
    while the runtime thread is enqueueing. Connections are short-lived per
    operation to avoid cross-thread state.
    """

    def __init__(self, cfg: QueueConfig, agent_id: str) -> None:
        self.cfg = cfg
        self.agent_id = agent_id
        self._db_path = Path(cfg.db_path)
        self._db_path.parent.mkdir(parents=True, exist_ok=True)
        self._local = threading.local()
        self._init_schema()

    # ─── Connection management ──────────────────────────────

    def _conn(self) -> sqlite3.Connection:
        conn = getattr(self._local, "conn", None)
        if conn is None:
            conn = sqlite3.connect(
                str(self._db_path),
                timeout=30,
                isolation_level=None,  # autocommit; we use explicit BEGIN
                check_same_thread=False,
            )
            conn.execute("PRAGMA journal_mode=WAL;")
            conn.execute("PRAGMA synchronous=NORMAL;")
            conn.row_factory = sqlite3.Row
            self._local.conn = conn
        return conn

    @contextmanager
    def _tx(self) -> Iterator[sqlite3.Connection]:
        conn = self._conn()
        conn.execute("BEGIN")
        try:
            yield conn
            conn.execute("COMMIT")
        except Exception:
            conn.execute("ROLLBACK")
            raise

    def _init_schema(self) -> None:
        with self._tx() as conn:
            conn.execute(
                """
                CREATE TABLE IF NOT EXISTS events (
                    id              INTEGER PRIMARY KEY AUTOINCREMENT,
                    idem_key        TEXT UNIQUE NOT NULL,
                    agent_id        TEXT NOT NULL,
                    payload_json    TEXT NOT NULL,
                    created_at      TEXT NOT NULL,
                    status          TEXT NOT NULL DEFAULT 'pending',
                    attempts        INTEGER NOT NULL DEFAULT 0,
                    last_error      TEXT,
                    next_attempt_at TEXT
                )
                """
            )
            conn.execute(
                "CREATE INDEX IF NOT EXISTS ix_events_status_next "
                "ON events(status, next_attempt_at)"
            )

    def close(self) -> None:
        conn = getattr(self._local, "conn", None)
        if conn is not None:
            conn.close()
            self._local.conn = None

    # ─── Enqueue ────────────────────────────────────────────

    def enqueue(self, event: CanonicalEvent) -> bool:
        """
        Insert an event into the queue. Returns True if inserted, False if a
        row with the same idem_key already exists.
        """
        idem = event.idempotency_key()
        payload = event.model_dump_json()
        now = _now_iso()
        try:
            with self._tx() as conn:
                conn.execute(
                    "INSERT INTO events(idem_key, agent_id, payload_json, created_at) "
                    "VALUES (?, ?, ?, ?)",
                    (idem, self.agent_id, payload, now),
                )
            return True
        except sqlite3.IntegrityError:
            return False

    # ─── Peek (for uploader) ────────────────────────────────

    def peek(self, limit: int = 200) -> list[QueuedEvent]:
        """Return up to `limit` events that are ready to send."""
        now = _now_iso()
        with self._tx() as conn:
            rows = conn.execute(
                "SELECT id, idem_key, agent_id, payload_json, attempts "
                "FROM events "
                "WHERE status = 'pending' "
                "  AND (next_attempt_at IS NULL OR next_attempt_at <= ?) "
                "ORDER BY id ASC "
                "LIMIT ?",
                (now, limit),
            ).fetchall()
        return [
            QueuedEvent(
                id=r["id"],
                idem_key=r["idem_key"],
                agent_id=r["agent_id"],
                event=CanonicalEvent.model_validate_json(r["payload_json"]),
                attempts=r["attempts"],
            )
            for r in rows
        ]

    # ─── State transitions ──────────────────────────────────

    def mark_sent(self, ids: list[int]) -> None:
        if not ids:
            return
        with self._tx() as conn:
            qmarks = ",".join("?" for _ in ids)
            conn.execute(
                f"UPDATE events SET status = 'sent' WHERE id IN ({qmarks})",
                ids,
            )

    def mark_failed(
        self,
        ids: list[int],
        reason: str,
        delay_seconds: float,
        increment_attempts: bool = True,
    ) -> None:
        """
        Schedule `ids` for a later retry.  Rows stay `pending`.

        `increment_attempts=False` applies the backoff without consuming the
        retry budget.  This is used for credential rejections, which are an
        operator problem rather than a property of the events — burning
        retries on them would eventually dead-letter perfectly valid data.
        """
        if not ids:
            return
        next_at = (_now() + timedelta(seconds=delay_seconds)).isoformat()
        attempts_expr = "attempts + 1" if increment_attempts else "attempts"
        with self._tx() as conn:
            for row_id in ids:
                conn.execute(
                    "UPDATE events "
                    f"SET attempts = {attempts_expr}, "
                    "    last_error = ?, "
                    "    next_attempt_at = ? "
                    "WHERE id = ?",
                    (reason, next_at, row_id),
                )

    def mark_dead(self, ids: list[int], reason: str) -> None:
        if not ids:
            return
        with self._tx() as conn:
            qmarks = ",".join("?" for _ in ids)
            conn.execute(
                f"UPDATE events SET status = 'dead', last_error = ? "
                f"WHERE id IN ({qmarks})",
                [reason, *ids],
            )

    def revive_dead(self) -> int:
        """
        Return every dead-lettered event to the pending queue.

        Dead-lettering used to be a one-way door, which meant an operator had
        no way to recover events discarded during an outage or a credential
        lapse.  Returns the number of rows revived.
        """
        with self._tx() as conn:
            cur = conn.execute(
                "UPDATE events "
                "SET status = 'pending', attempts = 0, next_attempt_at = NULL "
                "WHERE status = 'dead'"
            )
            return int(cur.rowcount or 0)

    # ─── Stats ──────────────────────────────────────────────

    def count_pending(self) -> int:
        with self._tx() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS c FROM events WHERE status = 'pending'"
            ).fetchone()
        return int(row["c"])

    def count_dead(self) -> int:
        with self._tx() as conn:
            row = conn.execute(
                "SELECT COUNT(*) AS c FROM events WHERE status = 'dead'"
            ).fetchone()
        return int(row["c"])

    def stats(self) -> dict:
        with self._tx() as conn:
            rows = conn.execute(
                "SELECT status, COUNT(*) AS c FROM events GROUP BY status"
            ).fetchall()
        out = {r["status"]: r["c"] for r in rows}
        out.setdefault("pending", 0)
        out.setdefault("sent", 0)
        out.setdefault("dead", 0)
        return out


class QueuedEvent:
    """Lightweight view of a row read by the uploader."""

    __slots__ = ("agent_id", "attempts", "event", "id", "idem_key")

    def __init__(
        self,
        id: int,
        idem_key: str,
        agent_id: str,
        event: CanonicalEvent,
        attempts: int,
    ) -> None:
        self.id = id
        self.idem_key = idem_key
        self.agent_id = agent_id
        self.event = event
        self.attempts = attempts

    def to_eventbatch_json(self) -> str:
        """Serialise for inclusion in a batch (not used at present)."""
        return self.event.model_dump_json()


# ─── Helpers ────────────────────────────────────────────────


def _now() -> datetime:
    return datetime.now(UTC)


def _now_iso() -> str:
    return _now().isoformat()
