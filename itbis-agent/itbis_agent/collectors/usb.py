"""
ITBIS Endpoint Agent — USB / removable device collector

Watches for removable drives appearing and disappearing, via WMI
`__InstanceCreationEvent` / `__InstanceDeletionEvent` on `Win32_LogicalDisk`.

This collector:
  - emits a USB_INSERT raw event when a new removable drive appears
  - emits a USB_REMOVE raw event when a removable drive disappears

It is a no-op on non-Windows platforms.

NOTE: deep USB serial / vendor info can be unreliable on locked-down hosts
without admin rights. We emit the minimum useful identifiers here.
"""
from __future__ import annotations

from collections.abc import Iterator
from datetime import UTC, datetime

import structlog

from itbis_agent.collectors._wmi import PollErrorReporter, com_apartment, is_timeout
from itbis_agent.collectors.base import Collector

log = structlog.get_logger(__name__)

INSERT_QUERY = (
    "Select * From __InstanceCreationEvent "
    "Within 3 "
    "Where TargetInstance ISA 'Win32_LogicalDisk'"
)
REMOVE_QUERY = (
    "Select * From __InstanceDeletionEvent "
    "Within 3 "
    "Where TargetInstance ISA 'Win32_LogicalDisk'"
)

DRIVE_TYPE_REMOVABLE = 2


class USBCollector(Collector):
    name = "usb"

    def __init__(self, poll_interval_seconds: float = 3.0) -> None:
        super().__init__(poll_interval_seconds=poll_interval_seconds)
        self._wmi = None
        self._insert_watcher = None
        self._remove_watcher = None
        self._win32_available: bool = self._probe_windows()

    @staticmethod
    def _probe_windows() -> bool:
        try:
            import win32com.client  # type: ignore # noqa: F401
            return True
        except ImportError:
            return False

    # ─── Lifecycle ──────────────────────────────────────────

    def start(self) -> None:
        super().start()
        if not self._win32_available:
            log.warning(
                "collector.windows_unavailable",
                name=self.name,
                hint="Install pywin32 on a Windows host to enable this collector.",
            )
        # WMI subscriptions are created in collect(), on the collector thread
        # that will poll them — see collectors/_wmi.py for why.

    def stop(self) -> None:
        # Only signal the loop; collect() releases the COM objects on the
        # thread that owns them.
        super().stop()

    # ─── Polling ────────────────────────────────────────────

    def collect(self) -> Iterator[dict]:
        if not self._win32_available:
            while self._running:
                self._sleep()
            return

        with com_apartment():
            try:
                import win32com.client  # type: ignore

                self._wmi = win32com.client.GetObject("winmgmts:")
                self._insert_watcher = self._wmi.ExecNotificationQuery(INSERT_QUERY)
                self._remove_watcher = self._wmi.ExecNotificationQuery(REMOVE_QUERY)
            except Exception:
                log.exception("collector.wmi_init_failed", name=self.name)
                self._wmi = self._insert_watcher = self._remove_watcher = None
                while self._running:
                    self._sleep()
                return

            log.info("collector.wmi_subscribed", name=self.name)
            watchers = (
                (self._insert_watcher, "insert"),
                (self._remove_watcher, "remove"),
            )
            errors = PollErrorReporter(log, self.name)
            try:
                while self._running:
                    for watcher, kind in watchers:
                        try:
                            ev = watcher.NextEvent(500)  # 500ms
                        except Exception as exc:  # noqa: BLE001
                            if is_timeout(exc):
                                continue
                            errors.failed(exc, watcher=kind)
                            self._sleep()
                            continue
                        errors.recovered()
                        event = self._to_raw_event(ev, kind)
                        if event is not None:
                            yield event
            finally:
                watchers = ()
                self._wmi = self._insert_watcher = self._remove_watcher = None

    def _to_raw_event(self, ev, kind: str) -> dict | None:
        try:
            target = ev.Properties_("TargetInstance").Value
            drive_type = int(target.DriveType)
            if drive_type != DRIVE_TYPE_REMOVABLE:
                # Not silent: some USB flash drives (notably several USB 3.x
                # models) report as fixed disks (DriveType 3) and would
                # otherwise vanish without a trace.
                log.info(
                    "collector.usb_ignored_non_removable",
                    name=self.name,
                    kind=kind,
                    drive=target.DeviceID,
                    drive_type=drive_type,
                    volume_name=target.VolumeName,
                )
                return None
            return {
                "source": "usb",
                "event_id": 2003 if kind == "insert" else 2100,
                "kind": kind,
                "device_id": target.DeviceID,
                "volume_name": target.VolumeName,
                "file_system": target.FileSystem,
                "size_bytes": int(target.Size) if target.Size else None,
                # Stamped at detection so each insert/remove of the same drive
                # letter is a distinct occurrence (see normalizer).
                "time_generated": datetime.now(UTC).isoformat(),
            }
        except Exception:
            log.exception("collector.parse_error", name=self.name)
            return None
