"""
ITBIS Endpoint Agent — HTTPS uploader

Reads events from the PersistentQueue, batches them, and POSTs to the
ITBIS server's /api/v1/ingestion/events endpoint. Handles retries with
exponential backoff and per-event dead-lettering.
"""
from __future__ import annotations

from collections.abc import Callable

import httpx
import structlog

from itbis_agent.config import ServerConfig, UploadConfig
from itbis_agent.queue import PersistentQueue, QueuedEvent
from itbis_agent.schemas import BatchAck, EventBatch

log = structlog.get_logger(__name__)

# Statuses the server returns that we treat as "permanent" (no retry)
PERMANENT_HTTP_STATUS = {400, 422}


class UploadError(Exception):
    """A transient upload failure (network, 5xx, timeout)."""


class PermanentUploadError(Exception):
    """A permanent upload failure (4xx other than 401/403/408/429)."""


class AuthUploadError(UploadError):
    """
    The server rejected our credential (401/403).

    Deliberately a subclass of UploadError — i.e. *retryable*.  An expired or
    revoked agent token says nothing about the validity of the queued events,
    so they are retained and retried rather than discarded.  Treating this as
    permanent silently destroyed every event collected after the credential
    lapsed.
    """


class Uploader:
    """
    Pulls events from the queue, batches them, POSTs to the server.

    A single Uploader instance is owned by the runtime and is the only
    component that talks to the network.
    """

    def __init__(
        self,
        server: ServerConfig,
        upload: UploadConfig,
        queue: PersistentQueue,
        agent_id: str,
        client_factory: Callable[[], httpx.Client] | None = None,
    ) -> None:
        self.server = server
        self.upload = upload
        self.queue = queue
        self.agent_id = agent_id
        self._client_factory = client_factory or self._default_client
        self._client: httpx.Client | None = None

    # ─── Lifecycle ──────────────────────────────────────────

    def start(self) -> None:
        self._client = self._client_factory()

    def stop(self) -> None:
        if self._client is not None:
            self._client.close()
            self._client = None

    def _default_client(self) -> httpx.Client:
        return httpx.Client(
            base_url=self.server.base_url.rstrip("/"),
            timeout=self.server.timeout_seconds,
            verify=self.server.verify_tls,
            headers={
                "Authorization": f"Bearer {self.server.api_key}",
                "Content-Type": "application/json",
                "User-Agent": "itbis-agent/0.1.0",
            },
        )

    # ─── Main loop tick ─────────────────────────────────────

    def tick(self) -> dict:
        """
        One upload cycle: drain one batch and send it.

        Returns a small stats dict for the runtime to log.
        """
        if self._client is None:
            self.start()

        queued = self.queue.peek(limit=self.upload.batch_size)
        if not queued:
            return {"sent": 0, "duplicates": 0, "rejected": 0, "retries": 0}

        try:
            ack = self._send_once(queued)
        except AuthUploadError as exc:
            # Credential rejected.  Hold the events at the maximum backoff and
            # do NOT consume the retry budget — this is fixed by rotating the
            # token, not by giving up on the data.
            delay = self.upload.max_backoff_seconds
            self.queue.mark_failed(
                [q.id for q in queued],
                reason=str(exc),
                delay_seconds=delay,
                increment_attempts=False,
            )
            log.error(
                "uploader.auth_rejected",
                reason=str(exc),
                delay=delay,
                n=len(queued),
                hint=(
                    "The agent credential was rejected. Events are retained "
                    "and will keep retrying — replace server.api_key with a "
                    "valid agent token."
                ),
            )
            return {"sent": 0, "duplicates": 0, "rejected": 0, "retries": 1}
        except PermanentUploadError as exc:
            self.queue.mark_dead([q.id for q in queued], str(exc))
            log.error("uploader.dead_batch", reason=str(exc), n=len(queued))
            return {"sent": 0, "duplicates": 0, "rejected": len(queued), "retries": 0}
        except UploadError as exc:
            # Enforce max_retries per event.  A batch can mix events with
            # different attempt counts, so only the individually-exhausted
            # ones are dead-lettered; the rest keep their backoff.
            exhausted = [
                q.id for q in queued if q.attempts + 1 > self.upload.max_retries
            ]
            retryable = [
                q.id for q in queued if q.attempts + 1 <= self.upload.max_retries
            ]
            if exhausted:
                self.queue.mark_dead(
                    exhausted, f"max retries ({self.upload.max_retries}) exceeded: {exc}"
                )
                log.error(
                    "uploader.retries_exhausted",
                    reason=str(exc),
                    n=len(exhausted),
                    max_retries=self.upload.max_retries,
                )
            delay = self._compute_backoff(queued[0].attempts + 1)
            if retryable:
                self.queue.mark_failed(
                    retryable,
                    reason=str(exc),
                    delay_seconds=delay,
                )
                log.warning(
                    "uploader.retry",
                    reason=str(exc),
                    delay=delay,
                    attempts=queued[0].attempts + 1,
                    n=len(retryable),
                )
            return {
                "sent": 0,
                "duplicates": 0,
                "rejected": len(exhausted),
                "retries": 1 if retryable else 0,
            }

        # Success path
        self.queue.mark_sent([q.id for q in queued])
        log.info(
            "uploader.batch_accepted",
            n=len(queued),
            accepted=ack.accepted,
            duplicates=ack.duplicates,
            rejected=ack.rejected,
        )
        return {
            "sent": ack.accepted,
            "duplicates": ack.duplicates,
            "rejected": ack.rejected,
            "retries": 0,
        }

    # ─── Send logic ─────────────────────────────────────────

    def _send_once(self, queued: list[QueuedEvent]) -> BatchAck:
        batch = EventBatch(
            agent_id=self.agent_id,
            events=[q.event for q in queued],
        )
        assert self._client is not None
        try:
            resp = self._client.post(self.server.events_path, json=batch.model_dump(mode="json"))
        except httpx.TimeoutException as exc:
            raise UploadError(f"timeout: {exc}") from exc
        except httpx.TransportError as exc:
            raise UploadError(f"transport: {exc}") from exc

        if resp.status_code in (401, 403):
            # Retryable: the operator can deploy a fresh credential and the
            # queued events will drain on the next tick.
            raise AuthUploadError(
                f"auth rejected ({resp.status_code}): {resp.text[:200]}"
            )
        if resp.status_code in PERMANENT_HTTP_STATUS:
            raise PermanentUploadError(
                f"rejected ({resp.status_code}): {resp.text[:200]}"
            )
        if 500 <= resp.status_code < 600 or resp.status_code in (408, 429):
            raise UploadError(f"server error {resp.status_code}: {resp.text[:200]}")

        if resp.status_code >= 400:
            raise PermanentUploadError(
                f"unexpected status {resp.status_code}: {resp.text[:200]}"
            )

        try:
            return BatchAck.model_validate(resp.json())
        except Exception as exc:
            # Treat malformed ack as a transient — we don't know the result
            raise UploadError(f"unparseable ack: {exc}") from exc

    # ─── Backoff ────────────────────────────────────────────

    def _compute_backoff(self, attempt: int) -> float:
        # Exponential with cap
        delay = self.upload.initial_backoff_seconds * (2 ** max(0, attempt - 1))
        return min(delay, self.upload.max_backoff_seconds)
