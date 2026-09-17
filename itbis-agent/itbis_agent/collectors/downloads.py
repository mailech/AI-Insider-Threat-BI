"""
ITBIS Endpoint Agent — downloads collector

Reports files downloaded from the internet into the current user's Downloads
folder.

A new file counts as a download only if it carries a Mark-of-the-Web: the
`Zone.Identifier` alternate data stream that browsers and mail clients attach
to files from the internet, which usually also records the source URL. Files
merely copied into the folder carry no mark and are not reported.
"""
from __future__ import annotations

import os
from collections.abc import Iterator
from datetime import UTC, datetime

import structlog

from itbis_agent.collectors._snapshot import FolderWatcher
from itbis_agent.collectors.base import Collector

log = structlog.get_logger(__name__)

#: Names browsers and download managers use while a download is in progress.
TEMPORARY_SUFFIXES = (".crdownload", ".part", ".partial", ".download", ".opdownload", ".tmp")


def is_temporary_download(name: str) -> bool:
    return name.lower().endswith(TEMPORARY_SUFFIXES)


def downloads_folder() -> str | None:
    """The current user's Downloads known folder, or None if there isn't one."""
    try:
        from win32com.shell import shell, shellcon  # type: ignore

        path = shell.SHGetKnownFolderPath(shellcon.FOLDERID_Downloads)
    except Exception:  # noqa: BLE001 - not Windows, or no user profile (a service account)
        profile = os.environ.get("USERPROFILE")
        path = os.path.join(profile, "Downloads") if profile else None
    return path if path and os.path.isdir(path) else None


def read_mark_of_the_web(path: str) -> dict[str, str] | None:
    """Parse a file's Zone.Identifier stream, or None if it has none (or isn't on NTFS)."""
    try:
        with open(path + ":Zone.Identifier", encoding="utf-8", errors="replace") as stream:
            text = stream.read()
    except OSError:
        return None
    fields: dict[str, str] = {}
    for line in text.splitlines():
        key, separator, value = line.partition("=")
        if separator and key.strip():
            fields[key.strip()] = value.strip()
    return fields or None


class DownloadsCollector(Collector):
    """Internet downloads landing in the user's Downloads folder."""

    name = "downloads"
    SCAN_INTERVAL_SECONDS = 5.0
    #: Browsers write the mark as a download completes; allow this many scans for it.
    MARK_OF_THE_WEB_RETRIES = 3

    def __init__(self, poll_interval_seconds: float = 2.0) -> None:
        super().__init__(poll_interval_seconds=poll_interval_seconds)
        self._folder: str | None = None
        self._watcher: FolderWatcher | None = None
        #: path -> (size, scans left to find a Mark-of-the-Web)
        self._awaiting_mark: dict[str, tuple[int, int]] = {}

    def start(self) -> None:
        super().start()
        self._folder = downloads_folder()
        if self._folder is None:
            log.warning(
                "collector.downloads_folder_unavailable",
                name=self.name,
                hint=(
                    "This account has no Downloads folder. If the agent runs as a "
                    "service account, it cannot see a user's downloads."
                ),
            )

    def collect(self) -> Iterator[dict]:
        interval = max(self.poll_interval_seconds, self.SCAN_INTERVAL_SECONDS)
        while self._running:
            yield from self._poll()
            self._wait(interval)

    def _poll(self) -> list[dict]:
        if self._folder is None:
            return []
        if self._watcher is None:
            self._watcher = FolderWatcher(
                self._folder, recursive=False, skip_file=is_temporary_download
            )
            self._watcher.scan()  # baseline: existing files are not new downloads
            return []

        for change in self._watcher.scan():
            if change.kind == "created":
                path = os.path.join(self._folder, change.path)
                self._awaiting_mark[path] = (change.size or 0, self.MARK_OF_THE_WEB_RETRIES)

        events: list[dict] = []
        for path, (size, scans_left) in list(self._awaiting_mark.items()):
            mark = read_mark_of_the_web(path)
            if mark is not None:
                del self._awaiting_mark[path]
                events.append(self._to_raw_event(path, size, mark))
            elif scans_left <= 1 or not os.path.exists(path):
                del self._awaiting_mark[path]  # no mark: put there locally, not downloaded
            else:
                self._awaiting_mark[path] = (size, scans_left - 1)
        return events

    @staticmethod
    def _to_raw_event(path: str, size: int, mark: dict[str, str]) -> dict:
        return {
            "source": "downloads",
            "path": path,
            "file_name": os.path.basename(path),
            "size": size,
            "zone_id": mark.get("ZoneId"),
            "host_url": mark.get("HostUrl"),
            "referrer_url": mark.get("ReferrerUrl"),
            "time_generated": datetime.now(UTC).isoformat(),
        }
