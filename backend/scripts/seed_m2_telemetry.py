#!/usr/bin/env python3
"""
ITBIS — Milestone 2 Step 1: CERT/CMU-Aligned Telemetry Generator & Seeder
=======================================================================
Generates and seeds high-fidelity behavioral telemetry activity logs into MongoDB
(`activity_logs` collection) adhering to canonical event schemas from CERT, LANL,
and CMU Insider Threat Test Datasets.

Features & Standards:
---------------------
1. Canonical CERT/CMU Event Categories:
   - LOGON / LOGOFF    : Standard working hours vs off-hours/weekend logons, failed attempts.
   - DEVICE            : USB connect/disconnect, removable storage access, burst copying.
   - FILE_DOWNLOAD /
     FILE_UPLOAD       : High-volume exfiltration, sensitive document access, cloud syncs.
   - EMAIL_ACTIVITY    : External webmail recipients, confidential attachments, frequency spikes.
   - PRIVILEGE_CHANGE  : Admin/root escalation attempts, sudo abuse, unauthorized role grants.

2. Identity Mapping:
   - Maps 100% directly to existing active PostgreSQL employee records (`emp_1001` - `emp_1015`).
   - Does NOT purge or alter PostgreSQL employee identity or asset records.

3. Statistical Patterns & Threat Personas:
   - Suspicious / High-Risk (emp_1001, emp_1002, emp_1003):
       * emp_1001 (Marcus Hale - Finance)       : Financial Exfiltration (Mass unreleased financials download, personal cloud sync, external webmail).
       * emp_1002 (Priya Nair - SysAdmin)       : Privilege Escalation & Sabotage (Sudo abuse, unauthorized root escalation, USB bursts, failed logins).
       * emp_1003 (Chen Wei - R&D Lead)         : Intellectual Property Exfiltration (Trade secrets/source code dump, USB copying, off-hours weekend logins).
   - Baseline / Normal Employees (emp_1004 - emp_1015):
       * Consistent 08:30-17:30 Monday-Friday work hours, routine SSO logins, standard document access, internal-only emails.

4. Time Series & Timezones:
   - Multi-day realistic behavioral distribution (past 14 days up to now).
   - All timestamps stored as UTC ISODate datetime objects (`datetime.now(timezone.utc)`).

5. Idempotency:
   - Targets and refreshes only the `CERT_CMU_M2` seed records, allowing safe re-execution without duplicate accumulation.

Usage:
------
    # From the backend/ directory with the venv activated:
    python scripts/seed_m2_telemetry.py
"""

from __future__ import annotations

import argparse
import asyncio
import hashlib
import logging
import os
import pathlib
import random
import sys
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, List, Tuple

# Ensure backend root is on sys.path
backend_dir = pathlib.Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from motor.motor_asyncio import AsyncIOMotorClient
from sqlalchemy.orm import Session

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.domain import AccessLevelEnum, Employee

# ── Logging Configuration ─────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger("m2_seeder")

COLLECTION_NAME = "activity_logs"
DATASET_TAG = "CERT_CMU_M2"

# ─────────────────────────────────────────────────────────────────────────────
# Helper Generators for Hashes, IPs, and Realistic Artifacts
# ─────────────────────────────────────────────────────────────────────────────

def _generate_sha256(seed_str: str) -> str:
    """Generate deterministic SHA256 hex string for realistic file telemetry."""
    return hashlib.sha256(seed_str.encode("utf-8")).hexdigest()

EXTERNAL_SUSPICIOUS_IPS = [
    "185.220.101.47",  # Known TOR Exit node
    "45.33.32.156",    # External VPS / Proxy
    "194.26.29.112",   # Uncategorized foreign ASN
    "91.240.118.89",   # Commercial VPN Endpoint
]

EXTERNAL_WEBMAIL_DOMAINS = [
    "gmail.com",
    "proton.me",
    "countermail.com",
    "foxmail.com",
    "tutanota.com",
]

# ─────────────────────────────────────────────────────────────────────────────
# Threat Persona Generators
# ─────────────────────────────────────────────────────────────────────────────

def generate_emp1001_financial_exfil_events(
    emp: Employee,
    base_time: datetime,
    days_back: int = 14,
) -> List[Dict[str, Any]]:
    """
    Scenario 1: Marcus Hale (emp_1001) - Senior Accountant / Finance.
    Threat Profile: CRITICAL - Financial Data Exfiltration.
    Behaviors:
      - Repeated off-hours logins (01:30 - 04:00 AM) from external IP.
      - Downloading large proprietary quarterly financials & salary spreadsheets.
      - Uploading compressed multi-part archives to personal cloud storage.
      - Emailing confidential earnings forecasts with sensitive attachments to personal webmail.
    """
    events: List[Dict[str, Any]] = []
    emp_ip = emp.ip_address or "10.0.1.101"
    device_id = emp.device_id or "ASSET-LT-001"
    os_type = emp.os_type or "Windows 11"

    # 1. Normal daytime baseline activity
    for d in range(days_back, 0, -1):
        day_date = base_time - timedelta(days=d)
        if day_date.weekday() < 5:  # Weekday
            # Morning logon
            t_logon = day_date.replace(hour=8, minute=random.randint(40, 58), second=random.randint(10, 50), microsecond=0)
            events.append({
                "emp_id": emp.emp_id,
                "employee_db_id": emp.id,
                "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "event_type": "LOGON",
                "severity": "INFO",
                "source_ip": emp_ip,
                "device_id": device_id,
                "os_type": os_type,
                "access_level": emp.access_level.value,
                "payload": {
                    "activity": "Logon",
                    "logon_type": "Interactive",
                    "auth_method": "SSO",
                    "work_hours": True,
                    "status": "SUCCESS",
                    "hostname": "FIN-WKS-1001",
                    "domain": "CORP.ITBIS.INTERNAL",
                },
                "timestamp": t_logon,
            })
            # Routine internal financial file operations
            t_file = day_date.replace(hour=random.randint(10, 16), minute=random.randint(10, 50), second=random.randint(10, 50), microsecond=0)
            events.append({
                "emp_id": emp.emp_id,
                "employee_db_id": emp.id,
                "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "event_type": "FILE_DOWNLOAD",
                "severity": "LOW",
                "source_ip": emp_ip,
                "device_id": device_id,
                "os_type": os_type,
                "access_level": emp.access_level.value,
                "payload": {
                    "filename": f"monthly_ledger_reconciliation_d{d}.xlsx",
                    "file_path": "S:\\Finance\\GeneralLedger\\2026\\",
                    "file_extension": "xlsx",
                    "file_size_bytes": 1024 * random.randint(400, 1200),
                    "size_mb": round(random.uniform(0.4, 1.2), 2),
                    "classification": "INTERNAL",
                    "transfer_destination": "LOCAL_DISK",
                    "action": "READ",
                    "sha256_hash": _generate_sha256(f"emp1001_routine_{d}"),
                },
                "timestamp": t_file,
            })
            # Evening logoff
            t_logoff = day_date.replace(hour=17, minute=random.randint(15, 45), second=random.randint(10, 50), microsecond=0)
            events.append({
                "emp_id": emp.emp_id,
                "employee_db_id": emp.id,
                "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "event_type": "LOGOFF",
                "severity": "INFO",
                "source_ip": emp_ip,
                "device_id": device_id,
                "os_type": os_type,
                "access_level": emp.access_level.value,
                "payload": {
                    "activity": "Logoff",
                    "logon_type": "Interactive",
                    "work_hours": True,
                    "status": "SUCCESS",
                    "hostname": "FIN-WKS-1001",
                },
                "timestamp": t_logoff,
            })

    # 2. Anomalous Exfiltration Campaigns (Spanning past 3 nights and previous weekend)
    campaign_days = [1, 2, 5, 8]
    for cd in campaign_days:
        night_time = base_time - timedelta(days=cd)
        foreign_ip = EXTERNAL_SUSPICIOUS_IPS[0]

        # Off-hours Remote Logon at 02:15 AM
        t_off_logon = night_time.replace(hour=2, minute=15 + random.randint(0, 10), second=random.randint(10, 55), microsecond=0)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
            "event_type": "LOGON",
            "severity": "HIGH",
            "source_ip": foreign_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "activity": "Logon",
                "logon_type": "RemoteInteractive",
                "auth_method": "Password",
                "work_hours": False,
                "status": "SUCCESS",
                "hostname": "FIN-WKS-1001",
                "remote_gateway": "vpn.itbis.corp:443",
                "geo_location": "Anomalous ASN (TOR Exit)",
            },
            "timestamp": t_off_logon,
        })

        # Massive restricted document downloads
        files = [
            ("q3_preliminary_earnings_unreleased.xlsx", 850, "RESTRICTED"),
            ("executive_payroll_all_staff_2026.csv", 450, "RESTRICTED"),
            ("merger_acquisition_term_sheet_confidential.pdf", 120, "RESTRICTED"),
            ("q4_tax_evasion_audit_findings_internal.docx", 65, "RESTRICTED"),
        ]
        for f_idx, (fname, fsize_mb, cl) in enumerate(files):
            t_down = t_off_logon + timedelta(minutes=4 + f_idx * 3)
            events.append({
                "emp_id": emp.emp_id,
                "employee_db_id": emp.id,
                "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "event_type": "FILE_DOWNLOAD",
                "severity": "CRITICAL" if cl == "RESTRICTED" else "HIGH",
                "source_ip": foreign_ip,
                "device_id": device_id,
                "os_type": os_type,
                "access_level": emp.access_level.value,
                "payload": {
                    "filename": fname,
                    "file_path": f"S:\\Finance\\ExecutiveVault\\{fname}",
                    "file_extension": fname.split(".")[-1],
                    "file_size_bytes": fsize_mb * 1024 * 1024,
                    "size_mb": fsize_mb,
                    "classification": cl,
                    "transfer_destination": "LOCAL_TEMP_STAGING",
                    "action": "DOWNLOAD",
                    "is_bulk_operation": True,
                    "sha256_hash": _generate_sha256(f"emp1001_{fname}_{cd}"),
                },
                "timestamp": t_down,
            })

        # Large File Upload to Personal Cloud / Megaupload
        t_up = t_off_logon + timedelta(minutes=22)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
            "event_type": "FILE_UPLOAD",
            "severity": "CRITICAL",
            "source_ip": foreign_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "filename": f"finance_dump_encrypted_p{cd}.7z",
                "file_extension": "7z",
                "file_size_bytes": 1450 * 1024 * 1024,
                "size_mb": 1450,
                "classification": "RESTRICTED",
                "transfer_destination": "PERSONAL_DROPBOX",
                "service_url": "https://content.dropboxapi.com/2/files/upload",
                "action": "UPLOAD",
                "is_encrypted_archive": True,
                "sha256_hash": _generate_sha256(f"emp1001_archive_{cd}"),
            },
            "timestamp": t_up,
        })

        # Email Exfiltration with Confidential Attachments
        t_email = t_off_logon + timedelta(minutes=30)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
            "event_type": "EMAIL_ACTIVITY",
            "severity": "CRITICAL",
            "source_ip": foreign_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "sender": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "recipients": ["marcus.hale.personal@proton.me", "whistleblower_tip@countermail.com"],
                "recipient_count": 2,
                "external_recipient": True,
                "subject": "Fwd: Q3 Executive Financials & Term Sheets (Encrypted)",
                "attachment_count": 3,
                "attachments": [
                    {"filename": "q3_preliminary_earnings_unreleased.xlsx", "size_kb": 850 * 1024},
                    {"filename": "executive_payroll_all_staff_2026.csv", "size_kb": 450 * 1024},
                ],
                "size_bytes": 1300 * 1024 * 1024,
                "is_bcc_exfiltration": True,
                "has_sensitive_keywords": True,
            },
            "timestamp": t_email,
        })

        # Off-hours logoff
        t_off_logoff = t_off_logon + timedelta(minutes=45)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
            "event_type": "LOGOFF",
            "severity": "INFO",
            "source_ip": foreign_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "activity": "Logoff",
                "logon_type": "RemoteInteractive",
                "work_hours": False,
                "status": "SUCCESS",
                "session_duration_minutes": 45,
            },
            "timestamp": t_off_logoff,
        })

    return events


def generate_emp1002_privilege_escalation_events(
    emp: Employee,
    base_time: datetime,
    days_back: int = 14,
) -> List[Dict[str, Any]]:
    """
    Scenario 2: Priya Nair (emp_1002) - Systems Administrator / IT Infrastructure.
    Threat Profile: CRITICAL - Privilege Escalation & Rogue Admin Sabotage.
    Behaviors:
      - Repeated off-hours failed root authentications and credential brute-forcing.
      - Unauthorized privilege escalation (sudo abuse, pam bypass, shadow file tampering).
      - Burst of unauthorized high-capacity USB hardware connections.
      - Mass export of Active Directory database and system security hashes.
    """
    events: List[Dict[str, Any]] = []
    emp_ip = emp.ip_address or "10.0.1.102"
    device_id = emp.device_id or "ASSET-LT-002"
    os_type = emp.os_type or "Ubuntu 22.04"

    # 1. Daytime administration tasks (baseline IT work)
    for d in range(days_back, 0, -1):
        day_date = base_time - timedelta(days=d)
        if day_date.weekday() < 5:
            t_logon = day_date.replace(hour=8, minute=random.randint(15, 30), second=random.randint(10, 50), microsecond=0)
            events.append({
                "emp_id": emp.emp_id,
                "employee_db_id": emp.id,
                "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "event_type": "LOGON",
                "severity": "INFO",
                "source_ip": emp_ip,
                "device_id": device_id,
                "os_type": os_type,
                "access_level": emp.access_level.value,
                "payload": {
                    "activity": "Logon",
                    "logon_type": "Interactive",
                    "auth_method": "SSH_KEY",
                    "work_hours": True,
                    "status": "SUCCESS",
                    "hostname": "INFRA-ADM-002",
                },
                "timestamp": t_logon,
            })
            # Routine scheduled IT change
            t_priv = day_date.replace(hour=11, minute=random.randint(10, 50), second=random.randint(10, 50), microsecond=0)
            events.append({
                "emp_id": emp.emp_id,
                "employee_db_id": emp.id,
                "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "event_type": "PRIVILEGE_CHANGE",
                "severity": "LOW",
                "source_ip": emp_ip,
                "device_id": device_id,
                "os_type": os_type,
                "access_level": emp.access_level.value,
                "payload": {
                    "target_user": "svc_maintenance",
                    "action": "SCHEDULED_ROLE_CHECK",
                    "from_level": "ADMIN",
                    "to_level": "ADMIN",
                    "method": "approved_workflow",
                    "approved": True,
                    "approver": "tom.vargas@itbis.com",
                },
                "timestamp": t_priv,
            })

    # 2. Rogue Escalation & USB Bursts (Past 4 nights)
    attack_days = [1, 3, 6, 9]
    for ad in attack_days:
        night_time = base_time - timedelta(days=ad)
        src_ip = EXTERNAL_SUSPICIOUS_IPS[1]

        # Brute-force failed logons
        for fail_idx in range(5):
            t_fail = night_time.replace(hour=1, minute=10 + fail_idx * 2, second=random.randint(5, 55), microsecond=0)
            events.append({
                "emp_id": emp.emp_id,
                "employee_db_id": emp.id,
                "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "event_type": "LOGON",
                "severity": "HIGH",
                "source_ip": src_ip,
                "device_id": device_id,
                "os_type": os_type,
                "access_level": emp.access_level.value,
                "payload": {
                    "activity": "Logon",
                    "logon_type": "RemoteInteractive",
                    "auth_method": "Password",
                    "work_hours": False,
                    "status": "FAILED",
                    "failure_reason": "Invalid credentials or token lockout",
                    "target_account": "root",
                    "attempt_number": fail_idx + 1,
                },
                "timestamp": t_fail,
            })

        # Successful privilege escalation via sudo abuse
        t_esc = night_time.replace(hour=1, minute=25, second=random.randint(10, 50), microsecond=0)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
            "event_type": "PRIVILEGE_CHANGE",
            "severity": "CRITICAL",
            "source_ip": src_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "target_user": "root",
                "action": "ELEVATE_TO_ADMIN",
                "from_level": "ADMIN",
                "to_level": "ROOT_OVERRIDE",
                "method": "sudo_abuse",
                "command": "sudo -u root /bin/bash -c 'chmod +s /bin/dash; cat /etc/shadow'",
                "approved": False,
                "approver": None,
                "alert_triggered": "UNAUTHORIZED_SUDO_ESCALATION",
            },
            "timestamp": t_esc,
        })

        # Unapproved USB Hardware Connect Burst
        t_usb_connect = t_esc + timedelta(minutes=4)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
            "event_type": "DEVICE",
            "severity": "CRITICAL",
            "source_ip": emp_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "activity": "Connect",
                "device_type": "USB_STORAGE",
                "vendor_id": "Corsair",
                "product_id": "Flash Survivor Stealth 256GB",
                "serial_number": f"SN-CORSAIR-{ad}9842",
                "volume_label": "EXT_EXFIL_SYS",
                "capacity_mb": 262144,
                "read_only": False,
                "files_copied_count": 48,
            },
            "timestamp": t_usb_connect,
        })

        # Dumping sensitive Active Directory & security hashes to USB
        t_dump = t_usb_connect + timedelta(minutes=6)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
            "event_type": "FILE_DOWNLOAD",
            "severity": "CRITICAL",
            "source_ip": emp_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "filename": "ntds_active_directory_full_dump.dit",
                "file_path": "/var/backups/activedirectory/ntds.dit",
                "file_extension": "dit",
                "file_size_bytes": 4200 * 1024 * 1024,
                "size_mb": 4200,
                "classification": "RESTRICTED",
                "transfer_destination": "USB_DRIVE",
                "action": "COPY",
                "sha256_hash": _generate_sha256(f"emp1002_ntds_{ad}"),
            },
            "timestamp": t_dump,
        })

        # USB Disconnect
        t_usb_disc = t_dump + timedelta(minutes=10)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
            "event_type": "DEVICE",
            "severity": "HIGH",
            "source_ip": emp_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "activity": "Disconnect",
                "device_type": "USB_STORAGE",
                "vendor_id": "Corsair",
                "product_id": "Flash Survivor Stealth 256GB",
                "serial_number": f"SN-CORSAIR-{ad}9842",
                "total_bytes_transferred_mb": 4200,
            },
            "timestamp": t_usb_disc,
        })

    return events


def generate_emp1003_ip_theft_events(
    emp: Employee,
    base_time: datetime,
    days_back: int = 14,
) -> List[Dict[str, Any]]:
    """
    Scenario 3: Chen Wei (emp_1003) - Principal Engineer / Research.
    Threat Profile: HIGH - Intellectual Property / Trade Secrets Theft.
    Behaviors:
      - Weekend and late-night access (23:30 - 03:00) to core proprietary codebases.
      - Mass tar.gz codebase compression and downloads.
      - Connecting unapproved Kingston USB stick and copying research data.
      - Emailing proprietary algorithmic research to competitor / external personal email.
    """
    events: List[Dict[str, Any]] = []
    emp_ip = emp.ip_address or "10.0.1.103"
    device_id = emp.device_id or "ASSET-DT-003"
    os_type = emp.os_type or "macOS 14"

    # 1. Normal daytime research activity
    for d in range(days_back, 0, -1):
        day_date = base_time - timedelta(days=d)
        if day_date.weekday() < 5:
            t_logon = day_date.replace(hour=9, minute=random.randint(0, 20), second=random.randint(10, 50), microsecond=0)
            events.append({
                "emp_id": emp.emp_id,
                "employee_db_id": emp.id,
                "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "event_type": "LOGON",
                "severity": "INFO",
                "source_ip": emp_ip,
                "device_id": device_id,
                "os_type": os_type,
                "access_level": emp.access_level.value,
                "payload": {
                    "activity": "Logon",
                    "logon_type": "Interactive",
                    "auth_method": "SSO",
                    "work_hours": True,
                    "status": "SUCCESS",
                    "hostname": "RND-MAC-1003",
                },
                "timestamp": t_logon,
            })
            # Routine code check-in
            t_code = day_date.replace(hour=14, minute=random.randint(10, 50), second=random.randint(10, 50), microsecond=0)
            events.append({
                "emp_id": emp.emp_id,
                "employee_db_id": emp.id,
                "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "event_type": "FILE_DOWNLOAD",
                "severity": "LOW",
                "source_ip": emp_ip,
                "device_id": device_id,
                "os_type": os_type,
                "access_level": emp.access_level.value,
                "payload": {
                    "filename": "neural_net_experiment_benchmark.ipynb",
                    "file_path": "/Users/chenwei/repo/experiments/",
                    "file_extension": "ipynb",
                    "file_size_bytes": 1024 * random.randint(200, 800),
                    "size_mb": 0.5,
                    "classification": "INTERNAL",
                    "transfer_destination": "LOCAL_WORKSPACE",
                    "action": "READ",
                    "sha256_hash": _generate_sha256(f"emp1003_routine_{d}"),
                },
                "timestamp": t_code,
            })

    # 2. IP Theft Bursts (Weekends and late evenings)
    burst_days = [2, 4, 7, 12]
    for bd in burst_days:
        night_time = base_time - timedelta(days=bd)

        # Off-hours weekend logon at 23:45
        t_off_logon = night_time.replace(hour=23, minute=45, second=random.randint(10, 50), microsecond=0)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
            "event_type": "LOGON",
            "severity": "MEDIUM",
            "source_ip": emp_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "activity": "Logon",
                "logon_type": "Interactive",
                "auth_method": "Password",
                "work_hours": False,
                "status": "SUCCESS",
                "hostname": "RND-MAC-1003",
            },
            "timestamp": t_off_logon,
        })

        # Mass Intellectual Property Codebase Archive Download
        ip_archives = [
            ("quantum_ai_core_engine_src_v4.tar.gz", 3100, "RESTRICTED"),
            ("patent_pending_nn_weights_fp16.bin", 4800, "RESTRICTED"),
            ("nextgen_hardware_schematics.step", 650, "CONFIDENTIAL"),
        ]
        for a_idx, (aname, asize_mb, cl) in enumerate(ip_archives):
            t_down = t_off_logon + timedelta(minutes=5 + a_idx * 4)
            events.append({
                "emp_id": emp.emp_id,
                "employee_db_id": emp.id,
                "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "event_type": "FILE_DOWNLOAD",
                "severity": "HIGH",
                "source_ip": emp_ip,
                "device_id": device_id,
                "os_type": os_type,
                "access_level": emp.access_level.value,
                "payload": {
                    "filename": aname,
                    "file_path": f"/Volumes/SecureResearchVault/{aname}",
                    "file_extension": aname.split(".")[-1],
                    "file_size_bytes": asize_mb * 1024 * 1024,
                    "size_mb": asize_mb,
                    "classification": cl,
                    "transfer_destination": "USB_REMOVABLE",
                    "action": "DOWNLOAD",
                    "sha256_hash": _generate_sha256(f"emp1003_{aname}_{bd}"),
                },
                "timestamp": t_down,
            })

        # USB Device Connect & Copy
        t_usb = t_off_logon + timedelta(minutes=20)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
            "event_type": "DEVICE",
            "severity": "HIGH",
            "source_ip": emp_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "activity": "Connect",
                "device_type": "USB_STORAGE",
                "vendor_id": "Kingston",
                "product_id": "DataTraveler Max 128GB",
                "serial_number": f"SN-KINGSTON-DT-{bd}12",
                "volume_label": "RESEARCH_BACKUP",
                "capacity_mb": 131072,
                "read_only": False,
                "files_copied_count": 32,
            },
            "timestamp": t_usb,
        })

        # External Email Activity to Personal / External Research Contact
        t_mail = t_off_logon + timedelta(minutes=32)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
            "event_type": "EMAIL_ACTIVITY",
            "severity": "HIGH",
            "source_ip": emp_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "sender": f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com",
                "recipients": ["chen.wei.personal@foxmail.com", "cwei_research@gmail.com"],
                "recipient_count": 2,
                "external_recipient": True,
                "subject": "Fwd: Core Model Architecture & Schematics [CONFIDENTIAL]",
                "attachment_count": 2,
                "attachments": [
                    {"filename": "nextgen_hardware_schematics.step", "size_kb": 650 * 1024},
                ],
                "size_bytes": 680 * 1024 * 1024,
                "is_bcc_exfiltration": False,
                "has_sensitive_keywords": True,
            },
            "timestamp": t_mail,
        })

    return events


def generate_baseline_employee_events(
    emp: Employee,
    base_time: datetime,
    days_back: int = 14,
) -> List[Dict[str, Any]]:
    """
    Scenario: Normal Baseline Employee (emp_1004 through emp_1015, and any others).
    Threat Profile: LOW / BENIGN.
    Behaviors:
      - 100% standard business hours (08:30 - 17:30 Monday-Friday).
      - Morning SSO Logon, Evening Logoff.
      - Small internal document downloads/uploads (< 10 MB, Word/Excel/PDF).
      - Internal company email communications only (@itbis.com).
      - Zero or minimal routine read-only USB events.
      - Zero unauthorized privilege escalation attempts.
    """
    events: List[Dict[str, Any]] = []
    emp_ip = emp.ip_address or f"10.0.{random.randint(2, 6)}.{random.randint(10, 240)}"
    device_id = emp.device_id or f"ASSET-LT-{emp.emp_id}"
    os_type = emp.os_type or "Windows 11"
    email = f"{emp.first_name.lower()}.{emp.last_name.lower()}@itbis.com"

    # Routine documents by department
    dept_docs = {
        "Sales": ["client_proposal_draft.docx", "q3_sales_pipeline.xlsx", "customer_case_study.pdf"],
        "Human Resources": ["employee_handbook_2026.pdf", "benefits_overview.pdf", "recruitment_tracker.xlsx"],
        "Procurement": ["vendor_quote_request.docx", "purchase_order_summary.xlsx", "equipment_inventory.xlsx"],
        "Legal": ["standard_nda_template.docx", "compliance_checklist.pdf", "vendor_terms_and_conditions.pdf"],
        "Marketing": ["q3_campaign_assets.zip", "brand_guidelines.pdf", "social_media_schedule.xlsx"],
        "Customer Support": ["support_ticket_escalations.xlsx", "troubleshooting_guide.pdf", "kb_article_draft.docx"],
        "Operations": ["facility_maintenance_schedule.xlsx", "weekly_shift_roster.xlsx", "vendor_deliveries.pdf"],
        "Finance": ["expense_report_august.xlsx", "travel_reimbursement.xlsx", "budget_planning_notes.docx"],
        "Research": ["research_paper_draft.pdf", "literature_review_summary.docx", "dataset_citation.txt"],
        "IT Infrastructure": ["network_switch_config_backup.txt", "patch_tuesday_notes.pdf", "dns_record_update.txt"],
    }
    sample_files = dept_docs.get(emp.department, ["weekly_status_report.docx", "team_notes.xlsx", "training_guide.pdf"])

    for d in range(days_back, 0, -1):
        day_date = base_time - timedelta(days=d)
        if day_date.weekday() >= 5:
            continue  # Baseline employees do not work on weekends

        # 1. Morning SSO Logon (08:30 - 09:15)
        t_logon = day_date.replace(
            hour=8,
            minute=random.randint(30, 58),
            second=random.randint(10, 50),
            microsecond=0,
        )
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": email,
            "event_type": "LOGON",
            "severity": "INFO",
            "source_ip": emp_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "activity": "Logon",
                "logon_type": "Interactive",
                "auth_method": "SSO",
                "work_hours": True,
                "status": "SUCCESS",
                "hostname": f"CORP-PC-{emp.emp_id.upper()}",
            },
            "timestamp": t_logon,
        })

        # 2. Midday Document Download (Internal sharepoint / intranet)
        t_file_down = day_date.replace(
            hour=random.randint(10, 12),
            minute=random.randint(10, 50),
            second=random.randint(10, 50),
            microsecond=0,
        )
        chosen_file = random.choice(sample_files)
        file_size_kb = random.randint(150, 4500)
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": email,
            "event_type": "FILE_DOWNLOAD",
            "severity": "INFO",
            "source_ip": emp_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "filename": chosen_file,
                "file_path": f"https://sharepoint.itbis.corp/teams/{emp.department.lower()}/{chosen_file}",
                "file_extension": chosen_file.split(".")[-1],
                "file_size_bytes": file_size_kb * 1024,
                "size_mb": round(file_size_kb / 1024, 2),
                "classification": "INTERNAL",
                "transfer_destination": "LOCAL_DISK",
                "action": "DOWNLOAD",
                "sha256_hash": _generate_sha256(f"{emp.emp_id}_{chosen_file}_{d}"),
            },
            "timestamp": t_file_down,
        })

        # 3. Afternoon Internal Email Communication
        t_email = day_date.replace(
            hour=random.randint(13, 15),
            minute=random.randint(10, 50),
            second=random.randint(10, 50),
            microsecond=0,
        )
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": email,
            "event_type": "EMAIL_ACTIVITY",
            "severity": "INFO",
            "source_ip": emp_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "sender": email,
                "recipients": [f"{emp.manager_name.lower().replace(' ', '.')}@itbis.com" if emp.manager_name else "team@itbis.com"],
                "recipient_count": 1,
                "external_recipient": False,
                "subject": f"Update: {chosen_file.split('.')[0].replace('_', ' ').title()}",
                "attachment_count": 1 if random.random() > 0.5 else 0,
                "attachments": [{"filename": chosen_file, "size_kb": file_size_kb}] if random.random() > 0.5 else [],
                "size_bytes": file_size_kb * 1024,
                "is_bcc_exfiltration": False,
                "has_sensitive_keywords": False,
            },
            "timestamp": t_email,
        })

        # 4. Occasional afternoon upload (e.g. saving finished report to internal sharepoint)
        if random.random() > 0.4:
            t_file_up = day_date.replace(
                hour=random.randint(15, 16),
                minute=random.randint(10, 50),
                second=random.randint(10, 50),
                microsecond=0,
            )
            events.append({
                "emp_id": emp.emp_id,
                "employee_db_id": emp.id,
                "email": email,
                "event_type": "FILE_UPLOAD",
                "severity": "INFO",
                "source_ip": emp_ip,
                "device_id": device_id,
                "os_type": os_type,
                "access_level": emp.access_level.value,
                "payload": {
                    "filename": f"reviewed_{chosen_file}",
                    "file_extension": chosen_file.split(".")[-1],
                    "file_size_bytes": file_size_kb * 1024,
                    "size_mb": round(file_size_kb / 1024, 2),
                    "classification": "INTERNAL",
                    "transfer_destination": "INTERNAL_SHAREPOINT",
                    "action": "UPLOAD",
                    "sha256_hash": _generate_sha256(f"{emp.emp_id}_reviewed_{d}"),
                },
                "timestamp": t_file_up,
            })

        # 5. Evening Logoff (17:05 - 17:45)
        t_logoff = day_date.replace(
            hour=17,
            minute=random.randint(5, 45),
            second=random.randint(10, 50),
            microsecond=0,
        )
        events.append({
            "emp_id": emp.emp_id,
            "employee_db_id": emp.id,
            "email": email,
            "event_type": "LOGOFF",
            "severity": "INFO",
            "source_ip": emp_ip,
            "device_id": device_id,
            "os_type": os_type,
            "access_level": emp.access_level.value,
            "payload": {
                "activity": "Logoff",
                "logon_type": "Interactive",
                "work_hours": True,
                "status": "SUCCESS",
                "hostname": f"CORP-PC-{emp.emp_id.upper()}",
            },
            "timestamp": t_logoff,
        })

    return events


# ─────────────────────────────────────────────────────────────────────────────
# Seeder Engine (Idempotent Orchestrator)
# ─────────────────────────────────────────────────────────────────────────────

async def seed_m2_telemetry(days_back: int = 14, clean_all: bool = False) -> Dict[str, Any]:
    """
    Main seeding engine:
    1. Connects to PostgreSQL to read existing active employees (emp_1001 to emp_1015).
    2. Generates canonical CERT/CMU events with statistical patterns.
    3. Cleans previous M2 seed logs in MongoDB for idempotency.
    4. Inserts all generated documents in batches.
    5. Returns audit statistics.
    """
    now_utc = datetime.now(timezone.utc)
    logger.info("=" * 75)
    logger.info("ITBIS Milestone 2 - Step 1: CERT/CMU-Aligned Telemetry Seeder")
    logger.info("Database Target: MongoDB @ %s [%s.%s]", settings.MONGO_URI, settings.MONGO_DB_NAME, COLLECTION_NAME)
    logger.info("Evaluation Time Horizon: Past %d days (until %s)", days_back, now_utc.strftime('%Y-%m-%d %H:%M:%S UTC'))
    logger.info("=" * 75)

    # 1. Fetch active employees from PostgreSQL
    db: Session = SessionLocal()
    try:
        employees: List[Employee] = db.query(Employee).order_by(Employee.id.asc()).all()
        if not employees:
            logger.error("❌ No employees found in PostgreSQL! Please run `python seed_data.py` first.")
            return {"status": "error", "message": "No employees in PostgreSQL"}
        logger.info("✔ Resolved %d employee records from PostgreSQL.", len(employees))
    finally:
        db.close()

    # 2. Build canonical CERT/CMU telemetry events per employee
    all_documents: List[Dict[str, Any]] = []
    emp_stats: Dict[str, Dict[str, Any]] = {}
    category_counts: Dict[str, int] = {
        "LOGON": 0,
        "LOGOFF": 0,
        "DEVICE": 0,
        "FILE_DOWNLOAD": 0,
        "FILE_UPLOAD": 0,
        "EMAIL_ACTIVITY": 0,
        "PRIVILEGE_CHANGE": 0,
    }
    severity_counts: Dict[str, int] = {
        "CRITICAL": 0,
        "HIGH": 0,
        "MEDIUM": 0,
        "LOW": 0,
        "INFO": 0,
    }

    for emp in employees:
        emp_id = emp.emp_id
        if emp_id == "emp_1001":
            emp_events = generate_emp1001_financial_exfil_events(emp, now_utc, days_back=days_back)
            persona = "CRITICAL: Financial Exfiltration (Off-hours logins, restricted data exfil)"
        elif emp_id == "emp_1002":
            emp_events = generate_emp1002_privilege_escalation_events(emp, now_utc, days_back=days_back)
            persona = "CRITICAL: Privilege Escalation & Sabotage (Sudo abuse, USB bursts)"
        elif emp_id == "emp_1003":
            emp_events = generate_emp1003_ip_theft_events(emp, now_utc, days_back=days_back)
            persona = "HIGH: Trade Secret Exfiltration (Mass codebase dump, USB copy)"
        else:
            emp_events = generate_baseline_employee_events(emp, now_utc, days_back=days_back)
            persona = "BENIGN: Standard Baseline (9-to-5 workday, routine tasks)"

        # Append metadata and ensure UTC ISODate formatting
        for ev in emp_events:
            ev["dataset"] = DATASET_TAG
            ev["is_m2_seed"] = True
            ev["ingested_at"] = now_utc

            # Ensure event_type exists in category stats
            et = ev.get("event_type", "UNKNOWN")
            category_counts[et] = category_counts.get(et, 0) + 1

            # Ensure severity exists in severity stats
            sv = ev.get("severity", "INFO")
            severity_counts[sv] = severity_counts.get(sv, 0) + 1

        all_documents.extend(emp_events)
        emp_stats[emp_id] = {
            "name": f"{emp.first_name} {emp.last_name}",
            "department": emp.department,
            "persona": persona,
            "event_count": len(emp_events),
            "critical_count": sum(1 for e in emp_events if e.get("severity") == "CRITICAL"),
            "high_count": sum(1 for e in emp_events if e.get("severity") == "HIGH"),
        }

    # 3. Connect to MongoDB and apply idempotent insertion
    client = AsyncIOMotorClient(settings.MONGO_URI, serverSelectionTimeoutMS=5000)
    try:
        mongo_db = client[settings.MONGO_DB_NAME]
        col = mongo_db[COLLECTION_NAME]

        # Verify MongoDB connectivity
        await client.admin.command("ping")
        logger.info("✔ Successfully connected to MongoDB.")

        # Idempotent cleanup: Delete previous M2 seeded documents
        delete_query = {"dataset": DATASET_TAG} if not clean_all else {}
        del_res = await col.delete_many(delete_query)
        logger.info("✔ Idempotency Check: Removed %d existing M2 telemetry records.", del_res.deleted_count)

        # Batch insert generated telemetry
        if all_documents:
            # Sort chronologically before inserting
            all_documents.sort(key=lambda x: x["timestamp"])
            ins_res = await col.insert_many(all_documents)
            logger.info("✔ Inserted %d high-fidelity CERT/CMU telemetry documents into '%s'.", len(ins_res.inserted_ids), COLLECTION_NAME)

        # Create optimal indexes for high-speed queries if not present
        await col.create_index([("emp_id", 1), ("timestamp", -1)])
        await col.create_index([("event_type", 1), ("severity", 1)])
        await col.create_index([("dataset", 1)])
        logger.info("✔ Verified compound MongoDB indexes on (emp_id, timestamp) and (event_type, severity).")

    except Exception as exc:
        logger.error("❌ MongoDB operation failed: %s", exc)
        raise
    finally:
        client.close()

    # 4. Render clean CLI console reports
    logger.info("\n" + "=" * 75)
    logger.info("TELEMETRY SEEDING AUDIT REPORT")
    logger.info("=" * 75)
    logger.info("📊 EVENT BREAKDOWN BY CANONICAL CATEGORY:")
    for cat, count in category_counts.items():
        bar = "█" * min(30, int(count / max(1, max(category_counts.values())) * 30))
        logger.info("  %-18s : %5d events  %s", cat, count, bar)

    logger.info("\n🚨 EVENT BREAKDOWN BY SEVERITY TIER:")
    for sev, count in severity_counts.items():
        logger.info("  %-18s : %5d events", sev, count)

    logger.info("\n👥 PER-EMPLOYEE BEHAVIORAL PROFILE SUMMARY:")
    logger.info("  %-10s | %-20s | %-16s | %-6s | %-8s | %s", "Emp ID", "Employee Name", "Department", "Events", "High/Crit", "Behavioral Persona")
    logger.info("  " + "-" * 105)
    for emp_id, st in emp_stats.items():
        logger.info(
            "  %-10s | %-20s | %-16s | %6d | %8d | %s",
            emp_id,
            st["name"],
            st["department"],
            st["event_count"],
            st["critical_count"] + st["high_count"],
            st["persona"],
        )

    logger.info("=" * 75)
    logger.info("✅ Milestone 2 Step 1 Seeding Successfully Completed!")
    logger.info("Total Events Seeded: %d across %d employees", len(all_documents), len(employees))
    logger.info("=" * 75)

    return {
        "status": "success",
        "total_seeded": len(all_documents),
        "category_counts": category_counts,
        "severity_counts": severity_counts,
        "employee_stats": emp_stats,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Seed CERT/CMU-aligned telemetry data into MongoDB for ITBIS.")
    parser.add_argument("--days", type=int, default=14, help="Number of historical days to simulate (default: 14)")
    parser.add_argument("--clean-all", action="store_true", help="Purge all records in activity_logs before seeding")
    return parser.parse_args()


if __name__ == "__main__":
    args = parse_args()
    asyncio.run(seed_m2_telemetry(days_back=args.days, clean_all=args.clean_all))
