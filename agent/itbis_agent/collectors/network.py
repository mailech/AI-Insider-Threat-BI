"""
ITBIS Endpoint Agent — network connection collector

Reports new TCP connections together with the process and user that own them,
by polling Windows' TCP connection table (MSFT_NetTCPConnection).

Scope, stated plainly:
  - TCP only; UDP traffic (including most DNS lookups) is not tracked.
  - A connection that opens and closes between two polls is not seen.
  - No byte counts: Windows exposes per-process I/O totals only for disk and
    network combined, so network volume can't be attributed to a process.
"""
from __future__ import annotations

import ipaddress
import time
from collections.abc import Callable, Iterator
from dataclasses import dataclass
from datetime import UTC, datetime

import structlog

from itbis_agent.collectors._wmi import PollErrorReporter, com_apartment
from itbis_agent.collectors.base import Collector
from itbis_agent.collectors.process import _resolve_owner

log = structlog.get_logger(__name__)

TCP_STATE_LISTEN = 2
TCP_STATE_ESTABLISHED = 5

CONNECTION_QUERY = (
    "SELECT LocalAddress, LocalPort, RemoteAddress, RemotePort, State, OwningProcess "
    "FROM MSFT_NetTCPConnection"
)
#: PID 0 (System Idle Process) and 4 (System) are the kernel, not a user process.
KERNEL_PIDS = frozenset({0, 4})


@dataclass(frozen=True)
class TcpConnection:
    local_address: str
    local_port: int
    remote_address: str
    remote_port: int
    state: int
    pid: int


@dataclass(frozen=True)
class NewConnection:
    connection: TcpConnection
    direction: str  # "inbound" | "outbound"


def is_uninteresting_remote(address: str) -> bool:
    """Loopback and unspecified addresses: traffic that never leaves this host."""
    try:
        ip = ipaddress.ip_address(str(address).split("%")[0])
    except ValueError:
        return True
    if ip.version == 6 and ip.ipv4_mapped is not None:
        ip = ip.ipv4_mapped
    return ip.is_loopback or ip.is_unspecified


class ConnectionTracker:
    """
    Decides which rows of the TCP table are new activity.

    - The first poll is a baseline: connections already open are not activity.
    - Only established connections to another host count.
    - The same process connecting to the same remote endpoint again within
      `repeat_window_seconds` is not reported again — browsers open and close
      many short connections to one server.
    """

    def __init__(
        self,
        repeat_window_seconds: float = 300.0,
        clock: Callable[[], float] = time.monotonic,
    ) -> None:
        self._repeat_window = repeat_window_seconds
        self._clock = clock
        self._previous: set[tuple] | None = None
        self._last_reported: dict[tuple, float] = {}

    def update(self, rows: list[TcpConnection]) -> list[NewConnection]:
        listening = {(r.local_port, r.pid) for r in rows if r.state == TCP_STATE_LISTEN}
        established = [
            r
            for r in rows
            if r.state == TCP_STATE_ESTABLISHED and not is_uninteresting_remote(r.remote_address)
        ]
        current = {self._key(r) for r in established}
        if self._previous is None:
            self._previous = current
            return []

        now = self._clock()
        self._last_reported = {
            endpoint: at
            for endpoint, at in self._last_reported.items()
            if now - at < self._repeat_window
        }
        new: list[NewConnection] = []
        for row in sorted(established, key=self._key):
            if self._key(row) in self._previous:
                continue
            endpoint = (row.pid, row.remote_address, row.remote_port)
            if endpoint in self._last_reported:
                continue
            self._last_reported[endpoint] = now
            direction = "inbound" if (row.local_port, row.pid) in listening else "outbound"
            new.append(NewConnection(row, direction))
        self._previous = current
        return new

    @staticmethod
    def _key(row: TcpConnection) -> tuple:
        return (row.pid, row.local_address, row.local_port, row.remote_address, row.remote_port)


def read_connection_table(tcp_namespace) -> list[TcpConnection]:
    """Snapshot the TCP table as plain values, releasing every WMI row before returning."""
    query = tcp_namespace.ExecQuery(CONNECTION_QUERY)
    try:
        return [
            TcpConnection(
                local_address=str(row.LocalAddress),
                local_port=int(row.LocalPort),
                remote_address=str(row.RemoteAddress),
                remote_port=int(row.RemotePort),
                state=int(row.State),
                pid=int(row.OwningProcess),
            )
            for row in query
        ]
    finally:
        # COM objects must be released before the apartment is torn down.
        query = None


def process_identity(cimv2, pid: int) -> tuple[str | None, str | None, str | None]:
    """(process name, DOMAIN\\user, owner SID) for a PID, with None where unknown."""
    if pid in KERNEL_PIDS:
        return ("System", "NT AUTHORITY\\SYSTEM", "S-1-5-18")
    instance = None
    try:
        matches = list(
            cimv2.ExecQuery(
                "SELECT Handle, Name, ProcessId, ParentProcessId FROM Win32_Process "
                f"WHERE ProcessId = {int(pid)}"
            )
        )
        if not matches:
            return None, None, None
        instance = matches[0]
        matches = None
        owner, owner_sid = _resolve_owner(cimv2, instance)
        return str(instance.Name), owner, owner_sid
    except Exception:  # noqa: BLE001 - the process may already have exited
        return None, None, None
    finally:
        instance = None


class NetworkCollector(Collector):
    """New TCP connections, attributed to their owning process and user."""

    name = "network"
    #: The TCP table query takes ~0.5 s, so it is polled far less often than events.
    SCAN_INTERVAL_SECONDS = 15.0

    def __init__(self, poll_interval_seconds: float = 2.0) -> None:
        super().__init__(poll_interval_seconds=poll_interval_seconds)
        self._tracker = ConnectionTracker()
        self._win32_available: bool = self._probe_windows()

    @staticmethod
    def _probe_windows() -> bool:
        try:
            import win32com.client  # type: ignore # noqa: F401
            return True
        except ImportError:
            return False

    def start(self) -> None:
        super().start()
        if not self._win32_available:
            log.warning(
                "collector.windows_unavailable",
                name=self.name,
                hint="Install pywin32 on a Windows host to enable this collector.",
            )

    def collect(self) -> Iterator[dict]:
        interval = max(self.poll_interval_seconds, self.SCAN_INTERVAL_SECONDS)
        if not self._win32_available:
            while self._running:
                self._wait(interval)
            return

        with com_apartment():
            try:
                import win32com.client  # type: ignore

                tcp = win32com.client.GetObject("winmgmts:root/StandardCimv2")
                cimv2 = win32com.client.GetObject("winmgmts:")
            except Exception:
                log.exception("collector.wmi_init_failed", name=self.name)
                while self._running:
                    self._wait(interval)
                return

            log.info("collector.wmi_subscribed", name=self.name)
            errors = PollErrorReporter(log, self.name)
            try:
                while self._running:
                    yield from self._poll(tcp, cimv2, errors)
                    self._wait(interval)
            finally:
                tcp = cimv2 = None

    def _poll(self, tcp, cimv2, errors: PollErrorReporter) -> list[dict]:
        try:
            new = self._tracker.update(read_connection_table(tcp))
        except Exception as exc:  # noqa: BLE001
            errors.failed(exc)
            return []
        errors.recovered()

        identities: dict[int, tuple[str | None, str | None, str | None]] = {}
        now = datetime.now(UTC).isoformat()
        events: list[dict] = []
        for item in new:
            conn = item.connection
            if conn.pid not in identities:
                identities[conn.pid] = process_identity(cimv2, conn.pid)
            process_name, owner, owner_sid = identities[conn.pid]
            events.append(
                {
                    "source": "network",
                    "kind": "tcp_connection",
                    "direction": item.direction,
                    "local_address": conn.local_address,
                    "local_port": conn.local_port,
                    "remote_address": conn.remote_address,
                    "remote_port": conn.remote_port,
                    "process_id": conn.pid,
                    "process_name": process_name,
                    "user": owner,
                    "owner_sid": owner_sid,
                    "time_generated": now,
                }
            )
        return events
