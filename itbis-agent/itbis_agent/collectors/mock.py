"""
ITBIS Endpoint Agent — Mock collector

A deterministic, in-memory collector used for:
  - local development on non-Windows hosts
  - integration tests
  - smoke-testing the upload path without real system events

It replays a scripted sequence of raw event dicts on a configurable cadence.
"""
from __future__ import annotations

import queue
import threading
from collections.abc import Iterator

from itbis_agent.collectors.base import Collector


class MockCollector(Collector):
    """
    A collector driven by an in-memory event queue.

    Tests and dev tools push dicts via `submit()`. The runtime drains the
    queue via `collect()`. If the queue stays empty, `collect()` blocks
    briefly (up to `poll_interval_seconds`) before yielding nothing.
    """

    name = "mock"

    def __init__(self, poll_interval_seconds: float = 0.5) -> None:
        super().__init__(poll_interval_seconds=poll_interval_seconds)
        self._q: queue.Queue[dict] = queue.Queue()
        self._stop_event = threading.Event()

    # ─── Producer side ──────────────────────────────────────

    def submit(self, raw_event: dict) -> None:
        """Enqueue a raw event for the runtime to pick up."""
        self._q.put(raw_event)

    # Override base to clear our own stop signal
    def start(self) -> None:  # type: ignore[override]
        self._running = True
        self._stop_event.clear()

    def stop_stream(self) -> None:
        """Ask collect() to exit after draining pending events."""
        # Push the sentinel first so any blocked get() unblocks,
        # then signal that the loop should exit. _running stays True
        # so an externally-driven collect() call still drains the queue.
        self._q.put({"__stop__": True})
        self._stop_event.set()

    # ─── Consumer side (called by runtime) ──────────────────

    def collect(self) -> Iterator[dict]:
        # Use the runtime's _running flag if it's been set False
        # by the base class lifecycle; otherwise drive until stop_event.
        try:
            while self._running:
                try:
                    raw = self._q.get(timeout=self.poll_interval_seconds)
                except queue.Empty:
                    if self._stop_event.is_set():
                        return
                    continue
                if raw.get("__stop__"):
                    return
                yield raw
        finally:
            self._running = False
