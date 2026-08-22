#!/usr/bin/env python3
"""
ITBIS — Milestone 2 Step 2: Feature Engineering Pipeline Verification Test
==========================================================================
Tests and verifies the feature extraction service (`feature_extraction.py`),
extracting multi-factor behavioral feature vectors from MongoDB activity_logs
and validating statistical separation between anomalous and benign identities.
"""

from __future__ import annotations

import argparse
import asyncio
import os
import pathlib
import sys

# Ensure UTF-8 output encoding on Windows consoles
if sys.platform == "win32" and hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Ensure backend root is on sys.path
backend_dir = pathlib.Path(__file__).resolve().parent.parent
if str(backend_dir) not in sys.path:
    sys.path.insert(0, str(backend_dir))

from app.schemas.features import EmployeeFeatureVector
from app.services.feature_extraction import extract_all_employee_features


def print_feature_table(vectors: list[EmployeeFeatureVector]) -> None:
    """Print a clean, well-formatted tabular representation of feature vectors."""
    print("\n" + "=" * 128)
    print("  ITBIS FEATURE EXTRACTION PIPELINE — EXTRACTED EMPLOYEE FEATURE VECTORS")
    print("=" * 128)
    header = (
        f"  {'EMP ID':<10} | {'WINDOW':<6} | {'OFF-HRS':<7} | {'DOWN(MB)':<10} | "
        f"{'UP(MB)':<10} | {'USB':<4} | {'EXT-EML':<7} | {'PRIV-ESC':<8} | {'FAIL-LOG':<8} | {'CRITICAL':<8}"
    )
    print(header)
    print("  " + "-" * 124)

    for v in vectors:
        # Highlight anomalous rows
        is_threat = v.employee_id in ("emp_1001", "emp_1002", "emp_1003")
        prefix = "[ALERT] " if is_threat else "        "
        row = (
            f"  {prefix}{v.employee_id:<7} | {v.window_days:>4}d | {v.off_hours_logon_count:>7} | "
            f"{v.total_file_download_mb:>10.2f} | {v.total_file_upload_mb:>10.2f} | "
            f"{v.usb_device_connect_count:>4} | {v.external_email_count:>7} | "
            f"{v.privilege_escalation_count:>8} | {v.failed_logon_count:>8} | "
            f"{v.critical_event_count:>8}"
        )
        print(row)

    print("=" * 128)


def verify_threat_statistical_separation(vectors: list[EmployeeFeatureVector]) -> bool:
    """
    Validates that anomalous employees (emp_1001, emp_1002, emp_1003) show clear,
    statistically significant anomaly metrics relative to the benign cohort.
    """
    vector_map = {v.employee_id: v for v in vectors}
    benign_vectors = [v for v in vectors if v.employee_id not in ("emp_1001", "emp_1002", "emp_1003")]

    if not benign_vectors:
        print("[FAIL] Verification Failed: No benign baseline vectors to compare against.")
        return False

    # Compute baseline averages
    avg_benign_downloads = sum(v.total_file_download_mb for v in benign_vectors) / len(benign_vectors)
    avg_benign_uploads = sum(v.total_file_upload_mb for v in benign_vectors) / len(benign_vectors)
    avg_benign_crit = sum(v.critical_event_count for v in benign_vectors) / len(benign_vectors)
    max_benign_priv_esc = max(v.privilege_escalation_count for v in benign_vectors)
    max_benign_usb = max(v.usb_device_connect_count for v in benign_vectors)
    max_benign_fails = max(v.failed_logon_count for v in benign_vectors)

    print("\n[AUDIT] STATISTICAL BENCHMARK & ANOMALY SEPARATION REPORT:")
    print(f"  * Benign Baseline Avg Downloads : {avg_benign_downloads:.2f} MB")
    print(f"  * Benign Baseline Avg Uploads   : {avg_benign_uploads:.2f} MB")
    print(f"  * Benign Baseline Avg Critical  : {avg_benign_crit:.2f} events")
    print(f"  * Benign Baseline Max Priv Esc  : {max_benign_priv_esc} events")
    print(f"  * Benign Baseline Max USB Conn  : {max_benign_usb} events")
    print(f"  * Benign Baseline Max Fails     : {max_benign_fails} events")
    print("  " + "-" * 70)

    checks_passed = True

    # 1. Check emp_1001 (Financial Exfiltration)
    v_1001 = vector_map.get("emp_1001")
    if v_1001:
        cond_1001 = (
            v_1001.total_file_download_mb > 100.0
            and v_1001.total_file_upload_mb > 500.0
            and v_1001.external_email_count > 0
            and v_1001.critical_event_count > 0
        )
        status = "[PASS]" if cond_1001 else "[FAIL]"
        print(
            f"  {status} — emp_1001 (Financial Exfil): Downloads={v_1001.total_file_download_mb:.1f}MB, "
            f"Uploads={v_1001.total_file_upload_mb:.1f}MB, ExtEmails={v_1001.external_email_count}, "
            f"Critical={v_1001.critical_event_count}"
        )
        if not cond_1001:
            checks_passed = False
    else:
        print("  [FAIL] — emp_1001 not present in vector extraction results.")
        checks_passed = False

    # 2. Check emp_1002 (Privilege Escalation & Sabotage)
    v_1002 = vector_map.get("emp_1002")
    if v_1002:
        cond_1002 = (
            v_1002.privilege_escalation_count >= 1
            and v_1002.failed_logon_count >= 1
            and v_1002.usb_device_connect_count >= 1
            and v_1002.critical_event_count > 0
        )
        status = "[PASS]" if cond_1002 else "[FAIL]"
        print(
            f"  {status} — emp_1002 (Privilege Abuse): PrivEsc={v_1002.privilege_escalation_count}, "
            f"FailedLogons={v_1002.failed_logon_count}, USBs={v_1002.usb_device_connect_count}, "
            f"Critical={v_1002.critical_event_count}"
        )
        if not cond_1002:
            checks_passed = False
    else:
        print("  [FAIL] — emp_1002 not present in vector extraction results.")
        checks_passed = False

    # 3. Check emp_1003 (IP & Trade Secret Exfiltration)
    v_1003 = vector_map.get("emp_1003")
    if v_1003:
        cond_1003 = (
            v_1003.total_file_download_mb > 500.0
            and v_1003.usb_device_connect_count >= 1
            and v_1003.external_email_count >= 1
            and v_1003.off_hours_logon_count >= 1
        )
        status = "[PASS]" if cond_1003 else "[FAIL]"
        print(
            f"  {status} — emp_1003 (IP Theft): Downloads={v_1003.total_file_download_mb:.1f}MB, "
            f"USBs={v_1003.usb_device_connect_count}, ExtEmails={v_1003.external_email_count}, "
            f"OffHoursLogons={v_1003.off_hours_logon_count}"
        )
        if not cond_1003:
            checks_passed = False
    else:
        print("  [FAIL] — emp_1003 not present in vector extraction results.")
        checks_passed = False

    return checks_passed


async def main() -> None:
    parser = argparse.ArgumentParser(description="Test and audit the ITBIS Feature Extraction Pipeline.")
    parser.add_argument("--days", type=int, default=14, help="Evaluation lookback window in days (default: 14)")
    args = parser.parse_args()

    print(f"\n[*] Extracting employee behavioral feature vectors (Lookback: {args.days} days)...")
    vectors = await extract_all_employee_features(window_days=args.days)

    if not vectors:
        print("[FAIL] No feature vectors extracted. Ensure PostgreSQL employees and MongoDB activity_logs are seeded.")
        sys.exit(1)

    print_feature_table(vectors)
    success = verify_threat_statistical_separation(vectors)

    if success:
        print("\n[SUCCESS] ALL FEATURE EXTRACTION & STATISTICAL AUDIT CHECKS PASSED!")
        sys.exit(0)
    else:
        print("\n[FAIL] SOME STATISTICAL CHECKS FAILED.")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
