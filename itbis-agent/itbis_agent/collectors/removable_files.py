"""
ITBIS Endpoint Agent — removable-drive file activity collector

Watches every removable drive (USB flash drives, SD cards) for files written
to, changed on, renamed on or deleted from it, and summarises how much data
was written to the drive in each scan as a data transfer.

It diffs periodic folder snapshots (see _snapshot.py) instead of holding a
change-notification handle open, so the drive can still be safely ejected.

Not visible here: copying a file *off* a drive (reading changes nothing on
the drive), and files created and deleted within a single scan interval.
"""
from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import UTC, datetime

import structlog

from itbis_agent.collectors._snapshot import FileChange, FolderWatcher
from itbis_agent.collectors.base import Collector

log = structlog.get_logger(__name__)

#: GetDriveType() result for removable media.
DRIVE_REMOVABLE = 2


def list_removable_drives() -> list[str]:
    """Root paths (e.g. "E:\\") of mounted removable drives; empty off Windows."""
    try:
        import win32api  # type: ignore
        import win32file  # type: ignore
    except ImportError:
        return []
    drives: list[str] = []
    for root in win32api.GetLogicalDriveStrings().split("\x00"):
        if not root:
            continue
        try:
            if win32file.GetDriveType(root) == DRIVE_REMOVABLE:
                drives.append(root)
        except Exception:  # noqa: BLE001 - drive vanished during enumeration
            continue
    return drives


def volume_label(root: str) -> str | None:
    """The drive's volume label, if it has one."""
    try:
        import win32api  # type: ignore

        return win32api.GetVolumeInformation(root)[0] or None
    except Exception:  # noqa: BLE001 - no media, not Windows, or drive pulled
        return None


class RemovableFilesCollector(Collector):
    """File activity on removable drives, plus per-scan data transfer totals."""

    name = "removable_files"
    #: Seconds between scans — also how long a short-lived file can go unseen.
    SCAN_INTERVAL_SECONDS = 5.0
    #: Beyond this many files a drive is only partially watched (and that is logged).
    MAX_FILES_PER_DRIVE = 20_000

    def __init__(self, poll_interval_seconds: float = 2.0) -> None:
        super().__init__(poll_interval_seconds=poll_interval_seconds)
        self._watchers: dict[str, FolderWatcher] = {}
        self._labels: dict[str, str | None] = {}
        self._truncation_logged: set[str] = set()

    def collect(self) -> Iterator[dict]:
        interval = max(self.poll_interval_seconds, self.SCAN_INTERVAL_SECONDS)
        while self._running:
            yield from self._poll()
            self._wait(interval)

    def _poll(self) -> list[dict]:
        mounted = set(list_removable_drives())

        for root in sorted(set(self._watchers) - mounted):
            del self._watchers[root]
            self._labels.pop(root, None)
            self._truncation_logged.discard(root)
            log.info("collector.removable_drive_detached", name=self.name, drive=_drive(root))

        events: list[dict] = []
        for root in sorted(mounted):
            watcher = self._watchers.get(root)
            if watcher is None:
                # Newly seen drive: whatever is already on it is not activity.
                watcher = FolderWatcher(root, max_files=self.MAX_FILES_PER_DRIVE)
                watcher.scan()
                self._watchers[root] = watcher
                self._labels[root] = volume_label(root)
                log.info(
                    "collector.removable_drive_watched",
                    name=self.name,
                    drive=_drive(root),
                    volume_name=self._labels[root],
                )
                continue
            changes = watcher.scan()
            if watcher.truncated and root not in self._truncation_logged:
                self._truncation_logged.add(root)
                log.warning(
                    "collector.removable_drive_partially_watched",
                    name=self.name,
                    drive=_drive(root),
                    max_files=self.MAX_FILES_PER_DRIVE,
                )
            events.extend(self._to_raw_events(root, changes))
        return events

    def _to_raw_events(self, root: str, changes: list[FileChange]) -> list[dict]:
        if not changes:
            return []
        common = {
            "source": "removable_files",
            "drive": _drive(root),
            "volume_name": self._labels.get(root),
            "time_generated": datetime.now(UTC).isoformat(),
        }
        events: list[dict] = []
        written_bytes = written_files = 0
        for change in changes:
            events.append(
                {
                    **common,
                    "kind": change.kind,
                    "path": os.path.join(root, change.path),
                    "relative_path": change.path,
                    "old_path": os.path.join(root, change.old_path) if change.old_path else None,
                    "size": change.size,
                }
            )
            if change.kind in ("created", "modified"):
                written_bytes += change.size or 0
                written_files += 1
        if written_files:
            events.append(
                {
                    **common,
                    "kind": "data_transfer",
                    "path": root,
                    "size": written_bytes,
                    "file_count": written_files,
                }
            )
        return events


def _drive(root: str) -> str:
    return os.path.splitdrive(root)[0] or root
