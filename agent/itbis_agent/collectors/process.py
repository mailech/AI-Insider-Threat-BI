"""
ITBIS Endpoint Agent — Process creation collector

Subscribes to process creation events via a WMI `__InstanceCreationEvent`
query on `Win32_Process`. The collector yields one raw event per new process.

The collector is a no-op on non-Windows platforms.
"""
from __future__ import annotations

from collections.abc import Iterator

import structlog

from itbis_agent.collectors._wmi import PollErrorReporter, com_apartment, is_timeout
from itbis_agent.collectors.base import Collector

log = structlog.get_logger(__name__)

# __InstanceCreationEvent on Win32_Process — fires when a new process is
# created. WMI polls every 2s, so processes shorter-lived than that can be
# missed; that is a WMI limitation, not a collector fault.
PROCESS_QUERY = (
    "Select * From __InstanceCreationEvent "
    "Within 2 "
    "Where TargetInstance ISA 'Win32_Process'"
)


class ProcessCollector(Collector):
    """Watches the host for new processes (Event ID 4688 equivalent)."""

    name = "process"

    def __init__(self, poll_interval_seconds: float = 2.0) -> None:
        super().__init__(poll_interval_seconds=poll_interval_seconds)
        self._wmi = None
        self._watcher = None
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
        # The WMI subscription is deliberately NOT created here: start() runs
        # on the main thread, and COM objects can only be used on the thread
        # that created them. collect() builds it on the collector thread.

    def stop(self) -> None:
        # Only signal the loop. The COM objects are released by collect() on
        # the thread that owns them — releasing them from here would be a
        # cross-apartment call.
        super().stop()

    # ─── Polling ────────────────────────────────────────────

    def collect(self) -> Iterator[dict]:
        if not self._win32_available:
            # No Windows WMI: nothing to do. Sleep so we don't busy-loop.
            while self._running:
                self._sleep()
            return

        with com_apartment():
            try:
                import win32com.client  # type: ignore

                self._wmi = win32com.client.GetObject("winmgmts:")
                self._watcher = self._wmi.ExecNotificationQuery(PROCESS_QUERY)
            except Exception:
                log.exception("collector.wmi_init_failed", name=self.name)
                self._wmi = self._watcher = None
                while self._running:
                    self._sleep()
                return

            log.info("collector.wmi_subscribed", name=self.name)
            wmi, watcher = self._wmi, self._watcher
            errors = PollErrorReporter(log, self.name)
            try:
                while self._running:
                    try:
                        ev = watcher.NextEvent(1000)  # 1s timeout (ms)
                    except Exception as exc:  # noqa: BLE001
                        if is_timeout(exc):
                            continue
                        errors.failed(exc)
                        self._sleep()
                        continue
                    errors.recovered()
                    try:
                        target = ev.Properties_("TargetInstance").Value
                        owner, owner_sid = _resolve_owner(wmi, target)
                        yield {
                            "source": "process",
                            "event_id": 4688,
                            "time_generated": target.CreationDate,
                            "process_name": target.Name,
                            "process_id": target.ProcessId,
                            "parent_process_id": target.ParentProcessId,
                            "command_line": target.CommandLine,
                            "user": owner,
                            "owner_sid": owner_sid,
                        }
                    except Exception:
                        log.exception("collector.parse_error", name=self.name)
                        continue
            finally:
                # Release COM objects before the apartment is torn down.
                wmi = watcher = None
                self._wmi = self._watcher = None


def _resolve_owner(wmi, target) -> tuple[str | None, str | None]:
    """
    Who started the process, as (DOMAIN\\user, owner SID).

    The event's own process instance is asked first. A process that has already
    exited can't be asked, so fall back to its parent: for a short-lived command
    run from a user's shell, the parent is that shell and has the same owner.
    Returns (None, None) if neither can be resolved.
    """
    candidates = [lambda: target]
    parent_pid = getattr(target, "ParentProcessId", None)
    if parent_pid is not None:
        candidates.append(lambda: wmi.Get(f"Win32_Process.Handle='{int(parent_pid)}'"))

    for get_instance in candidates:
        try:
            instance = get_instance()
            owner = instance.ExecMethod_("GetOwner")
            if int(owner.ReturnValue) != 0 or not owner.User:
                continue
            name = f"{owner.Domain}\\{owner.User}" if owner.Domain else str(owner.User)
        except Exception:  # noqa: BLE001 - process gone or access denied
            continue
        sid = None
        try:
            sid_result = instance.ExecMethod_("GetOwnerSid")
            if int(sid_result.ReturnValue) == 0 and sid_result.Sid:
                sid = str(sid_result.Sid)
        except Exception:  # noqa: BLE001 - the name alone is still useful
            pass
        return name, sid
    return None, None
