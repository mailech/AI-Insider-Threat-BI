"""
ITBIS Endpoint Agent — folder snapshot diffing for file-activity collectors.

Why periodic snapshots rather than change notifications
-------------------------------------------------------
Watching a USB drive with ReadDirectoryChangesW keeps a directory handle open
on it, and Windows then refuses "Safely Remove Hardware" with "this device is
in use" — the agent would stop people ejecting their own drive. Diffing
snapshots holds nothing open between scans. It is also plain Python, so the
behaviour can be tested exactly.

Trade-offs, stated plainly:
  - a file created and deleted between two scans is never seen;
  - a copy can't be told apart from any other newly written file;
  - reading a file changes nothing on disk, so it is invisible.
"""
from __future__ import annotations

import os
from collections.abc import Callable
from dataclasses import dataclass

#: Volume-internal folders Windows keeps on removable drives; never user activity.
SKIPPED_DIRECTORIES = frozenset({"System Volume Information", "$RECYCLE.BIN"})


class FolderUnavailableError(OSError):
    """The folder being snapshotted can't be read at all (e.g. the drive was pulled)."""


@dataclass(frozen=True)
class FileState:
    size: int
    mtime_ns: int


@dataclass(frozen=True)
class Snapshot:
    files: dict[str, FileState]
    #: True when max_files was reached — absence from this snapshot proves nothing.
    truncated: bool = False


@dataclass(frozen=True)
class FileChange:
    kind: str  # "created" | "modified" | "deleted" | "renamed"
    path: str  # relative to the watched root (the new path, for renames)
    size: int | None = None
    old_path: str | None = None


def take_snapshot(
    root: str,
    *,
    recursive: bool = True,
    max_files: int = 20_000,
    skip_file: Callable[[str], bool] | None = None,
) -> Snapshot:
    """
    Record (size, mtime) for every file under `root`, keyed by relative path.

    Raises FolderUnavailableError only if `root` itself can't be listed; unreadable
    subfolders are skipped so one locked directory can't hide everything else.
    """
    files: dict[str, FileState] = {}
    pending_dirs = [""]
    while pending_dirs:
        rel_dir = pending_dirs.pop()
        abs_dir = os.path.join(root, rel_dir) if rel_dir else root
        try:
            with os.scandir(abs_dir) as listing:
                entries = list(listing)
        except OSError as exc:
            if not rel_dir:
                raise FolderUnavailableError(str(exc)) from exc
            continue

        for entry in sorted(entries, key=lambda e: e.name):
            rel_path = os.path.join(rel_dir, entry.name) if rel_dir else entry.name
            try:
                if entry.is_dir(follow_symlinks=False):
                    is_junction = getattr(entry, "is_junction", lambda: False)()
                    if recursive and not is_junction and entry.name not in SKIPPED_DIRECTORIES:
                        pending_dirs.append(rel_path)
                    continue
                if not entry.is_file(follow_symlinks=False):
                    continue
                if skip_file is not None and skip_file(entry.name):
                    continue
                stat = entry.stat(follow_symlinks=False)
            except OSError:
                continue  # vanished or locked between listing and stat
            files[rel_path] = FileState(stat.st_size, stat.st_mtime_ns)
            if len(files) >= max_files:
                return Snapshot(files, truncated=True)
    return Snapshot(files)


def diff_snapshots(old: Snapshot, new: Snapshot) -> list[FileChange]:
    """
    Raw differences between two snapshots.

    A file that disappeared and a file that appeared with an identical
    (size, mtime) are reported as one rename — renames and moves within the
    volume keep the modification time — but only when that pairing is
    unambiguous. Deletions are not reported if either snapshot was truncated.
    """
    created = {p: s for p, s in new.files.items() if p not in old.files}
    deleted = (
        {}
        if old.truncated or new.truncated
        else {p: s for p, s in old.files.items() if p not in new.files}
    )
    changes: list[FileChange] = [
        FileChange("modified", p, s.size)
        for p, s in new.files.items()
        if p in old.files and old.files[p] != s
    ]

    created_by_state: dict[FileState, list[str]] = {}
    for path, state in created.items():
        created_by_state.setdefault(state, []).append(path)
    deleted_by_state: dict[FileState, list[str]] = {}
    for path, state in deleted.items():
        deleted_by_state.setdefault(state, []).append(path)

    renamed_old: set[str] = set()
    renamed_new: set[str] = set()
    for state, old_paths in deleted_by_state.items():
        new_paths = created_by_state.get(state, [])
        if len(old_paths) == 1 and len(new_paths) == 1:
            changes.append(FileChange("renamed", new_paths[0], state.size, old_path=old_paths[0]))
            renamed_old.add(old_paths[0])
            renamed_new.add(new_paths[0])

    changes.extend(
        FileChange("created", p, s.size) for p, s in created.items() if p not in renamed_new
    )
    changes.extend(
        FileChange("deleted", p, s.size) for p, s in deleted.items() if p not in renamed_old
    )
    return sorted(changes, key=lambda c: (c.path, c.kind))


class FolderWatcher:
    """
    Turns successive snapshots of one folder into settled file changes.

    - The first scan is a baseline: files already present are not activity.
    - A new file is reported only once its size and mtime are unchanged across
      two scans, so a large copy is reported once, with its final size.
    - If the folder becomes unreadable (drive removed), scans return nothing
      rather than reporting every file as deleted.
    """

    def __init__(
        self,
        root: str,
        *,
        recursive: bool = True,
        max_files: int = 20_000,
        skip_file: Callable[[str], bool] | None = None,
    ) -> None:
        self.root = root
        self._recursive = recursive
        self._max_files = max_files
        self._skip_file = skip_file
        self._last: Snapshot | None = None
        self._pending: dict[str, FileState] = {}
        self.truncated = False

    def scan(self) -> list[FileChange]:
        try:
            snapshot = take_snapshot(
                self.root,
                recursive=self._recursive,
                max_files=self._max_files,
                skip_file=self._skip_file,
            )
        except FolderUnavailableError:
            return []
        self.truncated = snapshot.truncated

        if self._last is None:
            self._last = snapshot
            return []

        raw = diff_snapshots(self._last, snapshot)
        self._last = snapshot
        settled: list[FileChange] = []
        newly_pending: dict[str, FileState] = {}

        # Interpret this scan's raw changes against what was pending *before* it,
        # so a still-settling file that is renamed or removed is recognised as such.
        for change in raw:
            if change.kind == "created":
                newly_pending[change.path] = snapshot.files[change.path]
            elif change.kind == "renamed" and change.old_path in self._pending:
                # Renamed while settling (e.g. a finished browser download):
                # it is a creation at its final name.
                del self._pending[change.old_path]
                newly_pending[change.path] = snapshot.files[change.path]
            elif change.kind == "deleted" and change.path in self._pending:
                del self._pending[change.path]  # created and removed before it settled
            elif change.kind == "modified" and change.path in self._pending:
                continue  # still being written; the settling check below handles it
            else:
                settled.append(change)

        # Creations from earlier scans that have now stopped changing.
        for path, state in list(self._pending.items()):
            current = snapshot.files.get(path)
            if current is None:
                del self._pending[path]
            elif current == state:
                del self._pending[path]
                settled.append(FileChange("created", path, current.size))
            else:
                self._pending[path] = current

        self._pending.update(newly_pending)
        return sorted(settled, key=lambda c: (c.path, c.kind))
