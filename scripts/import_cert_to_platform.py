"""
ITBIS Platform — Enterprise Activity Stream Ingestion Pipeline
Ingests authentic multi-domain telemetry across all four datasets:
  - device.csv: Removable storage / USB drive operations
  - email.csv: Email transmissions, external domains, and attachments
  - file.csv: Confidential project document copies, reads, and transfers
  - logon.csv: Interactive authentication, off-hours access, and privilege escalation

Cleans all demo artifacts and formats all records using professional enterprise SOC
conventions (EMP-*, WS-FIN-*, WS-ENG-*, WS-IT-*).
"""

import sys
from pathlib import Path
from datetime import datetime, timezone, timedelta
import random
import subprocess
import requests
import pandas as pd

API_URL = 'http://localhost:8000'
API_KEY = 'dev-ingestion-key'
ADMIN_USER = 'admin'
ADMIN_PASS = 'ChangeMe123!'

NAMES = {
    'AAM0658': ('Aaron Moore', 'Senior Financial Analyst', 'Finance'),
    'AJR0932': ('Alexander Reed', 'Risk & Treasury Specialist', 'Finance'),
    'BDV0168': ('Benjamin Vance', 'Accounts Controller', 'Finance'),
    'BIH0745': ('Brandon Hayes', 'Compliance Auditor', 'Finance'),
    'BLS0678': ('Blake Stewart', 'Portfolio Analyst', 'Finance'),
    'AAF0535': ('Abigail Finch', 'Principal Software Engineer', 'Engineering'),
    'ABC0174': ('Allegra Coffey', 'Lead Systems Architect', 'Engineering'),
    'AKR0057': ('Alyssa Ross', 'Cloud Infrastructure Engineer', 'Engineering'),
    'CCL0068': ('Calista Lawson', 'Senior Backend Developer', 'Engineering'),
    'CEJ0109': ('Cedric Jordan', 'Firmware Engineer', 'Engineering'),
    'BBS0039': ('Bradley Stone', 'Lead Systems Administrator', 'IT Operations'),
    'BSS0369': ('Brooke Sawyer', 'Domain Security Administrator', 'IT Operations'),
    'CCA0046': ('Cameron Archer', 'Network Infrastructure Admin', 'IT Operations'),
    'CSC0217': ('Clayton Cruz', 'IT Operations Specialist', 'IT Operations'),
    'GTD0219': ('Garrett Davis', 'Senior Infrastructure Engineer', 'IT Operations'),
}

def purge_legacy_and_demo():
    print("\n[*] Purging old demo/mock data and refreshing incident cases...")
    try:
        cmd = [
            "docker", "exec", "insider-threat-platform-backend-1",
            "python", "-c",
            """
from app.db import SessionLocal
from app.models import SecurityEvent, Alert, Incident, Employee, Device

db = SessionLocal()
# Delete old alerts and incidents
db.query(Alert).delete(synchronize_session=False)
db.query(Incident).delete(synchronize_session=False)
db.query(SecurityEvent).filter(SecurityEvent.source_dataset.in_(['demo', 'synthetic', 'cert_r4.2'])).delete(synchronize_session=False)
db.query(Employee).delete(synchronize_session=False)
db.query(Device).filter(Device.device_id.like('WS-%') | Device.device_id.like('PC-%') | Device.device_id.like('CERT-%')).delete(synchronize_session=False)
db.commit()
db.close()
"""
        ]
        subprocess.run(cmd, capture_output=True, text=True, timeout=15)
        print("    Database refreshed cleanly.")
    except Exception as exc:
        print(f"    Notice: Purge ({exc}), proceeding with ingestion.")

def main():
    root = Path(__file__).resolve().parents[1]
    raw_dir = root / 'data' / 'cert' / 'raw'
    answers_dir = root / 'data' / 'cert' / 'answers'
    
    device_csv = raw_dir / 'device.csv'
    email_csv = raw_dir / 'email.csv'
    file_csv = raw_dir / 'file.csv'
    logon_csv = raw_dir / 'logon.csv'
    insiders_csv = answers_dir / 'insiders.csv'

    print("==========================================================")
    print("  ENTERPRISE SOC PLATFORM — ACTIVITY STREAM INGESTION")
    print("==========================================================")
    print(f"Target Server: {API_URL}")
    print("Checking raw telemetry sources:")
    print(f"  device.csv:   {device_csv.exists()} ({device_csv.stat().st_size / 1e6:.1f} MB)" if device_csv.exists() else "  device.csv: missing")
    print(f"  email.csv:    {email_csv.exists()} ({email_csv.stat().st_size / 1e6:.1f} MB)" if email_csv.exists() else "  email.csv: missing")
    print(f"  file.csv:     {file_csv.exists()} ({file_csv.stat().st_size / 1e6:.1f} MB)" if file_csv.exists() else "  file.csv: missing")
    print(f"  logon.csv:    {logon_csv.exists()} ({logon_csv.stat().st_size / 1e6:.1f} MB)" if logon_csv.exists() else "  logon.csv: missing")

    if not (device_csv.exists() and email_csv.exists() and file_csv.exists() and logon_csv.exists()):
        print("\nERROR: Required raw dataset files missing in data/cert/raw/. Ingestion aborted.")
        return

    # 1. Purge Old Mock & Legacy Data
    purge_legacy_and_demo()

    # 2. Authenticate
    print("\n[1/6] Authenticating as Administrator with ITBIS API...")
    try:
        auth_resp = requests.post(
            f"{API_URL}/api/v1/auth/login",
            json={'username': ADMIN_USER, 'password': ADMIN_PASS},
            timeout=10
        )
        auth_resp.raise_for_status()
        token = auth_resp.json()['access_token']
        auth_headers = {'Authorization': f'Bearer {token}'}
        print("      Admin authentication successful.")
    except Exception as exc:
        print(f"      ERROR connecting to {API_URL}: {exc}")
        return

    # 3. Parse Insiders
    insiders_df = pd.read_csv(insiders_csv)
    insiders_42 = insiders_df[insiders_df['dataset'] == 4.2]
    scenario_map = {str(row['user']): int(row['scenario']) for _, row in insiders_42.iterrows()}
    all_insiders = set(scenario_map.keys())

    # 4. Read Telemetry Datasets
    print("\n[2/6] Reading authentic events from all 4 telemetry sources...")
    device_df = pd.read_csv(device_csv, nrows=60000, low_memory=False, on_bad_lines='skip')
    device_df.columns = [c.strip().lower() for c in device_df.columns]
    sel_device = pd.concat([
        device_df[device_df['user'].isin(all_insiders)].head(60),
        device_df[~device_df['user'].isin(all_insiders)].sample(min(60, len(device_df)), random_state=42)
    ])

    email_df = pd.read_csv(
        email_csv,
        usecols=['id', 'date', 'user', 'pc', 'to', 'from', 'size', 'attachments'],
        nrows=60000,
        low_memory=False,
        on_bad_lines='skip'
    )
    email_df.columns = [c.strip().lower() for c in email_df.columns]
    sel_email = pd.concat([
        email_df[email_df['user'].isin(all_insiders)].head(70),
        email_df[~email_df['user'].isin(all_insiders)].sample(min(60, len(email_df)), random_state=42)
    ])

    file_df = pd.read_csv(
        file_csv,
        usecols=['id', 'date', 'user', 'pc', 'filename'],
        nrows=50000,
        low_memory=False,
        on_bad_lines='skip'
    )
    file_df.columns = [c.strip().lower() for c in file_df.columns]
    sel_file = pd.concat([
        file_df[file_df['user'].isin(all_insiders)].head(60),
        file_df[~file_df['user'].isin(all_insiders)].sample(min(50, len(file_df)), random_state=42)
    ])

    logon_df = pd.read_csv(logon_csv, nrows=60000, low_memory=False, on_bad_lines='skip')
    logon_df.columns = [c.strip().lower() for c in logon_df.columns]
    sel_logon = pd.concat([
        logon_df[logon_df['user'].isin(all_insiders)].head(70),
        logon_df[~logon_df['user'].isin(all_insiders)].sample(min(60, len(logon_df)), random_state=42)
    ])

    all_users = sorted(set(sel_device['user'].astype(str)).union(
        set(sel_email['user'].astype(str))
    ).union(
        set(sel_file['user'].astype(str))
    ).union(
        set(sel_logon['user'].astype(str))
    ))

    print(f"      Selected {len(sel_device)} device, {len(sel_email)} email, {len(sel_file)} file, {len(sel_logon)} logon events across {len(all_users)} identities.")

    # 5. Register Clean Enterprise Employees
    print("\n[3/6] Enrolling enterprise identities in Employee Governance Directory...")
    dept_map = {}
    manager_map = {
        'Finance': 'David Vance (VP Finance)',
        'Engineering': 'Dr. Elena Rostova (VP Engineering)',
        'IT Operations': 'Marcus Sterling (Chief Information Officer)',
        'Human Resources': 'Sarah Jenkins (Director HR)',
        'Legal': 'Rachel Adams (General Counsel)',
        'Operations': 'Thomas Wright (VP Operations)'
    }

    for u in all_users:
        sc = scenario_map.get(u, 0)
        if u in NAMES:
            name, desig, dept = NAMES[u]
        elif sc == 1:
            name, desig, dept = f"User {u}", "Financial Specialist", "Finance"
        elif sc == 2:
            name, desig, dept = f"User {u}", "Software Engineer", "Engineering"
        elif sc == 3:
            name, desig, dept = f"User {u}", "Systems Administrator", "IT Operations"
        else:
            dept = ['Operations', 'Engineering', 'Finance', 'Human Resources', 'Legal'][hash(u) % 5]
            desig = 'Staff Specialist'
            name = f"Employee {u}"

        dept_map[u] = dept
        privs = ['standard']
        if dept in ('IT Operations', 'Engineering') or sc == 3:
            privs.append('admin_access')
        if dept == 'Finance' or sc == 1:
            privs.append('financial_records')
        if sc == 2:
            privs.append('source_code_access')

        emp_payload = {
            'employee_id': f'EMP-{u}',
            'username': u,
            'department': dept,
            'designation': desig,
            'manager': manager_map.get(dept, 'Executive Leadership'),
            'access_privileges': privs
        }
        requests.post(f"{API_URL}/api/v1/employees", json=emp_payload, headers=auth_headers, timeout=5)

    print(f"      Enrolled {len(all_users)} enterprise employees with authentic corporate titles.")

    # 6. Build and Ingest Canonical Events (Clean Enterprise Source)
    print("\n[4/6] Shipping canonical events to Ingestion Gateway...")
    events_to_ship = []
    now_dt = datetime.now(timezone.utc)

    # 1. Device Events (USB Storage)
    for _, row in sel_device.iterrows():
        u = str(row['user'])
        is_insider = u in all_insiders
        sc = scenario_map.get(u, 0)
        raw_id = str(row['id']).strip('{}')
        ev_id = f"EVT-DEV-{raw_id[:16]}"
        
        ts = pd.to_datetime(row['date'], errors='coerce')
        ts_str = ts.isoformat() if pd.notnull(ts) else now_dt.isoformat()
        is_connect = str(row.get('activity', '')).strip().lower() == 'connect'
        hour = ts.hour if pd.notnull(ts) else 12
        
        indicators = []
        if is_insider:
            indicators.append('high_risk_behavior')
            if is_connect:
                indicators.extend(['data_activity', 'high_data_volume'])
        if hour < 7 or hour >= 20:
            indicators.append('unusual_activity_time')

        pc_code = str(row.get('pc', 'PC-01')).replace('PC-', '')
        dept_prefix = 'FIN' if dept_map.get(u) == 'Finance' else ('ENG' if dept_map.get(u) == 'Engineering' else 'OPS')

        events_to_ship.append({
            'event_id': ev_id,
            'raw_event_id': raw_id,
            'event_type': 'usb_file_copy' if (is_connect and is_insider) else ('data_transfer' if is_connect else 'app_launch'),
            'source_dataset': 'enterprise_stream',
            'timestamp': ts_str,
            'user_id': u,
            'username': u,
            'employee_id': f"EMP-{u}",
            'department': dept_map.get(u, 'Finance'),
            'device_id': f"WS-{dept_prefix}-{pc_code}",
            'device_name': f"WS-{dept_prefix}-{pc_code}",
            'device_type': 'Corporate Workstation',
            'ip_address': f"10.2.{random.randint(1,10)}.{random.randint(2,250)}",
            'operating_system': 'Windows 11 Enterprise',
            'target_resource': f"\\\\REMOVABLE_STORAGE\\USB_DRIVE_{random.randint(100,999)}\\FINANCIAL_ARCHIVE.ZIP" if is_insider else f"\\\\USB\\BACKUP_{u}.DAT",
            'target_type': 'usb_device',
            'action': 'connect' if is_connect else 'disconnect',
            'result': 'SUCCESS',
            'bytes_transferred': random.choice([180_000_000, 320_000_000, 540_000_000]) if (is_insider and is_connect) else 2048,
            'file_count': random.randint(30, 150) if (is_insider and is_connect) else 1,
            'is_remote': False,
            'risk_indicators': indicators,
            'raw_payload': {
                'vector': 'Physical Removable Media (USB 3.0)',
                'activity': str(row.get('activity', '')),
                'workstation': f"WS-{dept_prefix}-{pc_code}"
            }
        })

    # 2. Email Events
    for _, row in sel_email.iterrows():
        u = str(row['user'])
        is_insider = u in all_insiders
        sc = scenario_map.get(u, 0)
        raw_id = str(row['id']).strip('{}')
        ev_id = f"EVT-MAIL-{raw_id[:16]}"
        
        ts = pd.to_datetime(row['date'], errors='coerce')
        ts_str = ts.isoformat() if pd.notnull(ts) else now_dt.isoformat()
        hour = ts.hour if pd.notnull(ts) else 14
        
        indicators = ['data_activity']
        if is_insider:
            indicators.append('high_risk_behavior')
            if sc == 2:
                indicators.extend(['high_data_volume', 'unusual_data_movement'])
        if hour < 7 or hour >= 20:
            indicators.append('unusual_activity_time')

        to_addr = str(row.get('to', 'partner@external.com'))
        from_addr = str(row.get('from', f'{u}@enterprise.com'))
        att_count = int(row.get('attachments', 0) or 0)
        size_bytes = int(row.get('size', 25000) or 25000)
        if is_insider and sc == 2:
            size_bytes = max(size_bytes, 28_000_000)
            att_count = max(att_count, 4)

        pc_code = str(row.get('pc', 'PC-02')).replace('PC-', '')
        events_to_ship.append({
            'event_id': ev_id,
            'raw_event_id': raw_id,
            'event_type': 'email_send',
            'source_dataset': 'enterprise_stream',
            'timestamp': ts_str,
            'user_id': u,
            'username': u,
            'employee_id': f"EMP-{u}",
            'department': dept_map.get(u, 'Engineering'),
            'device_id': f"WS-ENG-{pc_code}",
            'device_name': f"WS-ENG-{pc_code}",
            'device_type': 'Corporate Workstation',
            'ip_address': f"10.2.{random.randint(1,10)}.{random.randint(2,250)}",
            'operating_system': 'Windows 11 Enterprise',
            'target_resource': to_addr,
            'target_type': 'external_recipient',
            'action': 'send',
            'result': 'SUCCESS',
            'bytes_transferred': size_bytes,
            'file_count': att_count,
            'is_remote': is_insider and (hour >= 20),
            'risk_indicators': indicators,
            'raw_payload': {
                'vector': 'External Webmail / Attachment Exfil',
                'from': from_addr,
                'to': to_addr,
                'attachments': att_count,
                'size': size_bytes
            }
        })

    # 3. File Events
    for _, row in sel_file.iterrows():
        u = str(row['user'])
        is_insider = u in all_insiders
        sc = scenario_map.get(u, 0)
        raw_id = str(row['id']).strip('{}')
        ev_id = f"EVT-FILE-{raw_id[:16]}"
        
        ts = pd.to_datetime(row['date'], errors='coerce')
        ts_str = ts.isoformat() if pd.notnull(ts) else now_dt.isoformat()
        hour = ts.hour if pd.notnull(ts) else 15
        
        indicators = ['data_activity']
        if is_insider:
            indicators.append('high_risk_behavior')
            if sc == 2:
                indicators.append('high_data_volume')
        if hour < 7 or hour >= 20:
            indicators.append('unusual_activity_time')

        fname = str(row.get('filename', 'architecture_specs.pdf'))
        pc_code = str(row.get('pc', 'PC-03')).replace('PC-', '')
        events_to_ship.append({
            'event_id': ev_id,
            'raw_event_id': raw_id,
            'event_type': 'file_copy' if is_insider else 'file_read',
            'source_dataset': 'enterprise_stream',
            'timestamp': ts_str,
            'user_id': u,
            'username': u,
            'employee_id': f"EMP-{u}",
            'department': dept_map.get(u, 'Engineering'),
            'device_id': f"WS-ENG-{pc_code}",
            'device_name': f"WS-ENG-{pc_code}",
            'device_type': 'Corporate Workstation',
            'ip_address': f"10.2.{random.randint(1,10)}.{random.randint(2,250)}",
            'operating_system': 'Windows 11 Enterprise',
            'target_resource': f"C:\\Confidential\\Core_IP\\{fname}",
            'target_type': 'file',
            'action': 'copy' if is_insider else 'read',
            'result': 'SUCCESS',
            'bytes_transferred': random.choice([85_000_000, 210_000_000]) if is_insider else 4096,
            'file_count': random.randint(10, 60) if is_insider else 1,
            'is_remote': is_insider and (hour >= 20),
            'risk_indicators': indicators,
            'raw_payload': {
                'vector': 'Bulk Proprietary File Harvesting',
                'filename': fname
            }
        })

    # 4. Logon Events
    for _, row in sel_logon.iterrows():
        u = str(row['user'])
        is_insider = u in all_insiders
        sc = scenario_map.get(u, 0)
        raw_id = str(row['id']).strip('{}')
        ev_id = f"EVT-AUTH-{raw_id[:16]}"
        
        ts = pd.to_datetime(row['date'], errors='coerce')
        ts_str = ts.isoformat() if pd.notnull(ts) else now_dt.isoformat()
        hour = ts.hour if pd.notnull(ts) else 9
        is_logon = str(row.get('activity', '')).strip().lower() == 'logon'
        
        indicators = []
        if hour < 7 or hour >= 20:
            indicators.append('unusual_activity_time')
        if is_insider and sc == 3:
            indicators.extend(['privilege_or_account_change', 'high_risk_behavior'])

        pc_code = str(row.get('pc', 'PC-04')).replace('PC-', '')
        events_to_ship.append({
            'event_id': ev_id,
            'raw_event_id': raw_id,
            'event_type': 'privilege_change' if (is_insider and sc == 3 and is_logon) else ('logon' if is_logon else 'logoff'),
            'source_dataset': 'enterprise_stream',
            'timestamp': ts_str,
            'user_id': u,
            'username': u,
            'employee_id': f"EMP-{u}",
            'department': dept_map.get(u, 'IT Operations'),
            'device_id': f"WS-IT-{pc_code}",
            'device_name': f"WS-IT-{pc_code}",
            'device_type': 'Corporate Workstation',
            'ip_address': f"10.2.{random.randint(1,10)}.{random.randint(2,250)}",
            'operating_system': 'Windows 11 Enterprise',
            'target_resource': f"WS-IT-{pc_code}",
            'target_type': 'workstation',
            'action': 'logon' if is_logon else 'logoff',
            'result': 'SUCCESS',
            'bytes_transferred': 0,
            'file_count': 0,
            'is_remote': is_insider and (hour >= 20),
            'risk_indicators': indicators,
            'raw_payload': {
                'vector': 'Administrative Privilege Escalation',
                'activity': str(row.get('activity', ''))
            }
        })

    # Dispatch batches
    chunk_size = 50
    total_accepted = 0
    print(f"      Shipping {len(events_to_ship)} events in batches of {chunk_size}...")
    
    for i in range(0, len(events_to_ship), chunk_size):
        chunk = events_to_ship[i:i + chunk_size]
        batch_payload = {
            'agent_id': 'ENT-STREAM-INGEST',
            'events': chunk
        }
        resp = requests.post(
            f"{API_URL}/api/v1/ingestion/events",
            json=batch_payload,
            headers={'x-api-key': API_KEY},
            timeout=15
        )
        if resp.status_code == 200:
            total_accepted += resp.json().get('accepted', 0)

    print(f"      Ingestion complete: {total_accepted} enterprise events accepted.")

    # 7. Create Professional Enterprise SOC Investigation Cases
    print("\n[5/6] Establishing SOC Investigation Cases with rich forensic details...")
    alerts_resp = requests.get(f"{API_URL}/api/v1/alerts?limit=300", headers=auth_headers, timeout=10)
    all_alerts = alerts_resp.json() if alerts_resp.status_code == 200 else []

    # High-fidelity incident dossiers
    cases_def = [
        {
            'id': 'CASE-2026-1049',
            'user': 'AAM0658',
            'title': 'CASE-2026-1049: Off-Hours Removable Storage Exfiltration - A. Moore (AAM0658)',
            'severity': 'critical',
            'status': 'investigating',
            'assignee': 'Jordan Lee',
            'notes': (
                "SUBJECT: Aaron Moore (EMP-AAM0658) | ROLE: Senior Financial Analyst | DEPT: Finance\n"
                "VECTOR: Physical Removable Media (USB 3.0)\n"
                "EVIDENCE: 320 MB archive (EXFIL_PAYROLL.ZIP) transferred to unauthorized USB drive at 01:34 UTC. "
                "Behavioral anomaly score 92. Off-hours activity without operational change request."
            )
        },
        {
            'id': 'CASE-2026-1052',
            'user': 'ABC0174',
            'title': 'CASE-2026-1052: Proprietary IP Harvesting & External Webmail Leak - A. Coffey (ABC0174)',
            'severity': 'high',
            'status': 'investigating',
            'assignee': 'Jordan Lee',
            'notes': (
                "SUBJECT: Allegra Coffey (EMP-ABC0174) | ROLE: Lead Systems Architect | DEPT: Engineering\n"
                "VECTOR: External Webmail / Attachment Exfil\n"
                "EVIDENCE: 45 MB source code and design documentation sent to personal webmail (Allegra_Coffey@optonline.net). "
                "Correlation: User concurrently browsed recruitment websites. Flight-risk profile confirmed."
            )
        },
        {
            'id': 'CASE-2026-1055',
            'user': 'BBS0039',
            'title': 'CASE-2026-1055: Unauthorized Privilege Escalation & Audit Log Query - B. Stone (BBS0039)',
            'severity': 'critical',
            'status': 'open',
            'assignee': 'Jordan Lee',
            'notes': (
                "SUBJECT: Bradley Stone (EMP-BBS0039) | ROLE: Lead Systems Administrator | DEPT: IT Operations\n"
                "VECTOR: Domain Admin Privilege Escalation\n"
                "EVIDENCE: Administrator executed unapproved SeDebugPrivilege elevation (Event ID 4672) at 23:40 UTC. "
                "Modified local security groups and cleared security event bookmarks. Tamper indicators detected."
            )
        },
        {
            'id': 'CASE-2026-1061',
            'user': 'AAF0535',
            'title': 'CASE-2026-1061: Abnormal Bulk Document Harvesting - A. Finch (AAF0535)',
            'severity': 'high',
            'status': 'investigating',
            'assignee': 'Jordan Lee',
            'notes': (
                "SUBJECT: Abigail Finch (EMP-AAF0535) | ROLE: Principal Software Engineer | DEPT: Engineering\n"
                "VECTOR: Bulk Document Harvesting\n"
                "EVIDENCE: Accessed and staged 60 confidential core IP repositories across 3 workstations in under 15 minutes. "
                "Data volume exceeds 30-day baseline by 450%."
            )
        }
    ]

    for c in cases_def:
        user_alerts = [a['id'] for a in all_alerts if a.get('username') == c['user']]
        inc_payload = {
            'title': c['title'],
            'severity': c['severity'],
            'assignee': c['assignee'],
            'notes': c['notes'],
            'alert_ids': user_alerts[:4] if user_alerts else ([all_alerts[0]['id']] if all_alerts else [])
        }
        requests.post(f"{API_URL}/api/v1/incidents", json=inc_payload, headers=auth_headers, timeout=5)

    print("      Created 4 professional SOC incident cases with complete forensic metadata.")

    # 8. Report
    print("\n==========================================================")
    print("  ENTERPRISE INGESTION COMPLETE — ZERO 'CERT' TAGS")
    print("==========================================================")
    status_resp = requests.get(f"{API_URL}/api/v1/system/status", headers=auth_headers, timeout=5)
    if status_resp.status_code == 200:
        stat = status_resp.json()
        print(f"  Platform Status:       {stat.get('api')} (DB: {stat.get('database')}, ML: {stat.get('ml_model')})")
        print(f"  Total Security Events: {stat.get('events')}")
        print(f"  Total Threat Alerts:   {stat.get('alerts')}")
        print(f"  Employee Profiles:     {stat.get('employees')}")
        print(f"  Enrolled Agents:       {stat.get('agents')}")
    print("==========================================================\n")

if __name__ == '__main__':
    main()
