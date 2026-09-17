"""
ITBIS — In-process telemetry event broker for Server-Sent Events.

Used by POST /telemetry/ingest (publish) and GET /telemetry/stream (subscribe).
Requires a single Uvicorn worker so all connections share this process memory.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

logger = logging.getLogger(__name__)


class TelemetryBroker:
    """Fan-out latest activity-log events to connected SSE subscribers."""

    def __init__(self) -> None:
        self._subscribers: set[asyncio.Queue[dict[str, Any]]] = set()
        self._lock = asyncio.Lock()

    async def subscribe(self) -> asyncio.Queue[dict[str, Any]]:
        queue: asyncio.Queue[dict[str, Any]] = asyncio.Queue(maxsize=250)
        async with self._lock:
            self._subscribers.add(queue)
        logger.debug("SSE subscriber added (n=%d)", len(self._subscribers))
        return queue

    async def unsubscribe(self, queue: asyncio.Queue[dict[str, Any]]) -> None:
        async with self._lock:
            self._subscribers.discard(queue)
        logger.debug("SSE subscriber removed (n=%d)", len(self._subscribers))

    async def publish(self, event: dict[str, Any]) -> None:
        async with self._lock:
            subscribers = list(self._subscribers)
        for queue in subscribers:
            try:
                queue.put_nowait(event)
            except asyncio.QueueFull:
                try:
                    _ = queue.get_nowait()
                    queue.put_nowait(event)
                except Exception:
                    continue


broker = TelemetryBroker()
