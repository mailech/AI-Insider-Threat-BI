"""
ITBIS Endpoint Agent — Windows Security Event Log collector

Reads the Windows Security event log for the following Event IDs:

  Logon / logoff        4624, 4625, 4634, 4647
  Account lifecycle     4720 created, 4722 enabled, 4723 password change,
                        4724 password reset, 4725 disabled, 4726 deleted
  Group membership      4728/4729 global, 4732/4733 local, 4756/4757 universal
  User rights           4704 assigned, 4705 removed
  Remote Desktop        4778 session reconnected, 4779 session disconnected

Windows only writes some of these when the matching audit subcategory is
enabled (see agent/README.md, "Audit policy").

A bookmark (last seen record number) is kept in memory across polls; the
collector only yields events newer than the bookmark.

The collector imports `win32evtlog` lazily so the module is importable on
non-Windows platforms (used by the test suite).
"""
from __future__ import annotations

from collections.abc import Iterator

import structlog

from itbis_agent.collectors.base import Collector

log = structlog.get_logger(__name__)

# EventIDs the collector cares about -> category tag
WANTED_EVENT_IDS: dict[int, str] = {
    # Logon / logoff
    4624: "logon_success",
    4625: "logon_failed",
    4634: "logoff",
    4647: "logoff_user_initiated",
    # Account lifecycle
    4720: "account_created",
    4722: "account_enabled",
    4723: "password_changed",
    4724: "password_reset",
    4725: "account_disabled",
    4726: "account_deleted",
    # Security group membership
    4728: "group_member_added",
    4729: "group_member_removed",
    4732: "group_member_added",
    4733: "group_member_removed",
    4756: "group_member_added",
    4757: "group_member_removed",
    # User rights
    4704: "user_right_assigned",
    4705: "user_right_removed",
    # Remote Desktop sessions
    4778: "session_reconnected",
    4779: "session_disconnected",
}

# Template fields holding a SID whose account name Windows logs as "-" (local
# group members, user-right targets). Only this host can map a local SID to a
# name, so they are resolved here rather than on the server.
SID_FIELDS: dict[int, tuple[int, ...]] = {
    4728: (1,),
    4729: (1,),
    4732: (1,),
    4733: (1,),
    4756: (1,),
    4757: (1,),
    4704: (4,),
    4705: (4,),
}


def lookup_account_sid(sid: str) -> str | None:
    """DOMAIN\\name for a SID, or None if it can't be resolved on this host."""
    try:
        import win32security  # type: ignore

        name, domain, _ = win32security.LookupAccountSid(
            None, win32security.ConvertStringSidToSid(sid)
        )
        return f"{domain}\\{name}" if domain else name
    except Exception:  # noqa: BLE001 - unknown/deleted SIDs are normal
        return None


def resolve_sids(event_id: int, strings: list[str]) -> dict[str, str]:
    """Map each SID-bearing field of this event to an account name, where possible."""
    resolved: dict[str, str] = {}
    for index in SID_FIELDS.get(event_id, ()):
        sid = strings[index] if index < len(strings) else None
        if not sid or not str(sid).startswith("S-1-"):
            continue
        name = lookup_account_sid(str(sid))
        if name:
            resolved[str(sid)] = name
    return resolved


class WindowsSecurityCollector(Collector):
    """
    Polls the Windows Security event log for authentication events.

    Falls back to a no-op iterator on non-Windows platforms so the agent can
    be developed and tested cross-platform.

    Requires Administrator rights: the Security log is not readable by an
    unprivileged process.  Lacking them the collector disables itself and
    says so loudly rather than failing silently.

    Policy: "live monitoring only" (Option A). On first poll the collector
    discovers the newest available record number and sets its bookmark to it —
    no historical events are collected. Subsequent polls yield only genuinely
    new events (record_number > bookmark). This avoids flooding the backend
    with old events on startup and is the correct behaviour for a continuous
    endpoint agent.
    """

    name = "windows_security"
    LOG_NAME = "Security"

    def __init__(self, poll_interval_seconds: float = 2.0) -> None:
        super().__init__(poll_interval_seconds=poll_interval_seconds)
        self._bookmark: int | None = None
        self._win32_available: bool = self._probe_windows()
        # Set False when the Security log is unreadable (not elevated, or
        # access denied at runtime).  The collector then goes inert instead
        # of spinning on the same exception every poll.
        self._readable: bool = True

    # ─── Windows probe ──────────────────────────────────────

    @staticmethod
    def _probe_windows() -> bool:
        try:
            import win32evtlog  # type: ignore # noqa: F401
            return True
        except ImportError:
            return False

    @staticmethod
    def _is_elevated() -> bool:
        """
        True if the process has Administrator rights.

        Reading the Windows Security log requires elevation; without it
        OpenEventLog raises access-denied on every poll.  Returns True on
        non-Windows so the cross-platform test path is unaffected.
        """
        try:
            import ctypes

            return bool(ctypes.windll.shell32.IsUserAnAdmin())  # type: ignore[attr-defined]
        except (AttributeError, OSError):
            # Not Windows, or the shell32 call is unavailable.
            return True

    # ─── Lifecycle ──────────────────────────────────────────

    def start(self) -> None:
        super().start()
        if not self._win32_available:
            log.warning(
                "collector.windows_unavailable",
                name=self.name,
                hint="Install pywin32 on a Windows host to enable this collector.",
            )
            return
        if not self._is_elevated():
            # Loud and once: previously this surfaced only as a generic
            # collector.error every poll interval, so an unprivileged agent
            # looked healthy while collecting nothing at all.
            self._readable = False
            log.error(
                "collector.insufficient_privileges",
                name=self.name,
                hint=(
                    "Reading the Windows Security event log requires "
                    "Administrator rights. This collector is DISABLED for "
                    "this run — restart the agent elevated (or install it as "
                    "a service running as LocalSystem) to collect logon events."
                ),
            )

    # ─── Polling ────────────────────────────────────────────

    def collect(self) -> Iterator[dict]:
        while self._running:
            if self._win32_available and self._readable:
                try:
                    yield from self._read_events()
                except PermissionError:
                    # Access revoked mid-run (policy change, de-elevation).
                    # Report once and go inert rather than log-spamming.
                    self._readable = False
                    log.error(
                        "collector.access_denied",
                        name=self.name,
                        hint=(
                            "Access to the Security event log was denied. "
                            "This collector is DISABLED for this run — "
                            "restart the agent with Administrator rights."
                        ),
                    )
                except Exception:
                    log.exception("collector.error", name=self.name)
            self._sleep()

    # ─── Windows event log access ───────────────────────────

    def _read_events(self) -> Iterator[dict]:
        import win32evtlog

        flags = win32evtlog.EVENTLOG_BACKWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
        try:
            handle = win32evtlog.OpenEventLog(None, self.LOG_NAME)
        except Exception as exc:
            # pywin32 raises pywintypes.error (winerror 5) when the process
            # lacks rights; re-raise as a PermissionError so collect() can
            # distinguish it from a transient read failure.
            if getattr(exc, "winerror", None) == 5:
                raise PermissionError(str(exc)) from exc
            raise
        try:
            # First poll (bookmark is None): discover the newest record and
            # seed the bookmark without yielding any historical events.
            # This is the "live monitoring only" startup policy.
            if self._bookmark is None:
                highest_record: int | None = None
                while True:
                    events = win32evtlog.ReadEventLog(handle, flags, 0)
                    if not events:
                        break
                    for ev in events:
                        rn = int(ev.RecordNumber)
                        if highest_record is None or rn > highest_record:
                            highest_record = rn
                # Seed bookmark to the newest record seen; yield nothing from history
                self._bookmark = highest_record
                return

            # Subsequent polls: snapshot bookmark BEFORE iteration to avoid
            # mid-iteration updates causing records to be skipped.
            # Records come newest-first (EVENTLOG_BACKWARDS_READ), but we
            # compare against the pre-iteration bookmark so all genuinely new
            # records are processed, then update the bookmark after.
            previous_bookmark = self._bookmark
            highest_seen: int = previous_bookmark

            while True:
                events = win32evtlog.ReadEventLog(handle, flags, 0)
                if not events:
                    break
                for ev in events:
                    record_number = int(ev.RecordNumber)
                    if record_number <= previous_bookmark:
                        continue
                    event_id = int(ev.EventID)
                    if event_id not in WANTED_EVENT_IDS:
                        # Still update highest_seen so bookmark advances
                        highest_seen = max(highest_seen, record_number)
                        continue

                    highest_seen = max(highest_seen, record_number)

                    strings = list(ev.StringInserts) if ev.StringInserts else []
                    yield {
                        "source": "windows_security",
                        "event_id": event_id,
                        "record_number": record_number,
                        "time_generated": (
                            ev.TimeGenerated.isoformat() if ev.TimeGenerated else None
                        ),
                        "computer": ev.ComputerName,
                        "strings": strings,
                        "sid_names": resolve_sids(event_id, strings),
                        "category": WANTED_EVENT_IDS[event_id],
                    }

            # Update bookmark AFTER the entire polling cycle completes
            self._bookmark = highest_seen
        finally:
            win32evtlog.CloseEventLog(handle)
