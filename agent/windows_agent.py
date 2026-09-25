"""
ITBIS Authorized Windows Endpoint Telemetry Collector & Log Listener.
Collects Windows Security events, running process metadata, and network connections.
Never collects passwords, keystrokes, emails, or file contents.
"""
import argparse
import csv
import io
import json
import os
import platform
import socket
import subprocess
import time
import uuid
from datetime import datetime, timezone
import requests

try:
    import psutil
    HAS_PSUTIL = True
except ImportError:
    HAS_PSUTIL = False

def iso():
    return datetime.now(timezone.utc).isoformat()

def event(event_type, **kw):
    host = socket.gethostname()
    user = os.getenv("USERNAME", "localuser")
    return {
        "event_id": f"win-{uuid.uuid4().hex[:12]}",
        "event_type": event_type,
        "source_dataset": "win_endpoint",
        "timestamp": iso(),
        "user_id": user,
        "username": user,
        "employee_id": f"EMP-{user.upper()}",
        "device_id": host,
        "device_name": host,
        "device_type": "Windows Endpoint Workstation",
        "operating_system": platform.platform(),
        **kw
    }

def collect_processes():
    out = []
    if HAS_PSUTIL:
        for p in list(psutil.process_iter(["pid", "name", "username"]))[:40]:
            try:
                out.append(event(
                    "app_launch",
                    target_resource=p.info.get("name", "app.exe"),
                    target_type="process",
                    action="launch",
                    result="SUCCESS",
                    raw_payload={"pid": p.info.get("pid"), "process": p.info.get("name"), "user": p.info.get("username")}
                ))
            except Exception:
                pass
    else:
        # Fallback to tasklist /FO CSV on Windows
        try:
            r = subprocess.run(["tasklist", "/FO", "CSV", "/NH"], capture_output=True, text=True, timeout=5)
            if r.returncode == 0 and r.stdout:
                reader = csv.reader(io.StringIO(r.stdout))
                for row in list(reader)[:40]:
                    if len(row) >= 2:
                        pname, pid = row[0], row[1]
                        out.append(event(
                            "app_launch",
                            target_resource=pname,
                            target_type="process",
                            action="launch",
                            result="SUCCESS",
                            raw_payload={"pid": pid, "process": pname}
                        ))
        except Exception:
            pass
    return out

def collect_network():
    out = []
    if HAS_PSUTIL:
        for c in psutil.net_connections(kind="inet")[:30]:
            try:
                if c.raddr:
                    out.append(event(
                        "network_connection",
                        ip_address=c.raddr.ip,
                        target_resource=f"{c.raddr.ip}:{c.raddr.port}",
                        target_type="socket",
                        action="connect",
                        result="SUCCESS",
                        raw_payload={"local_port": c.laddr.port if c.laddr else None, "remote_port": c.raddr.port, "status": c.status}
                    ))
            except Exception:
                pass
    else:
        try:
            r = subprocess.run(["netstat", "-n"], capture_output=True, text=True, timeout=5)
            if r.returncode == 0 and r.stdout:
                for line in r.stdout.splitlines()[:30]:
                    parts = line.split()
                    if len(parts) >= 4 and parts[0] == 'TCP' and parts[3] == 'ESTABLISHED':
                        remote = parts[2]
                        ip = remote.split(':')[0]
                        out.append(event(
                            "network_connection",
                            ip_address=ip,
                            target_resource=remote,
                            target_type="socket",
                            action="connect",
                            result="SUCCESS",
                            raw_payload={"connection": remote, "state": "ESTABLISHED"}
                        ))
        except Exception:
            pass
    return out

def collect_security_events():
    if platform.system() != "Windows":
        return []
    # Query Windows Security Event Log for 4624 (Logon), 4625 (Logon Failed), 4672 (Admin Privilege Assigned), 4720 (User Created), 4732 (Group Member Added)
    script = "Get-WinEvent -FilterHashtable @{LogName='Security'; Id=4624,4625,4672,4720,4732; StartTime=(Get-Date).AddMinutes(-10)} -ErrorAction SilentlyContinue | Select-Object -First 20 Id,TimeCreated,ProviderName,Message | ConvertTo-Json -Depth 3"
    try:
        r = subprocess.run(["powershell", "-NoProfile", "-Command", script], capture_output=True, text=True, timeout=10)
        if r.returncode != 0 or not r.stdout.strip():
            return []
        data = json.loads(r.stdout)
        data = data if isinstance(data, list) else [data]
        mapping = {
            4624: "logon",
            4625: "logon_failed",
            4672: "privilege_change",
            4720: "account_created",
            4732: "group_change"
        }
        out = []
        for x in data:
            eid = int(x.get("Id", 0))
            etype = mapping.get(eid, "security_event")
            out.append(event(
                etype,
                raw_event_id=str(eid),
                target_resource=f"EventID_{eid}",
                target_type="windows_security_log",
                action="audit_log",
                result="SUCCESS" if eid != 4625 else "FAILURE",
                risk_indicators=["privilege_or_account_change"] if eid in (4672, 4720, 4732) else [],
                raw_payload={"provider": x.get("ProviderName"), "message": str(x.get("Message", ""))[:500]}
            ))
        return out
    except Exception:
        return []

def main():
    ap = argparse.ArgumentParser(description="ITBIS Windows Log Listener & Endpoint Collector")
    ap.add_argument("--api", default="http://localhost:8000")
    ap.add_argument("--key", default="dev-ingestion-key")
    ap.add_argument("--agent-id", default=socket.gethostname())
    ap.add_argument("--interval", type=int, default=15)
    ap.add_argument("--once", action="store_true", help="Run once and exit")
    args = ap.parse_args()

    print("==========================================================")
    print("  ITBIS WINDOWS ENDPOINT AGENT — LOG LISTENER")
    print("==========================================================")
    print(f"Device ID:     {args.agent_id}")
    print(f"Server Target: {args.api}/api/v1/ingestion/events")
    print(f"Poll Interval: {args.interval}s")
    print("==========================================================\n")

    s = requests.Session()
    headers = {"X-API-Key": args.key}

    while True:
        try:
            evs = collect_security_events()
            proc_evs = collect_processes()
            net_evs = collect_network()
            batch = evs + proc_evs[:15] + net_evs[:10]

            if batch:
                payload = {
                    "agent_id": args.agent_id,
                    "submitted_at": iso(),
                    "events": batch
                }
                r = s.post(args.api.rstrip('/') + "/api/v1/ingestion/events", headers=headers, json=payload, timeout=15)
                if r.status_code == 200:
                    res = r.json()
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Shipped {len(batch)} telemetry events (Accepted: {res.get('accepted')}, Duplicates: {res.get('duplicates')})")
                else:
                    print(f"[{datetime.now().strftime('%H:%M:%S')}] Server returned {r.status_code}: {r.text[:120]}")
            else:
                print(f"[{datetime.now().strftime('%H:%M:%S')}] No new events to ship.")
        except Exception as exc:
            print(f"[{datetime.now().strftime('%H:%M:%S')}] Collector warning: {exc}")

        if args.once:
            break
        time.sleep(args.interval)

if __name__ == '__main__':
    main()
