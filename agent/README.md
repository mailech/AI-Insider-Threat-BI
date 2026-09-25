# ITBIS Windows Endpoint Agent

A lightweight Windows service that collects security-relevant activity from
the host and ships it to the ITBIS server as `CanonicalEvent` documents over
HTTPS.

The agent is a **collector**, not a detection engine. All intelligence
(anomaly detection, risk scoring, alerting) remains server-side.

## Architecture

```
Windows Event Sources
        ↓
Collectors (Windows Security, Process, USB)
        ↓
Event Normalization → CanonicalEvent
        ↓
Local Persistent Queue (SQLite)
        ↓
Batching + HTTPS Upload (with retry / backoff)
        ↓
ITBIS Server  /api/v1/ingestion/events
        ↓
Canonical Events (MongoDB)
```

The agent is **independent of the FastAPI server implementation**. It carries
its own copy of the `CanonicalEvent` Pydantic schema and never imports from
`backend/app/*`.

## Requirements

| Requirement | Why |
|---|---|
| Windows 10/11 or Server 2016+ | The Security event log and WMI collectors |
| Python 3.11+ | Runtime |
| **Administrator rights** | The Windows Security log is not readable by an unprivileged process |
| Network access to the ITBIS server | Event upload |

Without Administrator rights the `windows_security` collector logs an error
at startup and disables itself for that run. The agent keeps running so the
`process` and `usb` collectors still work, but no logon events are collected.

## Install

```bash
pip install -e .[windows]   # production install on Windows
pip install -e .[dev]       # development install (tests, lint)
```

## Enroll the device

Each machine gets its own credential. Enrollment is done **once per device**
by someone with the `agents:manage` permission (an ADMIN), against the
server:

```bash
curl -X POST https://itbis.example.com/api/v1/agents/enroll \
  -H "Authorization: Bearer <admin-access-token>" \
  -H "Content-Type: application/json" \
  -d '{"device_id": "WS-001", "device_name": "Workstation 001"}'
```

The response contains the key **once** — it is stored only as a hash and
cannot be retrieved later:

```json
{
  "device": { "device_id": "WS-001", "is_active": true, ... },
  "api_key": "itbis_ag_<reference>_<secret>",
  "warning": "Copy this key into the agent's config now — it will not be shown again."
}
```

Put that value in `server.api_key` (or `ITBIS_AGENT_SERVER_API_KEY`). The key
does not expire, is scoped to the enrolled `device_id`, and grants only event
ingestion — nothing else in the API.

### Managing enrolled devices

```bash
# List every enrolled device (no secrets are returned)
GET    /api/v1/agents

# Revoke one machine — other devices are unaffected
DELETE /api/v1/agents/WS-001

# Issue a fresh key (e.g. the old one leaked); invalidates the previous key
POST   /api/v1/agents/WS-001/rotate
```

A device's key only works for the `device_id` it was enrolled under: a batch
claiming a different `agent_id` is rejected with 403.

## Configure

Copy [`config.example.yaml`](config.example.yaml) — it documents every
setting — to `config.yaml` and fill in the marked values. The minimum:

```yaml
agent:
  device_id: "WS-001"          # must match the enrolled device_id
  device_name: "Workstation 001"
  source_dataset: "win_endpoint"

server:
  base_url: "https://itbis.example.com"
  api_key: "itbis_ag_..."      # from enrollment above
  events_path: "/api/v1/ingestion/events"

queue:
  db_path: "C:\\ProgramData\\ITBIS\\agent.db"
```

Any scalar can be overridden by an environment variable named
`ITBIS_AGENT_<SECTION>_<KEY>`, which is the easiest way to keep the
credential out of the config file:

```powershell
$env:ITBIS_AGENT_SERVER_API_KEY = "itbis_ag_..."
```

## Run

```bash
# From an ELEVATED terminal (required for the Security event log)
itbis-agent --config config.yaml

# Or purely from environment variables
itbis-agent
```

### Queue maintenance

```bash
# Show local buffer counts
itbis-agent --config config.yaml --queue-stats

# Return dead-lettered events to the queue after fixing the cause
itbis-agent --config config.yaml --requeue-dead
```

## Reliability behaviour

Events are written to the local SQLite queue **before** any upload is
attempted and are removed only once the server acknowledges them, so the
agent tolerates reboots and network outages without losing data.

| Failure | Behaviour |
|---|---|
| Network error, timeout, 5xx, 429 | Retried with exponential backoff, up to `upload.max_retries`, then dead-lettered |
| 401 / 403 (credential rejected) | **Retried indefinitely** at max backoff; does *not* consume the retry budget. Events are retained until a valid key is in place |
| 400 / 422 (malformed batch) | Dead-lettered immediately — retrying will never help |

Dead-lettered events are recoverable with `--requeue-dead`; they are never
deleted.

> **Startup policy — live monitoring only.** On its first poll the
> `windows_security` collector records the newest event-log record number and
> collects nothing older. This avoids flooding the server with history on
> every restart. Events generated from that point on are collected normally.

## Testing

```bash
pytest tests/                  # full suite
pytest tests/unit/             # unit only
pytest tests/integration/      # integration only (uses a fake server)
```

The tests use `respx` to mock the HTTP transport and an in-memory SQLite
queue. They do **not** require a running ITBIS server or Windows.

## What is collected

| Collector | Events | Notes |
|---|---|---|
| `windows_security` | Logon / failed logon / logoff (4624, 4625, 4634, 4647) | Service, batch and machine-account logons are dropped unless `include_system_activity: true` |
| `windows_security` | Account created / enabled / disabled / deleted, password change / reset (4720, 4722-4726) | Attributed to the account that made the change |
| `windows_security` | Security group membership added / removed (4728/4729, 4732/4733, 4756/4757) | Membership of Administrators, Remote Desktop Users, Domain Admins, etc. is a `privilege_change` with a risk indicator |
| `windows_security` | User right assigned / removed (4704, 4705) | Sensitive rights (e.g. `SeDebugPrivilege`) are flagged |
| `windows_security` | Remote Desktop logon (logon type 10) and session reconnect / disconnect (4778, 4779) | Tagged `remote_access`; local "Console" session switches are ignored |
| `process` | Process launches, with the real owning user | Launches by SYSTEM / service accounts are dropped by default |
| `usb` | Removable drive inserted / removed | Drives that report as fixed disks are logged as ignored, not dropped silently |
| `removable_files` | Files created (`file_copy`), changed (`file_write`), deleted or renamed on a removable drive, plus one `data_transfer` per scan with bytes and file count | Snapshot scans every 5 s, so the drive can still be safely ejected. Copying a file *off* a drive is not visible |
| `downloads` | Internet downloads into the user's Downloads folder (`file_download`) | Requires a Mark-of-the-Web; records the source URL and flags executables. The agent must run as the user |
| `network` | New TCP connections (`network_connection`) with the owning process and user | Polled every 15 s; loopback and SYSTEM-owned traffic dropped. TCP only, no byte counts |

Not collected: email (needs a mail-server connection), uploads through a browser, per-process network byte volumes, and files copied *off* a removable drive.

## Audit policy

Windows only writes some Security events when the matching audit subcategory
is enabled. Check the current policy from an Administrator PowerShell:

```powershell
auditpol /get /category:"Logon/Logoff","Account Management","Policy Change"
```

| Agent events | Audit subcategory |
|---|---|
| 4624, 4625 | Logon |
| 4634, 4647 | Logoff |
| 4778, 4779 | Other Logon/Logoff Events |
| 4720, 4722-4726 | User Account Management |
| 4728/4729, 4732/4733, 4756/4757 | Security Group Management |
| 4704, 4705 | Authorization Policy Change |

Enable any that show "No Auditing":

```powershell
auditpol /set /subcategory:"Logon" /success:enable /failure:enable
auditpol /set /subcategory:"Logoff" /success:enable
auditpol /set /subcategory:"Other Logon/Logoff Events" /success:enable
auditpol /set /subcategory:"User Account Management" /success:enable /failure:enable
auditpol /set /subcategory:"Security Group Management" /success:enable
auditpol /set /subcategory:"Authorization Policy Change" /success:enable
```

Subcategory names are localised on non-English Windows. Note also that
**Windows Home editions cannot accept Remote Desktop connections**, so RDP
logons and session reconnect/disconnect events only occur on Pro, Enterprise
and Server machines.

## Known limitations

- The agent must be started manually from an elevated terminal; there is no
  Windows service wrapper or installer yet, so it does not survive a logoff.
- `user_id` is taken verbatim from the Windows account name in the event
  (e.g. `CORP\jsmith`); there is no mapping to ITBIS user records.
- WMI polls process creation every 2 seconds, so processes that start and
  exit faster than that can be missed.
