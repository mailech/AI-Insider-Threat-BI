"""
ITBIS Endpoint Agent — Event normaliser

Converts raw event dicts produced by collectors into CanonicalEvent
documents ready for the persistent queue + upload.

Windows Security events are mapped field-by-field from the provider's own
event templates (`Get-WinEvent -ListProvider Microsoft-Windows-Security-Auditing`):
every event ID packs its data in a different fixed order, so each ID has its
own handler with its own indexes.
"""
from __future__ import annotations

import ipaddress
import os
import socket
import uuid
from datetime import UTC, datetime
from urllib.parse import urlsplit

import structlog

from itbis_agent._utils import _parse_iso
from itbis_agent.config import AgentConfig
from itbis_agent.schemas import CanonicalEvent, EventType

log = structlog.get_logger(__name__)


# ─── Windows account & logon classification ─────────────────

#: Well-known SIDs of the operating system itself rather than a person.
SERVICE_ACCOUNT_SIDS = frozenset({"S-1-5-18", "S-1-5-19", "S-1-5-20", "S-1-5-7", "S-1-0-0"})
#: Per-session virtual accounts: window manager (DWM-n) and font driver host (UMFD-n).
VIRTUAL_ACCOUNT_SID_PREFIXES = ("S-1-5-90-", "S-1-5-96-")
SERVICE_ACCOUNT_NAMES = frozenset({"SYSTEM", "LOCAL SERVICE", "NETWORK SERVICE", "ANONYMOUS LOGON"})
SERVICE_ACCOUNT_DOMAINS = frozenset(
    {"NT AUTHORITY", "NT SERVICE", "WINDOW MANAGER", "FONT DRIVER HOST"}
)

LOGON_TYPE_NAMES = {
    "0": "System",
    "2": "Interactive",
    "3": "Network",
    "4": "Batch",
    "5": "Service",
    "7": "Unlock",
    "8": "NetworkCleartext",
    "9": "NewCredentials",
    "10": "RemoteInteractive",
    "11": "CachedInteractive",
    "12": "CachedRemoteInteractive",
    "13": "CachedUnlock",
}
#: System, batch (scheduled task) and service logons — never a person at a keyboard.
NON_HUMAN_LOGON_TYPES = frozenset({"0", "4", "5"})
#: Remote Desktop sessions, including cached-credential RDP.
REMOTE_SESSION_LOGON_TYPES = frozenset({"10", "12"})
#: Access to this host over the network (file shares, remote management).
NETWORK_LOGON_TYPES = frozenset({"3", "8"})
LOOPBACK_ADDRESSES = frozenset({"127.0.0.1", "::1"})

#: Groups whose membership grants elevated rights, matched by SID rather than
#: name because Windows localises group names ("Administratoren", …).
PRIVILEGED_BUILTIN_GROUP_SIDS = {
    "S-1-5-32-544": "Administrators",
    "S-1-5-32-548": "Account Operators",
    "S-1-5-32-549": "Server Operators",
    "S-1-5-32-551": "Backup Operators",
    "S-1-5-32-555": "Remote Desktop Users",
    "S-1-5-32-580": "Remote Management Users",
}
PRIVILEGED_DOMAIN_GROUP_RIDS = {
    "512": "Domain Admins",
    "518": "Schema Admins",
    "519": "Enterprise Admins",
    "520": "Group Policy Creator Owners",
}

#: User rights that let an account bypass normal access control.
SENSITIVE_USER_RIGHTS = frozenset(
    {
        "SeDebugPrivilege",
        "SeTakeOwnershipPrivilege",
        "SeBackupPrivilege",
        "SeRestorePrivilege",
        "SeLoadDriverPrivilege",
        "SeImpersonatePrivilege",
        "SeTcbPrivilege",
        "SeRemoteInteractiveLogonRight",
    }
)


#: Security zone recorded in a Mark-of-the-Web.
ZONE_NAMES = {
    "0": "LocalMachine",
    "1": "LocalIntranet",
    "2": "Trusted",
    "3": "Internet",
    "4": "Restricted",
}
#: File types that run code when opened.
EXECUTABLE_EXTENSIONS = frozenset(
    {".exe", ".msi", ".bat", ".cmd", ".ps1", ".vbs", ".js",
     ".scr", ".dll", ".jar", ".hta", ".lnk"}
)


def is_service_account(
    name: str | None, domain: str | None = None, sid: str | None = None
) -> bool:
    """True for OS, service, virtual and computer accounts; False for a person."""
    name = (name or "").strip()
    if sid and (sid in SERVICE_ACCOUNT_SIDS or sid.startswith(VIRTUAL_ACCOUNT_SID_PREFIXES)):
        return True
    if not name or name == "-" or name.upper() in SERVICE_ACCOUNT_NAMES:
        return True
    if name.endswith("$"):  # computer account, e.g. WORKSTATION$
        return True
    return (domain or "").strip().upper() in SERVICE_ACCOUNT_DOMAINS


def is_privileged_group(sid: str | None) -> bool:
    """True if membership of the group with this SID confers elevated rights."""
    if not sid:
        return False
    if sid in PRIVILEGED_BUILTIN_GROUP_SIDS:
        return True
    return sid.startswith("S-1-5-21-") and sid.rsplit("-", 1)[-1] in PRIVILEGED_DOMAIN_GROUP_RIDS


def _url_host(url: str | None) -> str | None:
    """Host part of a URL, or None."""
    if not url:
        return None
    try:
        return urlsplit(url).hostname
    except ValueError:
        return None


def _address_scope(address: str | None) -> str | None:
    """Return "public" for internet-routable addresses, else "private"."""
    try:
        ip = ipaddress.ip_address(str(address).split("%")[0])
    except ValueError:
        return None
    return "public" if ip.is_global else "private"


def _field(strings: list, index: int) -> str | None:
    """A template field, or None when absent or Windows' "-" placeholder."""
    if index >= len(strings):
        return None
    value = str(strings[index] or "").strip()
    return value if value and value != "-" else None


def _split_user(user: str) -> tuple[str, str | None]:
    if "\\" in user:
        domain, _, name = user.partition("\\")
        return name, domain
    return user, None


def _without_none(values: dict) -> dict:
    return {k: v for k, v in values.items() if v is not None}


class Normaliser:
    """
    Stateless (apart from agent config) raw-event → CanonicalEvent mapper.

    Each collector's raw shape is well-defined and small, so we dispatch on
    `raw["source"]`. New collectors are added by registering a new method.
    """

    def __init__(self, agent_config: AgentConfig) -> None:
        self.cfg = agent_config
        # Service/machine account activity is dropped unless explicitly kept:
        # it is high-volume background noise that swamps per-user baselines.
        self._keep_system = agent_config.include_system_activity
        self._host_ip = self._resolve_host_ip()
        self._os_version = self._resolve_os_version()

    # ─── Public API ─────────────────────────────────────────

    def normalise(self, raw: dict) -> CanonicalEvent | None:
        """Return a CanonicalEvent or None if the raw event can't be mapped."""
        source = raw.get("source")
        try:
            if source == "windows_security":
                return self._from_windows_security(raw)
            if source == "process":
                return self._from_process(raw)
            if source == "usb":
                return self._from_usb(raw)
            if source == "removable_files":
                return self._from_removable_files(raw)
            if source == "downloads":
                return self._from_downloads(raw)
            if source == "network":
                return self._from_network(raw)
            log.warning("normaliser.unknown_source", source=source)
            return None
        except Exception:
            log.exception("normaliser.error", source=source, raw=raw)
            return None

    # ─── Source: windows_security ───────────────────────────

    def _from_windows_security(self, raw: dict) -> CanonicalEvent | None:
        try:
            event_id = int(raw.get("event_id"))
        except (TypeError, ValueError):
            return None
        handler = _SECURITY_HANDLERS.get(event_id)
        if handler is None:
            return None
        return handler(self, raw, list(raw.get("strings") or []))

    def _is_noise(
        self,
        name: str | None,
        domain: str | None,
        sid: str | None,
        logon_type: str | None = None,
    ) -> bool:
        if self._keep_system:
            return False
        return logon_type in NON_HUMAN_LOGON_TYPES or is_service_account(name, domain, sid)

    @staticmethod
    def _logon_context(
        logon_type: str | None, ip: str | None, workstation: str | None, **extra
    ) -> dict:
        remote_session = logon_type in REMOTE_SESSION_LOGON_TYPES
        from_network = (
            logon_type in NETWORK_LOGON_TYPES and ip is not None and ip not in LOOPBACK_ADDRESSES
        )
        tags: list[str] = []
        if remote_session:
            tags.append("remote_access")
        elif logon_type in NETWORK_LOGON_TYPES:
            tags.append("network_logon")
        return {
            "is_remote": (remote_session or from_network) if logon_type else None,
            "enrichments": _without_none(
                {
                    "logon_type": logon_type,
                    "logon_type_name": LOGON_TYPE_NAMES.get(logon_type or ""),
                    "source_ip": ip,
                    "source_workstation": workstation,
                    **extra,
                }
            ),
            "tags": tags,
        }

    def _logon(self, raw: dict, s: list) -> CanonicalEvent | None:
        """4624 — an account was successfully logged on."""
        name, domain, sid = _field(s, 5), _field(s, 6), _field(s, 4)
        logon_type = _field(s, 8)
        if not name or self._is_noise(name, domain, sid, logon_type):
            return None
        workstation, ip = _field(s, 11), _field(s, 18)
        return self._security_event(
            raw,
            s,
            event_type=EventType.LOGON,
            user=self._format_user(name, domain),
            target_resource=workstation,
            target_type="workstation",
            device_name=workstation,
            ip_address=ip,
            **self._logon_context(logon_type, ip, workstation, logon_process=_field(s, 9)),
        )

    def _logon_failed(self, raw: dict, s: list) -> CanonicalEvent | None:
        """4625 — an account failed to log on. Fields diverge from 4624 after index 6."""
        name, domain = _field(s, 5), _field(s, 6)
        # TargetUserSid is the NULL SID for most failures, so it must not be used
        # to classify the account — that would discard every failed attempt.
        if not name or (not self._keep_system and is_service_account(name, domain)):
            return None
        logon_type = _field(s, 10)
        workstation, ip = _field(s, 13), _field(s, 19)
        return self._security_event(
            raw,
            s,
            event_type=EventType.LOGON_FAILED,
            user=self._format_user(name, domain),
            result="failure",
            target_resource=workstation,
            target_type="workstation",
            device_name=workstation,
            ip_address=ip,
            **self._logon_context(
                logon_type,
                ip,
                workstation,
                failure_status=_field(s, 7),
                failure_reason=_field(s, 8),
                failure_sub_status=_field(s, 9),
                logon_process=_field(s, 11),
            ),
        )

    def _logoff(self, raw: dict, s: list) -> CanonicalEvent | None:
        """4634 (logoff) / 4647 (user-initiated logoff). Only 4634 carries a LogonType."""
        name, domain, sid = _field(s, 1), _field(s, 2), _field(s, 0)
        logon_type = _field(s, 4) if int(raw["event_id"]) == 4634 else None
        if not name or self._is_noise(name, domain, sid, logon_type):
            return None
        return self._security_event(
            raw,
            s,
            event_type=EventType.LOGOFF,
            user=self._format_user(name, domain),
            target_type="workstation",
            enrichments=_without_none(
                {
                    "logon_type": logon_type,
                    "logon_type_name": LOGON_TYPE_NAMES.get(logon_type or ""),
                }
            ),
        )

    _ACCOUNT_CHANGES = {
        4720: (EventType.ACCOUNT_CREATED, "created"),
        4722: (EventType.PRIVILEGE_CHANGE, "enabled"),
        4723: (EventType.PASSWORD_CHANGE, "password_changed"),
        4724: (EventType.PASSWORD_CHANGE, "password_reset"),
        4725: (EventType.ACCOUNT_DISABLED, "disabled"),
        4726: (EventType.ACCOUNT_DISABLED, "deleted"),
    }

    def _account_change(self, raw: dict, s: list) -> CanonicalEvent | None:
        """4720, 4722–4726 — account lifecycle. Attributed to the account that made the change."""
        event_type, change = self._ACCOUNT_CHANGES[int(raw["event_id"])]
        target = self._format_user(_field(s, 0) or _field(s, 2) or "unknown", _field(s, 1))
        actor_name = _field(s, 4)
        actor = self._format_user(actor_name, _field(s, 5)) if actor_name else target
        indicators: list[str] = []
        if change == "created":
            indicators.append("account_created")
        if change == "password_reset" and actor.lower() != target.lower():
            indicators.append("password_reset_of_other_account")
        return self._security_event(
            raw,
            s,
            event_type=event_type,
            user=actor,
            target_resource=target,
            target_type="user_account",
            enrichments=_without_none(
                {
                    "change": change,
                    "target_account": target,
                    "target_sid": _field(s, 2),
                    "actor_sid": _field(s, 3),
                }
            ),
            risk_indicators=indicators,
        )

    #: event id -> (group scope, member added?)
    _GROUP_CHANGES = {
        4728: ("global", True),
        4729: ("global", False),
        4732: ("local", True),
        4733: ("local", False),
        4756: ("universal", True),
        4757: ("universal", False),
    }

    def _group_membership(self, raw: dict, s: list) -> CanonicalEvent | None:
        """4728/4729/4732/4733/4756/4757 — security group membership changed."""
        scope, added = self._GROUP_CHANGES[int(raw["event_id"])]
        sid_names = raw.get("sid_names") or {}
        member_sid = _field(s, 1)
        # Local-group events log the member as "-"; the collector resolves the SID.
        member = sid_names.get(member_sid) or _field(s, 0) or member_sid or "unknown"
        group_sid = _field(s, 4)
        group = self._format_user(_field(s, 2) or group_sid or "unknown", _field(s, 3))
        actor_name = _field(s, 6)
        actor = self._format_user(actor_name, _field(s, 7)) if actor_name else "unknown"
        privileged = is_privileged_group(group_sid)
        indicators: list[str] = []
        if privileged:
            indicators.append(
                "privileged_group_member_added" if added else "privileged_group_member_removed"
            )
        return self._security_event(
            raw,
            s,
            event_type=EventType.PRIVILEGE_CHANGE if privileged else EventType.GROUP_CHANGE,
            user=actor,
            target_resource=group,
            target_type="security_group",
            enrichments=_without_none(
                {
                    "change": "member_added" if added else "member_removed",
                    "member": member,
                    "member_sid": member_sid,
                    "group": group,
                    "group_sid": group_sid,
                    "group_scope": scope,
                    "privileged_group": privileged,
                }
            ),
            risk_indicators=indicators,
        )

    def _user_right(self, raw: dict, s: list) -> CanonicalEvent | None:
        """4704/4705 — a user right was assigned to / removed from an account."""
        assigned = int(raw["event_id"]) == 4704
        actor_name = _field(s, 1)
        actor = self._format_user(actor_name, _field(s, 2)) if actor_name else "unknown"
        target_sid = _field(s, 4)
        target = (raw.get("sid_names") or {}).get(target_sid) or target_sid or "unknown"
        rights = (_field(s, 5) or "").split()
        sensitive = sorted(set(rights) & SENSITIVE_USER_RIGHTS)
        return self._security_event(
            raw,
            s,
            event_type=EventType.PRIVILEGE_CHANGE,
            user=actor,
            target_resource=target,
            target_type="user_right",
            enrichments=_without_none(
                {
                    "change": "right_assigned" if assigned else "right_removed",
                    "rights": rights or None,
                    "sensitive_rights": sensitive or None,
                    "target_account": target,
                    "target_sid": target_sid,
                }
            ),
            risk_indicators=["sensitive_user_right_assigned"] if assigned and sensitive else [],
        )

    def _session(self, raw: dict, s: list) -> CanonicalEvent | None:
        """
        4778/4779 — a session was reconnected / disconnected.

        Only Remote Desktop sessions are kept. "Console" sessions are local fast
        user switching, not remote access.
        """
        session = _field(s, 3)
        if not session or not session.upper().startswith("RDP"):
            return None
        name, domain = _field(s, 0), _field(s, 1)
        if not name or self._is_noise(name, domain, None):
            return None
        connected = int(raw["event_id"]) == 4778
        client, address = _field(s, 4), _field(s, 5)
        return self._security_event(
            raw,
            s,
            event_type=(
                EventType.REMOTE_SESSION_CONNECT if connected
                else EventType.REMOTE_SESSION_DISCONNECT
            ),
            user=self._format_user(name, domain),
            target_resource=session,
            target_type="remote_session",
            ip_address=address,
            is_remote=True,
            enrichments=_without_none(
                {
                    "session_name": session,
                    "client_name": client,
                    "client_address": address,
                    "logon_id": _field(s, 2),
                }
            ),
            tags=["remote_access"],
        )

    def _security_event(
        self,
        raw: dict,
        strings: list,
        *,
        event_type: EventType,
        user: str,
        result: str = "success",
        target_resource: str | None = None,
        target_type: str | None = None,
        device_name: str | None = None,
        ip_address: str | None = None,
        is_remote: bool | None = None,
        enrichments: dict | None = None,
        risk_indicators: list[str] | tuple = (),
        tags: list[str] | tuple = (),
    ) -> CanonicalEvent:
        payload = {
            "event_id": raw.get("event_id"),
            "category": raw.get("category"),
            "strings": strings,
            "computer": raw.get("computer"),
        }
        if raw.get("sid_names"):
            payload["sid_names"] = raw["sid_names"]
        return CanonicalEvent(
            event_id=uuid.uuid4(),
            event_type=event_type,
            source_dataset=self.cfg.source_dataset,
            raw_event_id=f"{raw.get('event_id')}-{raw.get('record_number')}",
            timestamp=_parse_iso(raw.get("time_generated")),
            user_id=user,
            username=user,
            device_id=self.cfg.device_id,
            device_name=device_name or self.cfg.device_name,
            device_type=self.cfg.device_type,
            ip_address=ip_address or self._host_ip,
            operating_system=self._os_version or self.cfg.operating_system,
            target_resource=target_resource,
            target_type=target_type,
            action=str(raw.get("event_id")),
            result=result,
            is_remote=is_remote,
            raw_payload=payload,
            enrichments=enrichments or None,
            risk_indicators=list(risk_indicators),
            tags=[self.cfg.source_dataset, raw.get("category") or "windows_security", *tags],
        )

    # ─── Source: process ────────────────────────────────────

    def _from_process(self, raw: dict) -> CanonicalEvent | None:
        process_name = raw.get("process_name") or ""
        if not process_name:
            return None

        user = raw.get("user")
        if user and not self._keep_system:
            name, domain = _split_user(user)
            if is_service_account(name, domain, raw.get("owner_sid")):
                return None

        tags = [self.cfg.source_dataset, "process", "app_launch"]
        if not user:
            # Owner lookup failed (the process and its parent had both exited).
            # Recorded honestly as unknown rather than guessed as SYSTEM.
            tags.append("owner_unresolved")
            user = "unknown"

        return CanonicalEvent(
            event_id=uuid.uuid4(),
            event_type=EventType.APP_LAUNCH,
            source_dataset=self.cfg.source_dataset,
            # PID + creation time identifies one process instance. PID alone
            # is recycled by Windows, which made the queue drop a later,
            # different process as a "duplicate".
            raw_event_id=(
                f"4688-{raw.get('process_id')}-"
                f"{raw.get('time_generated') or uuid.uuid4().hex}"
            ),
            timestamp=_parse_iso(raw.get("time_generated")),
            user_id=user,
            username=user,
            device_id=self.cfg.device_id,
            device_name=self.cfg.device_name,
            device_type=self.cfg.device_type,
            ip_address=self._host_ip,
            operating_system=self._os_version or self.cfg.operating_system,
            target_resource=raw.get("command_line") or process_name,
            target_type="process",
            action=str(raw.get("event_id")),
            result="success",
            raw_payload={
                "process_name": process_name,
                "process_id": raw.get("process_id"),
                "parent_process_id": raw.get("parent_process_id"),
                "command_line": raw.get("command_line"),
                "owner_sid": raw.get("owner_sid"),
            },
            tags=tags,
        )

    # --- Shared helpers for events observed on this host ---------------

    @staticmethod
    def _occurred(raw: dict) -> datetime:
        when = raw.get("time_generated")
        return _parse_iso(when) if when else datetime.now(UTC)

    @staticmethod
    def _stamp(when: datetime) -> str:
        return when.strftime("%Y%m%dT%H%M%S.%fZ")

    def _host_event(self, *, user: str, **fields) -> CanonicalEvent:
        """An event observed on this host: fills in the device and actor fields."""
        return CanonicalEvent(
            event_id=uuid.uuid4(),
            source_dataset=self.cfg.source_dataset,
            user_id=user,
            username=user,
            device_id=self.cfg.device_id,
            device_name=self.cfg.device_name,
            device_type=self.cfg.device_type,
            ip_address=self._host_ip,
            operating_system=self._os_version or self.cfg.operating_system,
            result="success",
            **fields,
        )

    # --- Source: removable_files ----------------------------------------

    #: removable_files change kind -> (event type, risk indicator)
    _REMOVABLE_KINDS = {
        "created": (EventType.FILE_COPY, "file_copied_to_removable_media"),
        "modified": (EventType.FILE_WRITE, "file_written_to_removable_media"),
        "deleted": (EventType.FILE_DELETE, None),
        "renamed": (EventType.FILE_MOVE, None),
        "data_transfer": (EventType.DATA_TRANSFER, "data_transfer_to_removable_media"),
    }

    def _from_removable_files(self, raw: dict) -> CanonicalEvent | None:
        kind = raw.get("kind")
        path = raw.get("path")
        if kind not in self._REMOVABLE_KINDS or not path:
            return None
        event_type, indicator = self._REMOVABLE_KINDS[kind]
        occurred = self._occurred(raw)
        is_summary = kind == "data_transfer"
        writes_data = kind in ("created", "modified", "data_transfer")
        extension = "" if is_summary else os.path.splitext(path)[1].lower()
        return self._host_event(
            user=os.environ.get("USERNAME", "unknown"),
            event_type=event_type,
            raw_event_id=f"removable-{kind}-{path}-{raw.get('size')}-{self._stamp(occurred)}",
            timestamp=occurred,
            target_resource=path,
            target_type="removable_media",
            action=kind,
            bytes_transferred=raw.get("size") if writes_data else None,
            file_count=raw.get("file_count") if is_summary else 1,
            risk_indicators=[indicator] if indicator else [],
            raw_payload={
                key: raw.get(key)
                for key in (
                    "kind", "drive", "volume_name", "path",
                    "relative_path", "old_path", "size", "file_count",
                )
            },
            enrichments=_without_none(
                {
                    "drive": raw.get("drive"),
                    "volume_name": raw.get("volume_name"),
                    "relative_path": raw.get("relative_path"),
                    "old_path": raw.get("old_path"),
                    "extension": extension or None,
                }
            )
            or None,
            tags=[self.cfg.source_dataset, "removable_media", kind],
        )

    # --- Source: downloads ----------------------------------------------

    def _from_downloads(self, raw: dict) -> CanonicalEvent | None:
        path = raw.get("path")
        if not path:
            return None
        occurred = self._occurred(raw)
        extension = os.path.splitext(path)[1].lower()
        host_url = raw.get("host_url")
        zone_id = raw.get("zone_id")
        return self._host_event(
            user=os.environ.get("USERNAME", "unknown"),
            event_type=EventType.FILE_DOWNLOAD,
            raw_event_id=f"download-{path}-{raw.get('size')}-{self._stamp(occurred)}",
            timestamp=occurred,
            target_resource=path,
            target_type="file",
            action="download",
            bytes_transferred=raw.get("size"),
            file_count=1,
            risk_indicators=(
                ["executable_downloaded"] if extension in EXECUTABLE_EXTENSIONS else []
            ),
            raw_payload={
                key: raw.get(key)
                for key in ("path", "file_name", "size", "zone_id", "host_url", "referrer_url")
            },
            enrichments=_without_none(
                {
                    "zone_id": zone_id,
                    "zone_name": ZONE_NAMES.get(str(zone_id)),
                    "host_url": host_url,
                    "referrer_url": raw.get("referrer_url"),
                    "source_host": _url_host(host_url),
                    "extension": extension or None,
                }
            ),
            tags=[self.cfg.source_dataset, "download"],
        )

    # --- Source: network ------------------------------------------------

    def _from_network(self, raw: dict) -> CanonicalEvent | None:
        remote = raw.get("remote_address")
        port = raw.get("remote_port")
        if not remote or port is None:
            return None
        user = raw.get("user")
        if user and not self._keep_system:
            name, domain = _split_user(user)
            if is_service_account(name, domain, raw.get("owner_sid")):
                return None
        direction = raw.get("direction") or "outbound"
        tags = [self.cfg.source_dataset, "network", direction]
        if not user:
            tags.append("owner_unresolved")
            user = "unknown"
        occurred = self._occurred(raw)
        endpoint = f"[{remote}]:{port}" if ":" in str(remote) else f"{remote}:{port}"
        return self._host_event(
            user=user,
            event_type=EventType.NETWORK_CONNECTION,
            raw_event_id=(
                f"tcp-{raw.get('process_id')}-{remote}-{port}-"
                f"{raw.get('local_port')}-{self._stamp(occurred)}"
            ),
            timestamp=occurred,
            target_resource=endpoint,
            target_type="network_endpoint",
            action=direction,
            is_remote=True if direction == "inbound" else None,
            raw_payload={
                key: raw.get(key)
                for key in (
                    "direction", "local_address", "local_port", "remote_address",
                    "remote_port", "process_id", "process_name", "owner_sid",
                )
            },
            enrichments=_without_none(
                {
                    "direction": direction,
                    "remote_address": remote,
                    "remote_port": port,
                    "remote_scope": _address_scope(remote),
                    "local_port": raw.get("local_port"),
                    "process_name": raw.get("process_name"),
                    "process_id": raw.get("process_id"),
                }
            ),
            tags=tags,
        )

    # ─── Source: usb ────────────────────────────────────────

    def _from_usb(self, raw: dict) -> CanonicalEvent | None:
        kind = raw.get("kind")
        device_id = raw.get("device_id") or "unknown"
        event_type = EventType.USB_INSERT if kind == "insert" else EventType.USB_REMOVE
        occurred = (
            _parse_iso(raw["time_generated"])
            if raw.get("time_generated")
            else datetime.now(UTC)
        )
        return CanonicalEvent(
            event_id=uuid.uuid4(),
            event_type=event_type,
            source_dataset=self.cfg.source_dataset,
            # Include when it happened: the drive letter is reused by every
            # insert, so "2003-E:" alone made the queue discard all but the
            # first insert of a drive as a duplicate.
            raw_event_id=(
                f"{raw.get('event_id')}-{device_id}-"
                f"{occurred.strftime('%Y%m%dT%H%M%S.%fZ')}"
            ),
            timestamp=occurred,
            user_id=os.environ.get("USERNAME", "unknown"),
            device_id=self.cfg.device_id,
            device_name=self.cfg.device_name,
            device_type=self.cfg.device_type,
            ip_address=self._host_ip,
            operating_system=self._os_version or self.cfg.operating_system,
            target_resource=device_id,
            target_type="usb_device",
            action=str(raw.get("event_id")),
            result="success",
            raw_payload={
                "device_id": device_id,
                "volume_name": raw.get("volume_name"),
                "file_system": raw.get("file_system"),
                "size_bytes": raw.get("size_bytes"),
            },
            tags=[self.cfg.source_dataset, "usb"],
        )

    # ─── Helpers ────────────────────────────────────────────

    @staticmethod
    def _format_user(username: str, domain: str | None) -> str:
        username = (username or "").strip()
        if not username:
            return "unknown"
        if domain and "\\" not in username and "@" not in username:
            return f"{domain}\\{username}"
        return username

    @staticmethod
    def _resolve_host_ip() -> str | None:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:  # noqa: BLE001
            return None

    @staticmethod
    def _resolve_os_version() -> str | None:
        # Best-effort; on Windows, `platform.win32_ver()` returns a tuple
        return None  # set in start() hook if needed


#: Windows Security event ID -> handler. Field indexes live in each handler.
_SECURITY_HANDLERS = {
    4624: Normaliser._logon,
    4625: Normaliser._logon_failed,
    4634: Normaliser._logoff,
    4647: Normaliser._logoff,
    4720: Normaliser._account_change,
    4722: Normaliser._account_change,
    4723: Normaliser._account_change,
    4724: Normaliser._account_change,
    4725: Normaliser._account_change,
    4726: Normaliser._account_change,
    4728: Normaliser._group_membership,
    4729: Normaliser._group_membership,
    4732: Normaliser._group_membership,
    4733: Normaliser._group_membership,
    4756: Normaliser._group_membership,
    4757: Normaliser._group_membership,
    4704: Normaliser._user_right,
    4705: Normaliser._user_right,
    4778: Normaliser._session,
    4779: Normaliser._session,
}
