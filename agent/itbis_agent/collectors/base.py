"""
ITBIS Endpoint Agent — Collector interface

A collector is a source of raw events. Each collector polls its underlying
source on a fixed cadence and yields "raw event" dicts to the normaliser.

Collectors MUST be:
  - non-blocking between polls (yield between iterations)
  - tolerant of transient source errors (log and continue)
  - cheap to construct (no I/O in __init__)
"""
from __future__ import annotations

from abc import ABC, abstractmethod
from collections.abc import Iterator

import structlog

log = structlog.get_logger(__name__)


class Collector(ABC):
    """
    Abstract base for all collectors.

    Subclasses declare a stable `name` (used for config and logging) and
    implement `collect()` which is a generator yielding raw event dicts.

    The runtime calls `collect()` in a loop, sleeping `poll_interval_seconds`
    between iterations. Collectors that need their own internal cadence
    (e.g. WMI subscriptions) can simply sleep inside `collect()`.
    """

    name: str = "base"

    def __init__(self, poll_interval_seconds: float = 2.0) -> None:
        self.poll_interval_seconds = poll_interval_seconds
        self._running: bool = False

    # ─── Lifecycle ──────────────────────────────────────────

    def start(self) -> None:
        """Hook called once before the first collect() call."""
        self._running = True
        log.info("collector.start", name=self.name)

    def stop(self) -> None:
        """Hook called once after the final collect() returns."""
        self._running = False
        log.info("collector.stop", name=self.name)

    # ─── Main entry point ───────────────────────────────────

    @abstractmethod
    def collect(self) -> Iterator[dict]:
        """
        Yield raw event dicts indefinitely. The runtime owns the
        poll-interval pacing; collectors should yield control frequently.
        """
        raise NotImplementedError

    # ─── Helpers for subclasses ─────────────────────────────

    def _sleep(self, seconds: float | None = None) -> None:
        import time

        time.sleep(seconds if seconds is not None else self.poll_interval_seconds)

    def _wait(self, seconds: float) -> None:
        """
        Sleep for up to `seconds`, returning early once the collector is stopped.

        Collectors with long scan intervals use this rather than `_sleep`, so
        stopping the agent doesn't have to wait out a whole interval.
        """
        import time

        deadline = time.monotonic() + seconds
        while self._running:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                return
            time.sleep(min(0.25, remaining))

    def __repr__(self) -> str:  # pragma: no cover - trivial
        return f"<Collector {self.name}>"
