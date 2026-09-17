"""
ITBIS Endpoint Agent — Runtime orchestrator

Glues collectors → normaliser → queue → uploader together.
"""
from __future__ import annotations

import os
import signal
import threading
from collections.abc import Iterable

import structlog

from itbis_agent.collectors.base import Collector
from itbis_agent.collectors.downloads import DownloadsCollector
from itbis_agent.collectors.mock import MockCollector
from itbis_agent.collectors.network import NetworkCollector
from itbis_agent.collectors.process import ProcessCollector
from itbis_agent.collectors.removable_files import RemovableFilesCollector
from itbis_agent.collectors.usb import USBCollector
from itbis_agent.collectors.windows_security import WindowsSecurityCollector
from itbis_agent.config import Config
from itbis_agent.normalizer import Normaliser
from itbis_agent.queue import PersistentQueue
from itbis_agent.uploader import Uploader

log = structlog.get_logger(__name__)

COLLECTOR_REGISTRY: dict[str, type[Collector]] = {
    "windows_security": WindowsSecurityCollector,
    "process": ProcessCollector,
    "usb": USBCollector,
    "removable_files": RemovableFilesCollector,
    "downloads": DownloadsCollector,
    "network": NetworkCollector,
    "mock": MockCollector,
}


class AgentRuntime:
    """
    Long-running orchestrator.

    Lifecycle:
        runtime = AgentRuntime(config)
        runtime.start()     # blocks until stop() is called
        ...
        runtime.stop()
    """

    def __init__(self, config: Config) -> None:
        self.config = config
        self.agent_id = config.agent.device_id
        self._stop = threading.Event()
        self._collector_threads: list[tuple[Collector, threading.Thread]] = []
        self._uploader_thread: threading.Thread | None = None
        self._normaliser: Normaliser | None = None
        self._queue: PersistentQueue | None = None
        self._uploader: Uploader | None = None

    # ─── Public API ─────────────────────────────────────────

    def start(self) -> None:
        log.info(
            "agent.start",
            agent_id=self.agent_id,
            source_dataset=self.config.agent.source_dataset,
        )

        self._queue = PersistentQueue(self.config.queue, agent_id=self.agent_id)
        self._normaliser = Normaliser(self.config.agent)
        self._uploader = Uploader(
            server=self.config.server,
            upload=self.config.upload,
            queue=self._queue,
            agent_id=self.agent_id,
        )

        self._uploader.start()
        self._start_collectors(self.config.agent.enabled_collectors)
        self._start_uploader_thread()
        self._install_signal_handlers()
        # Readiness marker, logged only once signal handlers are installed —
        # from here on Ctrl+C / Ctrl+Break are honoured.
        log.info(
            "agent.running",
            collectors=[coll.name for coll, _ in self._collector_threads],
        )

        # Block until stop() is called (by a signal handler or externally).
        # Wait in short slices, never one untimed wait: on Windows an untimed
        # Event.wait() can't be interrupted, and Python only runs a signal
        # handler once the main thread is back in bytecode — so Ctrl+C was
        # silently ignored and the agent could only be killed.
        while not self._stop.wait(timeout=0.5):
            pass
        log.info("agent.stopping")
        self._shutdown()

    def stop(self) -> None:
        self._stop.set()

    # ─── Collectors ─────────────────────────────────────────

    def _start_collectors(self, names: Iterable[str]) -> None:
        for name in names:
            cls = COLLECTOR_REGISTRY.get(name)
            if cls is None:
                log.warning("agent.unknown_collector", name=name)
                continue
            coll = cls(poll_interval_seconds=self.config.agent.poll_interval_seconds)
            coll.start()
            thread = threading.Thread(
                target=self._collector_loop,
                args=(coll,),
                name=f"collector-{name}",
                daemon=True,
            )
            thread.start()
            self._collector_threads.append((coll, thread))

    def _collector_loop(self, collector: Collector) -> None:
        try:
            for raw in collector.collect():
                if self._stop.is_set():
                    break
                if not raw:
                    continue
                self._handle_raw(raw)
        except Exception:
            log.exception("collector.crashed", name=collector.name)

    def _handle_raw(self, raw: dict) -> None:
        assert self._normaliser is not None
        assert self._queue is not None
        event = self._normaliser.normalise(raw)
        if event is None:
            return
        inserted = self._queue.enqueue(event)
        if not inserted:
            log.debug("queue.duplicate", idem=event.idempotency_key())

    # ─── Uploader thread ────────────────────────────────────

    def _start_uploader_thread(self) -> None:
        assert self._uploader is not None
        self._uploader_thread = threading.Thread(
            target=self._uploader_loop,
            name="uploader",
            daemon=True,
        )
        self._uploader_thread.start()

    def _uploader_loop(self) -> None:
        assert self._uploader is not None
        while not self._stop.is_set():
            try:
                stats = self._uploader.tick()
            except Exception:
                log.exception("uploader.tick_error")
                stats = {"sent": 0, "duplicates": 0, "rejected": 0, "retries": 0}
            if stats.get("sent") or stats.get("retries"):
                log.info("uploader.stats", **stats)
            # Sleep flush_interval OR until stop, whichever comes first
            self._stop.wait(timeout=self.config.upload.flush_interval_seconds)

    # ─── Shutdown ───────────────────────────────────────────

    def _shutdown(self) -> None:
        for coll, _ in self._collector_threads:
            try:
                coll.stop()
            except Exception:
                log.exception("collector.stop_error", name=coll.name)
        for _, t in self._collector_threads:
            t.join(timeout=5)
        if self._uploader is not None:
            self._uploader.stop()
        if self._uploader_thread is not None:
            self._uploader_thread.join(timeout=5)
        if self._queue is not None:
            self._queue.close()
        log.info("agent.stopped")

    # ─── Signal handling ────────────────────────────────────

    def _install_signal_handlers(self) -> None:
        def _handler(signum, frame):
            if self._stop.is_set():
                # Second Ctrl+C while shutting down: the operator wants out
                # now. The SQLite queue is durable, so nothing queued is lost.
                log.warning("agent.forced_exit", signum=signum)
                os._exit(130)
            log.info("agent.signal", signum=signum)
            self.stop()

        signals = [signal.SIGINT, signal.SIGTERM]
        if hasattr(signal, "SIGBREAK"):
            # Ctrl+Break on Windows — stop gracefully instead of being killed.
            signals.append(signal.SIGBREAK)
        for sig in signals:
            try:
                signal.signal(sig, _handler)
            except (ValueError, OSError):
                # Not in main thread or unsupported platform
                pass
