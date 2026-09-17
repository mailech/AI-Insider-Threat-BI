#!/usr/bin/env python3
"""
ITBIS — Live telemetry generator (mentor requirement)

POSTs realistic benign and anomaly events to POST /api/v1/telemetry/ingest
every 2 seconds so the Next.js Telemetry Stream page (SSE) updates live.

Usage (from repo root, with backend running and seed data loaded):

    python scripts/live_log_streamer.py
    python scripts/live_log_streamer.py --interval 2 --anomaly-rate 0.25
    python scripts/live_log_streamer.py --base-url http://127.0.0.1:8000
"""

from __future__ import annotations

import argparse
import json
import random
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from typing import Any

DEFAULT_BASE_URL = "http://127.0.0.1:8000"
DEFAULT_USER = "soc@itbis.internal"
DEFAULT_PASSWORD = "SocEng123!"

BENIGN_EMPLOYEES = ["emp_1004", "emp_1005", "emp_1006", "emp_1007", "emp_1008"]
ANOMALY_EMPLOYEES = ["emp_1001", "emp_1002", "emp_1003"]

BENIGN_EVENTS: list[dict[str, Any]] = [
    {
        "event_type": "LOGIN",
        "severity": "INFO",
        "payload": {"success": True, "auth_method": "SSO_SAML", "mfa_verified": True},
    },
    {
        "event_type": "FILE_DOWNLOAD",
        "severity": "LOW",
        "payload": {"filename": "q3-status.docx", "bytes": 248_320, "action": "READ"},
    },
    {
        "event_type": "EMAIL_ACTIVITY",
        "severity": "INFO",
        "payload": {"recipients": 2, "external": False, "subject": "standup notes"},
    },
    {
        "event_type": "REMOTE_ACCESS",
        "severity": "LOW",
        "payload": {"protocol": "VPN", "hours": "business"},
    },
]

ANOMALY_EVENTS: list[dict[str, Any]] = [
    {
        "event_type": "DATA_TRANSFER",
        "severity": "CRITICAL",
        "payload": {
            "destination": "unapproved-cloud.example",
            "bytes": 21_900_000_000,
            "channel": "HTTPS",
        },
    },
    {
        "event_type": "PRIVILEGE_CHANGE",
        "severity": "HIGH",
        "payload": {"role": "cloud-admin", "approved": False},
    },
    {
        "event_type": "FILE_UPLOAD",
        "severity": "HIGH",
        "payload": {"filename": "customer-export.csv", "bytes": 4_200_000_000, "external": True},
    },
    {
        "event_type": "FILE_DOWNLOAD",
        "severity": "HIGH",
        "payload": {"filename": "source-tree.zip", "bytes": 1_850_000_000, "off_hours": True},
    },
    {
        "event_type": "REMOTE_ACCESS",
        "severity": "MEDIUM",
        "payload": {"protocol": "VPN", "hours": "03:14", "geo": "unusual"},
    },
]


def _http_json(url: str, payload: dict[str, Any], token: str | None = None, method: str = "POST") -> tuple[int, Any]:
    body = json.dumps(payload).encode("utf-8")
    headers = {"Content-Type": "application/json", "Accept": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    req = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=20) as resp:
            raw = resp.read()
            return resp.status, json.loads(raw) if raw else {}
    except urllib.error.HTTPError as exc:
        try:
            parsed = json.loads(exc.read())
        except Exception:
            parsed = {"detail": str(exc)}
        return exc.code, parsed


def login(base_url: str, username: str, password: str) -> str:
    encoded = urllib.parse.urlencode({"username": username, "password": password}).encode()
    req = urllib.request.Request(
        f"{base_url}/api/v1/auth/login",
        data=encoded,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read())
    except urllib.error.HTTPError as exc:
        raise SystemExit(f"Login failed ({exc.code}). Seed data and start the API first.") from exc
    token = data.get("access_token")
    if not token:
        raise SystemExit("Login response missing access_token.")
    return str(token)


def pick_event(anomaly_rate: float) -> tuple[str, dict[str, Any], bool]:
    is_anomaly = random.random() < anomaly_rate
    if is_anomaly:
        emp_id = random.choice(ANOMALY_EMPLOYEES)
        template = random.choice(ANOMALY_EVENTS)
    else:
        emp_id = random.choice(BENIGN_EMPLOYEES)
        template = random.choice(BENIGN_EVENTS)
    return emp_id, template, is_anomaly


def main() -> None:
    parser = argparse.ArgumentParser(description="ITBIS live telemetry POST generator")
    parser.add_argument("--base-url", default=DEFAULT_BASE_URL)
    parser.add_argument("--username", default=DEFAULT_USER)
    parser.add_argument("--password", default=DEFAULT_PASSWORD)
    parser.add_argument("--interval", type=float, default=2.0, help="Seconds between POSTs")
    parser.add_argument("--anomaly-rate", type=float, default=0.28, help="Probability of anomaly event")
    args = parser.parse_args()

    print(f"[streamer] logging in as {args.username} @ {args.base_url}")
    token = login(args.base_url.rstrip("/"), args.username, args.password)
    print("[streamer] authenticated — posting ingest events every "
          f"{args.interval}s (Ctrl+C to stop)")

    seq = 0
    try:
        while True:
            seq += 1
            emp_id, template, is_anomaly = pick_event(args.anomaly_rate)
            payload = {
                "emp_id": emp_id,
                "event_type": template["event_type"],
                "severity": template["severity"],
                "source_ip": f"10.12.{random.randint(1, 40)}.{random.randint(2, 250)}",
                "payload": {**template["payload"], "streamer_seq": seq},
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }
            code, body = _http_json(
                f"{args.base_url.rstrip('/')}/api/v1/telemetry/ingest",
                payload,
                token=token,
            )
            kind = "ANOMALY" if is_anomaly else "benign"
            score = body.get("threat_score") if isinstance(body, dict) else None
            if code in (200, 201):
                print(
                    f"[streamer] #{seq:>4} {kind:7} {emp_id} {template['event_type']:18} "
                    f"sev={template['severity']:8} score={score} http={code}"
                )
            else:
                print(f"[streamer] #{seq:>4} FAILED http={code} body={body}", file=sys.stderr)
                if code == 401:
                    token = login(args.base_url.rstrip("/"), args.username, args.password)
            time.sleep(max(0.2, args.interval))
    except KeyboardInterrupt:
        print("\n[streamer] stopped")


if __name__ == "__main__":
    main()
