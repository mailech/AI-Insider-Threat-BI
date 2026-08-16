#!/usr/bin/env python3
"""
ITBIS — Demo Seed Data Script  (Milestone 1 — Revised)
=======================================================
Populates both databases with realistic sample data for demo / evaluation.

  PostgreSQL  — 4 platform users (one per RBAC role) + 15 monitored employees
                with full device info, OS types, access levels, and assets.
  MongoDB     — ~150 behavioural telemetry events using Milestone 1 canonical
                event types: LOGIN, FILE_DOWNLOAD, FILE_UPLOAD, DATA_TRANSFER,
                EMAIL_ACTIVITY, PRIVILEGE_CHANGE, REMOTE_ACCESS

Usage
-----
  # From the backend/ directory with the venv activated:
  python seed_data.py

Prerequisites
-------------
  - MongoDB must be running: mongodb://localhost:27017
  - Run the FastAPI app at least once (or python -m app.db.init_db) so that
    the relational DB schema (tables) exists before seeding.
  - The script is IDEMPOTENT: employees/users that already exist are skipped;
    telemetry events are always re-inserted (MongoDB append-only).

Environment Variables (read from .env or shell)
-------------------------------------------------
  DATABASE_URL   — SQLite/PostgreSQL DSN  (default: sqlite:///./sql_app.db)
  MONGO_URI      — MongoDB URI            (default: mongodb://localhost:27017)
  MONGO_DB_NAME  — MongoDB DB name        (default: itbis_logs)

Risk Category thresholds (aligned with scoring engine):
  CRITICAL : risk_score >= 0.80
  HIGH     : risk_score >= 0.60
  MEDIUM   : risk_score >= 0.30
  LOW      : risk_score <  0.30
"""

from __future__ import annotations

import asyncio
import logging
import random
import sys
from datetime import datetime, timedelta, timezone
from typing import Any

import pathlib
sys.path.insert(0, str(pathlib.Path(__file__).parent))

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import get_password_hash
from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.domain import (
    AccessLevelEnum, Asset, AssetTypeEnum,
    Employee, RiskCategoryEnum, RoleEnum, User,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(message)s",
    datefmt="%H:%M:%S",
)
log = logging.getLogger("seed")


# ── Platform Users — all 4 RBAC roles ────────────────────────────────────────
PLATFORM_USERS = [
    {
        "email":    "admin@itbis.internal",
        "password": "Admin1234!",
        "role":     RoleEnum.ADMINISTRATOR,
        "label":    "Administrator",
    },
    {
        "email":    "manager@itbis.internal",
        "password": "Manager123!",
        "role":     RoleEnum.SECURITY_MANAGER,
        "label":    "Security Manager",
    },
    {
        "email":    "soc@itbis.internal",
        "password": "SocEng123!",
        "role":     RoleEnum.SOC_ENGINEER,
        "label":    "SOC Engineer",
    },
    {
        "email":    "analyst@itbis.internal",
        "password": "Analyst123!",
        "role":     RoleEnum.SECURITY_ANALYST,
        "label":    "Security Analyst",
    },
]


# ── Employee fixture data ─────────────────────────────────────────────────────
# Covers 7 departments, 3 OS types, 3 access levels, and 4 risk bands.
# emp_id → device_id mapping kept consistent with asset pool below.
EMPLOYEES: list[dict[str, Any]] = [
    # ── CRITICAL risk (risk_score >= 0.80) ──────────────────────────────────
    {
        "emp_id": "emp_1001", "first_name": "Marcus", "last_name": "Hale",
        "department": "Finance", "designation": "Senior Accountant",
        "manager_name": "Diana Cole",
        "device_id": "ASSET-LT-001", "ip_address": "10.0.1.101", "os_type": "Windows 11",
        "access_level": AccessLevelEnum.WRITE,
        "risk_score": 0.88, "risk_category": RiskCategoryEnum.CRITICAL,
    },
    {
        "emp_id": "emp_1002", "first_name": "Priya", "last_name": "Nair",
        "department": "IT Infrastructure", "designation": "Systems Administrator",
        "manager_name": "Tom Vargas",
        "device_id": "ASSET-LT-002", "ip_address": "10.0.1.102", "os_type": "Ubuntu 22.04",
        "access_level": AccessLevelEnum.ADMIN,
        "risk_score": 0.81, "risk_category": RiskCategoryEnum.CRITICAL,
    },
    # ── HIGH risk (0.60 <= risk_score < 0.80) ───────────────────────────────
    {
        "emp_id": "emp_1003", "first_name": "Chen", "last_name": "Wei",
        "department": "Research", "designation": "Principal Engineer",
        "manager_name": "Lena Hoffman",
        "device_id": "ASSET-DT-003", "ip_address": "10.0.1.103", "os_type": "macOS 14",
        "access_level": AccessLevelEnum.WRITE,
        "risk_score": 0.74, "risk_category": RiskCategoryEnum.HIGH,
    },
    {
        "emp_id": "emp_1004", "first_name": "Amara", "last_name": "Diallo",
        "department": "Sales", "designation": "Account Executive",
        "manager_name": "Greg Patel",
        "device_id": "ASSET-LT-006", "ip_address": "10.0.2.11", "os_type": "Windows 11",
        "access_level": AccessLevelEnum.READ,
        "risk_score": 0.68, "risk_category": RiskCategoryEnum.HIGH,
    },
    {
        "emp_id": "emp_1005", "first_name": "Viktor", "last_name": "Sorokin",
        "department": "Procurement", "designation": "Procurement Analyst",
        "manager_name": "Sarah Bloom",
        "device_id": "ASSET-LT-008", "ip_address": "10.0.2.22", "os_type": "Windows 10",
        "access_level": AccessLevelEnum.WRITE,
        "risk_score": 0.62, "risk_category": RiskCategoryEnum.HIGH,
    },
    {
        "emp_id": "emp_1013", "first_name": "Daniel", "last_name": "Okonkwo",
        "department": "IT Infrastructure", "designation": "Network Engineer",
        "manager_name": "Tom Vargas",
        "device_id": "ASSET-DT-009", "ip_address": "10.0.3.99", "os_type": "Ubuntu 22.04",
        "access_level": AccessLevelEnum.ADMIN,
        "risk_score": 0.61, "risk_category": RiskCategoryEnum.HIGH,
    },
    # ── MEDIUM risk (0.30 <= risk_score < 0.60) ─────────────────────────────
    {
        "emp_id": "emp_1006", "first_name": "Sofia", "last_name": "Reyes",
        "department": "Human Resources", "designation": "HR Business Partner",
        "manager_name": "Kim Andrews",
        "device_id": "ASSET-LT-011", "ip_address": "10.0.4.11", "os_type": "Windows 11",
        "access_level": AccessLevelEnum.READ,
        "risk_score": 0.45, "risk_category": RiskCategoryEnum.MEDIUM,
    },
    {
        "emp_id": "emp_1007", "first_name": "James", "last_name": "Okafor",
        "department": "Legal", "designation": "Corporate Counsel",
        "manager_name": "Rachel Stone",
        "device_id": "ASSET-LT-013", "ip_address": "10.0.5.15", "os_type": "macOS 14",
        "access_level": AccessLevelEnum.READ,
        "risk_score": 0.38, "risk_category": RiskCategoryEnum.MEDIUM,
    },
    {
        "emp_id": "emp_1008", "first_name": "Mei", "last_name": "Zhang",
        "department": "Marketing", "designation": "Digital Marketing Spec",
        "manager_name": "Carlos Vega",
        "device_id": "ASSET-LT-015", "ip_address": "10.0.6.20", "os_type": "Windows 11",
        "access_level": AccessLevelEnum.READ,
        "risk_score": 0.32, "risk_category": RiskCategoryEnum.MEDIUM,
    },
    {
        "emp_id": "emp_1014", "first_name": "Ingrid", "last_name": "Svenson",
        "department": "Finance", "designation": "Financial Analyst",
        "manager_name": "Diana Cole",
        "device_id": "ASSET-LT-001", "ip_address": "10.0.1.105", "os_type": "Windows 10",
        "access_level": AccessLevelEnum.READ,
        "risk_score": 0.41, "risk_category": RiskCategoryEnum.MEDIUM,
    },
    {
        "emp_id": "emp_1015", "first_name": "Kwame", "last_name": "Asante",
        "department": "Research", "designation": "Data Scientist",
        "manager_name": "Lena Hoffman",
        "device_id": "ASSET-DT-003", "ip_address": "10.0.1.107", "os_type": "Ubuntu 22.04",
        "access_level": AccessLevelEnum.WRITE,
        "risk_score": 0.35, "risk_category": RiskCategoryEnum.MEDIUM,
    },
    # ── LOW risk (risk_score < 0.30) ────────────────────────────────────────
    {
        "emp_id": "emp_1009", "first_name": "Noah", "last_name": "Brennan",
        "department": "Customer Support", "designation": "Support Specialist",
        "manager_name": "Julie Park",
        "device_id": "ASSET-LT-006", "ip_address": "10.0.2.15", "os_type": "Windows 11",
        "access_level": AccessLevelEnum.READ,
        "risk_score": 0.18, "risk_category": RiskCategoryEnum.LOW,
    },
    {
        "emp_id": "emp_1010", "first_name": "Fatima", "last_name": "Al-Rashid",
        "department": "Operations", "designation": "Operations Coordinator",
        "manager_name": "Steve Morris",
        "device_id": "ASSET-LT-008", "ip_address": "10.0.2.30", "os_type": "Windows 10",
        "access_level": AccessLevelEnum.READ,
        "risk_score": 0.12, "risk_category": RiskCategoryEnum.LOW,
    },
    {
        "emp_id": "emp_1011", "first_name": "Luca", "last_name": "Ferrari",
        "department": "Finance", "designation": "Junior Accountant",
        "manager_name": "Diana Cole",
        "device_id": "ASSET-LT-015", "ip_address": "10.0.6.25", "os_type": "Windows 11",
        "access_level": AccessLevelEnum.READ,
        "risk_score": 0.08, "risk_category": RiskCategoryEnum.LOW,
    },
    {
        "emp_id": "emp_1012", "first_name": "Aisha", "last_name": "Mensah",
        "department": "Research", "designation": "Research Associate",
        "manager_name": "Lena Hoffman",
        "device_id": "ASSET-LT-013", "ip_address": "10.0.5.20", "os_type": "macOS 14",
        "access_level": AccessLevelEnum.READ,
        "risk_score": 0.05, "risk_category": RiskCategoryEnum.LOW,
    },
]


# ── Asset pool (15 unique assets aligned with employees above) ────────────────
_ASSETS_POOL = [
    ("ASSET-LT-001", AssetTypeEnum.DEVICE, "10.0.1.101", "AA:BB:CC:DD:EE:01"),
    ("ASSET-LT-002", AssetTypeEnum.DEVICE, "10.0.1.102", "AA:BB:CC:DD:EE:02"),
    ("ASSET-DT-003", AssetTypeEnum.DEVICE, "10.0.1.103", "AA:BB:CC:DD:EE:03"),
    ("ASSET-IP-004", AssetTypeEnum.IP,     "192.168.5.44",   None),
    ("ASSET-IP-005", AssetTypeEnum.IP,     "192.168.5.45",   None),
    ("ASSET-LT-006", AssetTypeEnum.DEVICE, "10.0.2.11",  "BB:CC:DD:EE:FF:06"),
    ("ASSET-IP-007", AssetTypeEnum.IP,     "172.16.0.7",     None),
    ("ASSET-LT-008", AssetTypeEnum.DEVICE, "10.0.2.22",  "BB:CC:DD:EE:FF:08"),
    ("ASSET-DT-009", AssetTypeEnum.DEVICE, "10.0.3.99",  "CC:DD:EE:FF:00:09"),
    ("ASSET-IP-010", AssetTypeEnum.IP,     "192.168.10.200", None),
    ("ASSET-LT-011", AssetTypeEnum.DEVICE, "10.0.4.11",  "DD:EE:FF:00:11:11"),
    ("ASSET-IP-012", AssetTypeEnum.IP,     "192.168.20.50",  None),
    ("ASSET-LT-013", AssetTypeEnum.DEVICE, "10.0.5.15",  "EE:FF:00:11:22:13"),
    ("ASSET-IP-014", AssetTypeEnum.IP,     "192.168.30.60",  None),
    ("ASSET-LT-015", AssetTypeEnum.DEVICE, "10.0.6.20",  "FF:00:11:22:33:15"),
]


# ── Milestone 1 canonical telemetry event pools ───────────────────────────────
# Event types: LOGIN, FILE_DOWNLOAD, FILE_UPLOAD, DATA_TRANSFER,
#              EMAIL_ACTIVITY, PRIVILEGE_CHANGE, REMOTE_ACCESS

_HIGH_RISK_EVENTS = [
    # (event_type, severity, payload)
    ("PRIVILEGE_CHANGE",  "CRITICAL", {"from_level": "READ",  "to_level": "ADMIN", "method": "sudo_abuse", "target_user": "root"}),
    ("DATA_TRANSFER",     "CRITICAL", {"bytes_transferred": 524288000, "destination": "external-ftp.badactor.net", "protocol": "FTP"}),
    ("REMOTE_ACCESS",     "HIGH",     {"method": "RDP", "source_ip": "185.220.101.47", "destination": "payroll-server", "off_hours": True}),
    ("FILE_DOWNLOAD",     "HIGH",     {"filename": "employee_records_dump.tar.gz", "size_mb": 2048, "destination": "external"}),
    ("FILE_UPLOAD",       "HIGH",     {"filename": "q3_financials_confidential.xlsx", "size_mb": 750, "service": "personal-dropbox"}),
    ("EMAIL_ACTIVITY",    "HIGH",     {"action": "FORWARD", "recipient": "personal@gmail.com", "subject": "Q3 Budget — Confidential", "attachment_count": 3}),
    ("LOGIN",             "CRITICAL", {"attempts": 50, "source_ip": "185.220.101.47", "success": False, "method": "brute_force"}),
    ("DATA_TRANSFER",     "HIGH",     {"bytes_transferred": 104857600, "destination": "unknown-cloud-storage.io", "protocol": "HTTPS"}),
    ("PRIVILEGE_CHANGE",  "HIGH",     {"from_level": "WRITE", "to_level": "ADMIN", "approved": False}),
    ("REMOTE_ACCESS",     "HIGH",     {"method": "SSH", "source_ip": "10.0.5.200", "destination": "core-db-server", "off_hours": True}),
]

_MEDIUM_RISK_EVENTS = [
    ("FILE_DOWNLOAD",     "MEDIUM", {"filename": "Q4-report.xlsx", "size_mb": 12, "source": "internal-share"}),
    ("LOGIN",             "LOW",    {"attempts": 3, "source_ip": "10.0.1.50", "success": True, "method": "password"}),
    ("EMAIL_ACTIVITY",    "LOW",    {"action": "SEND", "recipient": "colleague@corp.com", "subject": "Meeting Notes", "attachment_count": 1}),
    ("REMOTE_ACCESS",     "LOW",    {"method": "VPN", "source_ip": "192.168.1.75", "destination": "dev-server", "off_hours": False}),
    ("FILE_UPLOAD",       "MEDIUM", {"filename": "backup-archive.zip", "size_mb": 300, "service": "approved-cloud-backup"}),
    ("DATA_TRANSFER",     "MEDIUM", {"bytes_transferred": 52428800, "destination": "approved-vendor-sftp.corp", "protocol": "SFTP"}),
    ("FILE_DOWNLOAD",     "MEDIUM", {"filename": "hr-policies.pdf", "size_mb": 5, "source": "hr-portal"}),
    ("EMAIL_ACTIVITY",    "MEDIUM", {"action": "BCC", "recipient": "external-audit@partner.com", "subject": "Audit Report", "attachment_count": 2}),
    ("LOGIN",             "INFO",   {"attempts": 1, "source_ip": "10.0.2.15", "success": True, "method": "SSO"}),
    ("PRIVILEGE_CHANGE",  "INFO",   {"from_level": "READ", "to_level": "WRITE", "approved": True, "approver": "manager@corp.com"}),
]

_LOW_RISK_EVENTS = [
    ("LOGIN",             "INFO", {"attempts": 1, "source_ip": "10.0.1.10", "success": True, "method": "SSO"}),
    ("FILE_DOWNLOAD",     "INFO", {"filename": "onboarding-guide.pdf", "size_mb": 2, "source": "hr-portal"}),
    ("FILE_DOWNLOAD",     "LOW",  {"filename": "hr-handbook.pdf", "size_mb": 1, "source": "intranet"}),
    ("LOGIN",             "INFO", {"attempts": 1, "source_ip": "10.0.1.10", "success": True, "method": "SSO"}),
    ("EMAIL_ACTIVITY",    "INFO", {"action": "SEND", "recipient": "team@corp.com", "subject": "Weekly Standup Notes", "attachment_count": 0}),
    ("FILE_UPLOAD",       "INFO", {"filename": "notes.docx", "size_mb": 0.1, "service": "internal-sharepoint"}),
    ("LOGIN",             "INFO", {"attempts": 1, "source_ip": "10.0.1.10", "success": True, "method": "password"}),
    ("FILE_DOWNLOAD",     "INFO", {"filename": "company-updates-q3.pdf", "size_mb": 3, "source": "intranet"}),
    ("REMOTE_ACCESS",     "LOW",  {"method": "VPN", "source_ip": "10.0.1.10", "destination": "internal-tools", "off_hours": False}),
    ("LOGIN",             "INFO", {"attempts": 1, "source_ip": "10.0.1.10", "success": True, "method": "SSO"}),
]


def seed_postgres(db: Session) -> dict[str, int]:
    """Seed platform users, employees (with device info), and assets."""
    counts = {"users": 0, "employees": 0, "assets": 0}
    now = datetime.now(tz=timezone.utc)

    # ── Platform users — all 4 RBAC roles ────────────────────────────────────
    log.info("  Seeding platform users (4 roles)...")
    for u in PLATFORM_USERS:
        if db.query(User).filter(User.email == u["email"]).first():
            log.info("    User exists, skipping: %s", u["email"])
            continue
        db.add(User(
            email=u["email"],
            hashed_password=get_password_hash(u["password"]),
            role=u["role"],
            is_active=True,
            created_at=now,
        ))
        db.commit()
        log.info("    Created user: %-32s [%s]", u["email"], u["role"].value)
        counts["users"] += 1

    # ── Monitored employees with device info and access levels ────────────────
    log.info("  Seeding employees with device info and assets...")
    for i, emp in enumerate(EMPLOYEES):
        if db.query(Employee).filter(Employee.emp_id == emp["emp_id"]).first():
            log.info("    Employee exists, skipping: %s", emp["emp_id"])
            continue

        enrolled_at = now - timedelta(days=random.randint(30, 365))
        e = Employee(
            emp_id=emp["emp_id"],
            first_name=emp["first_name"],
            last_name=emp["last_name"],
            department=emp["department"],
            designation=emp["designation"],
            manager_name=emp.get("manager_name"),
            # Device Information (Milestone 1)
            device_id=emp.get("device_id"),
            ip_address=emp.get("ip_address"),
            os_type=emp.get("os_type"),
            # Access Privileges (Milestone 1)
            access_level=emp.get("access_level", AccessLevelEnum.READ),
            # Risk profile
            risk_score=emp.get("risk_score", 0.0),
            risk_category=emp.get("risk_category", RiskCategoryEnum.LOW),
            created_at=enrolled_at,
            updated_at=enrolled_at + timedelta(days=random.randint(1, 30)),
        )
        db.add(e)
        db.commit()
        db.refresh(e)
        log.info(
            "    Created employee: %-10s %s %-16s [%-8s] device=%-14s os=%-14s access=%s",
            e.emp_id, e.first_name, e.last_name,
            e.risk_category.value, e.device_id or "N/A",
            e.os_type or "N/A", e.access_level.value,
        )
        counts["employees"] += 1

        # Primary asset — aligned with employee's device_id
        a = _ASSETS_POOL[i % len(_ASSETS_POOL)]
        db.add(Asset(
            asset_id=a[0], asset_type=a[1],
            ip_address=a[2], mac_address=a[3],
            employee_id=e.id, created_at=now,
        ))
        counts["assets"] += 1

        # High-risk employees get a secondary asset (e.g. VPN/IP) for realism
        if emp.get("risk_score", 0) >= 0.60:
            b = _ASSETS_POOL[(i + 7) % len(_ASSETS_POOL)]
            db.add(Asset(
                asset_id=b[0] + "-B",
                asset_type=AssetTypeEnum.IP,
                ip_address=b[2], mac_address=None,
                employee_id=e.id, created_at=now,
            ))
            counts["assets"] += 1

        db.commit()

    return counts


async def seed_mongo() -> int:
    """Seed MongoDB with Milestone 1 canonical telemetry events per employee."""
    from motor.motor_asyncio import AsyncIOMotorClient
    client = AsyncIOMotorClient(settings.MONGO_URI)
    col = client[settings.MONGO_DB_NAME]["activity_logs"]
    now = datetime.now(tz=timezone.utc)
    total = 0

    for emp in EMPLOYEES:
        r = emp.get("risk_score", 0.0)
        # Select event pool based on risk band
        if r >= 0.76:
            pool = _HIGH_RISK_EVENTS
        elif r >= 0.51:
            pool = _HIGH_RISK_EVENTS[:5] + _MEDIUM_RISK_EVENTS[:5]
        elif r >= 0.26:
            pool = _MEDIUM_RISK_EVENTS
        else:
            pool = _LOW_RISK_EVENTS

        # Build 10 telemetry documents per employee using Milestone 1 event types
        docs = [
            {
                "emp_id":       emp["emp_id"],
                "event_type":   et,
                "severity":     sv,
                # Use employee's actual IP address from fixture for realism
                "source_ip":    emp.get("ip_address",
                                        f"10.{random.randint(0,5)}.{random.randint(1,254)}.{random.randint(1,254)}"),
                "device_id":    emp.get("device_id"),
                "os_type":      emp.get("os_type"),
                "access_level": emp.get("access_level", AccessLevelEnum.READ).value,
                "payload":      pl,
                "timestamp":    now - timedelta(hours=random.uniform(0.5, 23.0), minutes=j * 3),
                "ingested_at":  now,
            }
            for j, (et, sv, pl) in enumerate(pool)
        ]
        res = await col.insert_many(docs)
        total += len(res.inserted_ids)
        log.info(
            "    Inserted %2d events for %-10s [risk=%.2f] event_types=%s",
            len(res.inserted_ids),
            emp["emp_id"],
            r,
            list({d["event_type"] for d in docs}),
        )

    client.close()
    return total


async def main() -> None:
    log.info("=" * 70)
    log.info("ITBIS Demo Seed Script — Milestone 1")
    log.info("DATABASE_URL : %s", settings.DATABASE_URL)
    log.info("MONGO_URI    : %s", settings.MONGO_URI)
    log.info("=" * 70)

    log.info("\n[1/3] Initialising relational DB schema...")
    try:
        init_db()
        log.info("  Schema ready.")
    except Exception as e:
        log.error("  DB init failed: %s", e)
        sys.exit(1)

    log.info("\n[2/3] Seeding relational DB (users + employees + assets)...")
    db = SessionLocal()
    try:
        c = seed_postgres(db)
        log.info(
            "  Done — %d user(s), %d employee(s), %d asset(s) created.",
            c["users"], c["employees"], c["assets"],
        )
    except Exception as e:
        log.error("  Seed failed: %s", e)
        db.rollback()
        sys.exit(1)
    finally:
        db.close()

    log.info("\n[3/3] Seeding MongoDB (Milestone 1 canonical telemetry events)...")
    try:
        t = await seed_mongo()
        log.info("  Done — %d telemetry event(s) inserted.", t)
    except Exception as e:
        log.error("  MongoDB seed failed: %s", e)
        log.warning("  Ensure MongoDB is running at %s", settings.MONGO_URI)
        sys.exit(1)

    log.info("\n" + "=" * 70)
    log.info("Seed complete!  15 employees | 7 departments | 4 RBAC roles")
    log.info("")
    log.info("  Platform Users:")
    for u in PLATFORM_USERS:
        log.info("    %-14s  email=%-32s  password=%s", u["label"], u["email"], u["password"])
    log.info("")
    log.info("  Canonical Telemetry Event Types (Milestone 1):")
    log.info("    LOGIN | FILE_DOWNLOAD | FILE_UPLOAD | DATA_TRANSFER |")
    log.info("    EMAIL_ACTIVITY | PRIVILEGE_CHANGE | REMOTE_ACCESS")
    log.info("")
    log.info("  API docs : http://localhost:8000/api/docs")
    log.info("  Frontend : http://localhost:3000")
    log.info("=" * 70)


if __name__ == "__main__":
    asyncio.run(main())
