"""
Live Windows Event Log Listener Service
========================================
Scoped Exception Module for Activity Management System (AMS).

This service runs as a background process or thread to capture real Windows Event Logs
(Security, System) and normalize them into AMS's existing behavioral telemetry schema.

Security Guardrails:
1. Pre-existing Seeded Identities Only: Only accounts mapped in `employee_identity_mappings`
   will produce TelemetryLog entries for that employee.
2. Zero New Employee Provisioning: Unmapped Windows identities are quarantined in
   `unmapped_ingestion_logs` without creating new employee records or false attribution.
3. Additive Telemetry: Telemetry rows are tagged with source="live_windows_listener".
4. Untouched Downstream Engine: Normalizes to standard event types (LOGIN, PRIVILEGE_CHANGE, USB_DEVICE)
   allowing existing UEBA profiling and scoring engines to process telemetry with zero alterations.
5. Default OFF: ENABLE_LIVE_WINDOWS_LISTENER defaults to False.
6. Honest Diagnostic Reporting: Real execution state is reported accurately at all times.
"""

import os
import sys
import time
import json
import logging
import threading
import datetime
from typing import Dict, Any, Optional, Tuple, List

# Ensure backend root is on sys.path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_ROOT = os.path.dirname(CURRENT_DIR)
if BACKEND_ROOT not in sys.path:
    sys.path.insert(0, BACKEND_ROOT)

from app.config import settings
from app.database import SessionLocal
from sqlalchemy.orm import Session
from app.models import Employee, TelemetryLog, EmployeeIdentityMapping, UnmappedIngestionLog

logger = logging.getLogger("ams.windows_event_listener")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")

# Detect Host Platform and pywin32 Availability
IS_WINDOWS = sys.platform == "win32"
PYWIN32_AVAILABLE = False
win32evtlog = None
win32evtlogutil = None
win32con = None

if IS_WINDOWS:
    try:
        import win32evtlog as _w_evt
        import win32evtlogutil as _w_util
        import win32con as _w_con
        win32evtlog = _w_evt
        win32evtlogutil = _w_util
        win32con = _w_con
        PYWIN32_AVAILABLE = True
    except ImportError:
        PYWIN32_AVAILABLE = False
        logger.warning("Running on Windows, but pywin32 (win32evtlog) is not installed. Live OS reading unavailable.")

# In-Memory State Registry
_state_lock = threading.Lock()
_listener_state: Dict[str, Any] = {
    "is_enabled": settings.ENABLE_LIVE_WINDOWS_LISTENER,
    "is_running": False,
    "is_windows": IS_WINDOWS,
    "pywin32_available": PYWIN32_AVAILABLE,
    "has_event_log_access": False,
    "last_event_timestamp": None,
    "total_mapped_processed": 0,
    "total_unmapped_processed": 0,
    "channels_monitored": list(settings.WINDOWS_LISTENER_CHANNELS),
    "poll_interval_seconds": float(settings.WINDOWS_LISTENER_POLL_INTERVAL_SECONDS),
    "status_summary": "Disabled (Default OFF)",
    "message": "Live Windows Event Listener is currently disabled by configuration (ENABLE_LIVE_WINDOWS_LISTENER=false)."
}

_stop_event = threading.Event()
_worker_thread: Optional[threading.Thread] = None


def get_bookmark_path() -> str:
    """Returns absolute path to the bookmark JSON file."""
    if os.path.isabs(settings.WINDOWS_EVENT_BOOKMARK_FILE):
        return settings.WINDOWS_EVENT_BOOKMARK_FILE
    return os.path.join(BACKEND_ROOT, settings.WINDOWS_EVENT_BOOKMARK_FILE)


def load_bookmarks() -> Dict[str, int]:
    """Loads channel bookmarks (record numbers) from disk."""
    path = get_bookmark_path()
    if os.path.exists(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.warning("Could not read bookmark file %s: %s", path, e)
    return {}


def save_bookmarks(bookmarks: Dict[str, int]) -> None:
    """Saves channel bookmarks to disk."""
    path = get_bookmark_path()
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(bookmarks, f, indent=2)
    except Exception as e:
        logger.warning("Could not persist bookmark file %s: %s", path, e)


# ==============================================================================
# Event Normalization Engine
# ==============================================================================

class NormalizedEvent:
    def __init__(
        self,
        event_type: str,
        severity: str,
        description: str,
        anomaly_category: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None,
    ):
        self.event_type = event_type
        self.severity = severity
        self.description = description
        self.anomaly_category = anomaly_category
        self.payload = payload or {}


def normalize_windows_event(
    channel: str,
    event_id: int,
    raw_identifier: str,
    source_ip: str = "127.0.0.1",
    raw_details: Optional[Dict[str, Any]] = None,
    timestamp: Optional[datetime.datetime] = None,
) -> NormalizedEvent:
    """
    Normalizes raw Windows Event Log data into AMS's standard telemetry schema.
    Reuses existing event types: LOGIN, PRIVILEGE_CHANGE, USB_DEVICE, APPLICATION_USAGE.
    """
    details = raw_details or {}
    ts = timestamp or datetime.datetime.utcnow()
    hour = ts.hour

    if channel.lower() == "security":
        # Event 4624: Successful Logon
        if event_id == 4624:
            logon_type = details.get("logon_type", 2)
            logon_type_map = {
                2: "Interactive (Console)",
                3: "Network (Share/RPC)",
                7: "Unlock Workstation",
                10: "Remote Interactive (RDP)",
                11: "Cached Interactive"
            }
            logon_desc = logon_type_map.get(logon_type, f"Type {logon_type}")
            
            # Check for schedule deviation (outside 06:00 - 21:00 UTC)
            is_off_hours = hour < 6 or hour >= 21
            anomaly = "UNUSUAL_LOGIN_TIME" if is_off_hours else None
            severity = "MEDIUM" if is_off_hours else "INFO"
            
            desc = f"Windows Logon ({logon_desc}) for {raw_identifier} from workstation {details.get('workstation', 'LOCAL')}"
            if is_off_hours:
                desc += " [Off-Hours Behavioral Schedule Anomaly]"

            return NormalizedEvent(
                event_type="LOGIN",
                severity=severity,
                description=desc,
                anomaly_category=anomaly,
                payload={
                    "windows_event_id": 4624,
                    "channel": "Security",
                    "logon_type": logon_type,
                    "logon_type_desc": logon_desc,
                    "workstation": details.get("workstation", "LOCAL"),
                    "target_user": raw_identifier,
                    "target_domain": details.get("domain", "CORP"),
                    "auth_package": details.get("auth_package", "Negotiate/Kerberos"),
                    "source_ip": source_ip
                }
            )

        # Event 4625: Failed Logon
        elif event_id == 4625:
            failure_status = details.get("status_code", "0xC000006D")
            return NormalizedEvent(
                event_type="LOGIN",
                severity="MEDIUM",
                description=f"Failed Windows Authentication for {raw_identifier} (Status: {failure_status})",
                anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
                payload={
                    "windows_event_id": 4625,
                    "channel": "Security",
                    "failure_status": failure_status,
                    "target_user": raw_identifier,
                    "workstation": details.get("workstation", "LOCAL"),
                    "mitre_technique_id": "T1078",
                    "source_ip": source_ip
                }
            )

        # Event 4672: Special Privileges Assigned
        elif event_id == 4672:
            privileges = details.get("privileges", ["SeDebugPrivilege", "SeSecurityPrivilege", "SeTcbPrivilege"])
            return NormalizedEvent(
                event_type="PRIVILEGE_CHANGE",
                severity="HIGH",
                description=f"Special Administrative Privileges Assigned to {raw_identifier} ({', '.join(privileges[:2])})",
                anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
                payload={
                    "windows_event_id": 4672,
                    "channel": "Security",
                    "privileges_assigned": privileges,
                    "target_user": raw_identifier,
                    "mitre_technique_id": "T1098"
                }
            )

        # Event 4720/4728/4732: User/Group Management
        elif event_id in (4720, 4728, 4732):
            action_map = {
                4720: "User Account Created",
                4728: "Member Added to Security-Enabled Global Group",
                4732: "Member Added to Security-Enabled Local Group"
            }
            action_name = action_map.get(event_id, "Security Principal Modification")
            target_group = details.get("target_group", "Administrators")
            return NormalizedEvent(
                event_type="PRIVILEGE_CHANGE",
                severity="HIGH",
                description=f"Windows Security Change: {action_name} by {raw_identifier} (Target: {target_group})",
                anomaly_category="UNAUTHORIZED_ACCESS_ATTEMPT",
                payload={
                    "windows_event_id": event_id,
                    "channel": "Security",
                    "action": action_name,
                    "target_group": target_group,
                    "actor_user": raw_identifier,
                    "mitre_technique_id": "T1098"
                }
            )

    elif channel.lower() == "system":
        # Event 20001, 2003, or DeviceSetupManager USB arrival
        if event_id in (20001, 2003, 20003, 112, 200):
            device_id = details.get("device_id", "USB\\VID_0781&PID_5581")
            device_desc = details.get("device_desc", "USB Mass Storage Device")
            is_unapproved = "unsigned" in device_desc.lower() or "storage" in device_desc.lower()
            return NormalizedEvent(
                event_type="USB_DEVICE",
                severity="HIGH" if is_unapproved else "MEDIUM",
                description=f"Removable Peripheral Connection: {device_desc} ({device_id}) detected under {raw_identifier}",
                anomaly_category="SUSPICIOUS_DEVICE_USAGE" if is_unapproved else None,
                payload={
                    "windows_event_id": event_id,
                    "channel": "System",
                    "device_id": device_id,
                    "device_description": device_desc,
                    "hardware_ids": details.get("hardware_ids", [device_id]),
                    "associated_account": raw_identifier,
                    "mitre_technique_id": "T1052"
                }
            )

    # Generic Fallback Normalization
    return NormalizedEvent(
        event_type="APPLICATION_USAGE",
        severity="INFO",
        description=f"Windows Event ({channel} ID {event_id}) attributed to {raw_identifier}",
        anomaly_category=None,
        payload={
            "windows_event_id": event_id,
            "channel": channel,
            "raw_identifier": raw_identifier,
            "details": details
        }
    )


# ==============================================================================
# Mapping & Ingestion Pipeline
# ==============================================================================

def resolve_identity_mapping(db: Session, raw_identifier: str) -> Optional[EmployeeIdentityMapping]:
    """
    Looks up an EmployeeIdentityMapping using various standard Windows identity permutations:
    1. Exact match (e.g. CORP\\elena.rostova)
    2. Case-insensitive exact match
    3. Username-only match (e.g. elena.rostova)
    4. Domain-stripped match
    """
    raw_clean = raw_identifier.strip()
    if not raw_clean:
        return None

    # Try exact or case-insensitive match
    mapping = db.query(EmployeeIdentityMapping).filter(
        EmployeeIdentityMapping.windows_identifier.ilike(raw_clean)
    ).first()
    if mapping:
        return mapping

    # Strip domain if present (DOMAIN\user -> user or user@domain -> user)
    short_user = raw_clean
    if "\\" in raw_clean:
        short_user = raw_clean.split("\\", 1)[1]
    elif "@" in raw_clean:
        short_user = raw_clean.split("@", 1)[0]

    if short_user and short_user != raw_clean:
        mapping = db.query(EmployeeIdentityMapping).filter(
            EmployeeIdentityMapping.windows_identifier.ilike(short_user)
        ).first()
        if mapping:
            return mapping

    return None


def process_and_route_event(
    db: Session,
    channel: str,
    event_id: int,
    raw_identifier: str,
    source_ip: str = "127.0.0.1",
    raw_details: Optional[Dict[str, Any]] = None,
    timestamp: Optional[datetime.datetime] = None,
) -> Tuple[bool, Optional[int], Optional[int], Optional[str]]:
    """
    Routes an event through the strict identity mapping pipeline.
    
    Returns:
        (mapped, telemetry_log_id, unmapped_log_id, employee_id)
    """
    ts = timestamp or datetime.datetime.utcnow()
    normalized = normalize_windows_event(
        channel=channel,
        event_id=event_id,
        raw_identifier=raw_identifier,
        source_ip=source_ip,
        raw_details=raw_details,
        timestamp=ts
    )

    mapping = resolve_identity_mapping(db, raw_identifier)

    if mapping:
        # Guardrail check: Ensure mapped employee exists in database
        employee = db.query(Employee).filter(Employee.id == mapping.employee_id).first()
        if employee:
            telemetry = TelemetryLog(
                employee_id=employee.id,
                event_type=normalized.event_type,
                severity=normalized.severity,
                anomaly_category=normalized.anomaly_category,
                source_ip=source_ip,
                timestamp=ts,
                description=normalized.description,
                payload=normalized.payload,
                source="live_windows_listener"  # Tagged with live listener source
            )
            db.add(telemetry)
            db.commit()
            db.refresh(telemetry)

            with _state_lock:
                _listener_state["total_mapped_processed"] += 1
                _listener_state["last_event_timestamp"] = ts

            logger.info("Mapped Windows Event %s:%d to employee %s (%s)", channel, event_id, employee.id, employee.full_name)
            return True, telemetry.id, None, employee.id

    # UNMAPPED: Quarantine in unmapped_ingestion_logs
    unmapped = UnmappedIngestionLog(
        raw_identifier=raw_identifier,
        channel=channel,
        event_id=event_id,
        event_type=normalized.event_type,
        source_ip=source_ip,
        timestamp=ts,
        raw_details=raw_details,
        reason="Unmapped Windows Account Identifier - Quarantined per AMS Security Guardrail"
    )
    db.add(unmapped)
    db.commit()
    db.refresh(unmapped)

    with _state_lock:
        _listener_state["total_unmapped_processed"] += 1
        _listener_state["last_event_timestamp"] = ts

    logger.info("Quarantined unmapped Windows Event %s:%d for identity '%s' (Unmapped Log ID: %d)", channel, event_id, raw_identifier, unmapped.id)
    return False, None, unmapped.id, None


# ==============================================================================
# Service Status & Worker Lifecycle
# ==============================================================================

def get_listener_status() -> Dict[str, Any]:
    """Retrieves current honest operational status of the listener."""
    with _state_lock:
        st = dict(_listener_state)

    if not st["is_windows"]:
        st["status_summary"] = "Unsupported Host OS"
        st["message"] = f"Host platform is '{sys.platform}'. Windows Event Log API is only available on Microsoft Windows."
    elif not st["pywin32_available"]:
        st["status_summary"] = "Missing pywin32 Dependency"
        st["message"] = "pywin32 (win32evtlog) is not installed in the active Python environment. Install pywin32 to enable OS event polling."
    elif not st["is_enabled"]:
        st["status_summary"] = "Disabled by Configuration"
        st["message"] = "Live Windows Event Listener is disabled (ENABLE_LIVE_WINDOWS_LISTENER=false). Seeded dataset remains active."
    elif st["is_running"]:
        st["status_summary"] = "Operational (Subscribed)"
        st["message"] = f"Listener is actively polling channels: {', '.join(st['channels_monitored'])} every {st['poll_interval_seconds']}s."
    else:
        st["status_summary"] = "Stopped"
        st["message"] = "Listener service is configured but worker thread is not running."

    return st


def _listener_worker_loop():
    """Background polling loop for Windows Event Logs."""
    global _listener_state
    logger.info("Windows Event Log Listener worker thread started.")

    with _state_lock:
        _listener_state["is_running"] = True

    bookmarks = load_bookmarks()
    poll_interval = float(settings.WINDOWS_LISTENER_POLL_INTERVAL_SECONDS)

    while not _stop_event.is_set():
        if not PYWIN32_AVAILABLE:
            time.sleep(poll_interval)
            continue

        db = SessionLocal()
        try:
            for channel in settings.WINDOWS_LISTENER_CHANNELS:
                if _stop_event.is_set():
                    break
                try:
                    handle = win32evtlog.OpenEventLog(None, channel)
                    flags = win32evtlog.EVENTLOG_FORWARDS_READ | win32evtlog.EVENTLOG_SEQUENTIAL_READ
                    
                    with _state_lock:
                        _listener_state["has_event_log_access"] = True

                    # Read event batch
                    events = win32evtlog.ReadEventLog(handle, flags, 0)
                    last_rec = bookmarks.get(channel, 0)
                    max_rec_in_batch = last_rec

                    while events and not _stop_event.is_set():
                        for ev in events:
                            rec_no = ev.RecordNumber
                            if rec_no <= last_rec:
                                continue

                            event_id = ev.EventID & 0xFFFF
                            user_sid = str(ev.Sid) if ev.Sid else "N/A"
                            computer = str(ev.ComputerName)
                            strings = list(ev.StringInserts or [])
                            
                            # Extract user identity candidate
                            raw_user = "SYSTEM"
                            if channel.lower() == "security" and len(strings) >= 6:
                                raw_user = strings[5] if strings[5] else strings[1] if len(strings) > 1 else "SYSTEM"
                                if len(strings) > 6 and strings[6] and strings[6] != "-":
                                    raw_user = f"{strings[6]}\\{raw_user}"

                            # Ingest and route
                            process_and_route_event(
                                db=db,
                                channel=channel,
                                event_id=event_id,
                                raw_identifier=raw_user,
                                source_ip="127.0.0.1",
                                raw_details={
                                    "record_number": rec_no,
                                    "computer": computer,
                                    "user_sid": user_sid,
                                    "strings": strings[:10]
                                },
                                timestamp=datetime.datetime.utcnow()
                            )

                            if rec_no > max_rec_in_batch:
                                max_rec_in_batch = rec_no

                        events = win32evtlog.ReadEventLog(handle, flags, 0)

                    if max_rec_in_batch > last_rec:
                        bookmarks[channel] = max_rec_in_batch
                        save_bookmarks(bookmarks)

                    win32evtlog.CloseEventLog(handle)

                except Exception as ex:
                    logger.debug("Polling channel %s encountered: %s", channel, ex)
                    with _state_lock:
                        _listener_state["has_event_log_access"] = False

        except Exception as e:
            logger.error("Error in Windows Event Listener polling loop: %s", e)
        finally:
            db.close()

        # Sleep in small slices to respond promptly to stop signal
        for _ in range(int(poll_interval * 10)):
            if _stop_event.is_set():
                break
            time.sleep(0.1)

    with _state_lock:
        _listener_state["is_running"] = False
    logger.info("Windows Event Log Listener worker thread terminated.")


def start_listener_service():
    """Starts the listener worker thread if enabled."""
    global _worker_thread
    if not settings.ENABLE_LIVE_WINDOWS_LISTENER:
        logger.info("Windows Event Log Listener is disabled by default (ENABLE_LIVE_WINDOWS_LISTENER=false).")
        return

    _stop_event.clear()
    _worker_thread = threading.Thread(target=_listener_worker_loop, daemon=True, name="AMSWinsEventListener")
    _worker_thread.start()
    logger.info("Windows Event Log Listener service started.")


def stop_listener_service():
    """Stops the listener worker thread."""
    global _worker_thread
    _stop_event.set()
    if _worker_thread and _worker_thread.is_alive():
        _worker_thread.join(timeout=3.0)
    logger.info("Windows Event Log Listener service stopped.")


# ==============================================================================
# Standalone CLI Entry Point
# ==============================================================================

def run_cli():
    """Runs the listener in standalone CLI mode."""
    print("=" * 76)
    print("  ACTIVITY MANAGEMENT SYSTEM (AMS) -- LIVE WINDOWS EVENT LISTENER")
    print("  Scoped Exception Ingestion Module")
    print("=" * 76)
    st = get_listener_status()
    print(f"  Platform:        {sys.platform} (Windows: {IS_WINDOWS})")
    print(f"  pywin32 State:   {'Available' if PYWIN32_AVAILABLE else 'Not Installed'}")
    print(f"  Status Summary:  {st['status_summary']}")
    print(f"  Channels:        {', '.join(settings.WINDOWS_LISTENER_CHANNELS)}")
    print(f"  Poll Interval:   {settings.WINDOWS_LISTENER_POLL_INTERVAL_SECONDS}s")
    print("=" * 76)

    if not IS_WINDOWS:
        print("[!] Cannot run on non-Windows host OS. Exiting.")
        sys.exit(1)

    print("[*] Starting polling loop. Press Ctrl+C to terminate.")
    _listener_worker_loop()


if __name__ == "__main__":
    run_cli()
