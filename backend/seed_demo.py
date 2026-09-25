from datetime import datetime, timezone, timedelta
import random
from app.db import Base, engine, SessionLocal
from app.models import SecurityEvent, Employee, Device, Alert, Incident, Notification, AuditLog
from app.services.risk import RiskEngine
from app.security import hash_secret

random.seed(42)
Base.metadata.create_all(engine)
db = SessionLocal()
now = datetime.now(timezone.utc)

try:
    # Clean previous demo records cleanly
    demo_event_ids = [x.event_id for x in db.query(SecurityEvent).filter(SecurityEvent.source_dataset == 'demo').all()]
    if demo_event_ids:
        db.query(Alert).filter(Alert.event_id.in_(demo_event_ids)).delete(synchronize_session=False)
        db.query(SecurityEvent).filter(SecurityEvent.event_id.in_(demo_event_ids)).delete(synchronize_session=False)
    db.query(Incident).delete(synchronize_session=False)
    db.query(Notification).delete(synchronize_session=False)
    db.commit()

    deps = ['IT', 'Finance', 'HR', 'Engineering', 'Legal']
    departments_map = {
        'employee7': 'Finance',
        'employee21': 'IT',
        'employee3': 'Finance',
        'employee14': 'Engineering',
        'employee23': 'IT',
        'employee1': 'HR',
        'employee15': 'Engineering',
        'employee0': 'Engineering',
        'employee24': 'IT',
        'employee13': 'IT',
    }

    # 1. Employees (25 employees)
    for u in range(25):
        uname = f'employee{u}'
        dept = departments_map.get(uname, deps[u % 5])
        emp = db.query(Employee).filter_by(employee_id=f'EMP-{u:04d}').first()
        if not emp:
            emp = Employee(
                employee_id=f'EMP-{u:04d}',
                username=uname,
                department=dept,
                designation=random.choice(['Senior Analyst', 'Systems Engineer', 'Lead Architect', 'Compliance Manager', 'Operations Specialist']),
                manager=f'manager{u % 5}',
                access_privileges=['standard', 'vpn_access'] if u % 2 == 0 else ['standard', 'admin_access'],
                risk_score=0,
                risk_level='low',
                updated_at=now
            )
            db.add(emp)
    
    # 2. Devices (8 workstations + our local enrolled endpoint)
    for d in range(8):
        if not db.query(Device).filter_by(device_id=f'WS-{d}').first():
            db.add(Device(
                device_id=f'WS-{d}',
                device_name=f'WORKSTATION-{d}',
                api_key_hash=hash_secret(f'demo-key-{d}'),
                created_at=now,
                active=True,
                last_seen=now - timedelta(minutes=d * 3)
            ))
    db.commit()

    # 3. Events with authentic risk distribution
    engine_risk = RiskEngine()
    high_types = ['usb_file_copy', 'privilege_change', 'group_change', 'data_transfer', 'file_download', 'remote_session_connect']
    normal_types = ['logon', 'app_launch', 'network_connection', 'file_write', 'file_read', 'file_copy', 'email_send']
    suspicious_users = {7, 21, 3, 14, 23}

    events_created = []
    for i in range(300):
        u = i % 25
        is_suspicious = (u in suspicious_users and i % 3 == 0)
        typ = random.choice(high_types if is_suspicious else normal_types)
        ts = now - timedelta(minutes=i * 6)
        
        if is_suspicious:
            if i % 2 == 0:
                ts = ts.replace(hour=23, minute=(i * 7) % 60)
            bytes_n = random.choice([55_000_000, 140_000_000, 260_000_000])
            files = random.choice([15, 30, 75])
            remote = (typ == 'remote_session_connect' or i % 4 == 0)
            indicators = ['high_risk_behavior', 'unusual_activity_time']
            if bytes_n > 50_000_000:
                indicators.append('high_data_volume')
            if remote:
                indicators.append('remote_access')
            if typ in ['privilege_change', 'group_change']:
                indicators.append('privilege_or_account_change')
        else:
            bytes_n = random.choice([0, 1024, 8500, 240000])
            files = random.choice([0, 1, 2, 4])
            remote = (i % 7 == 0 and typ == 'remote_session_connect')
            indicators = ['remote_access'] if remote else []

        e = SecurityEvent(
            event_id=f'demo-{i}',
            idempotency_key=f'demo:{i}',
            raw_event_id=None,
            event_type=typ,
            source_dataset='demo',
            timestamp=ts,
            ingested_at=now,
            user_id=f'u-{u}',
            username=f'employee{u}',
            employee_id=f'EMP-{u:04d}',
            department=departments_map.get(f'employee{u}', deps[u % 5]),
            device_id=f'WS-{i % 8}',
            device_name=f'WORKSTATION-{i % 8}',
            device_type='Windows workstation',
            ip_address=f'10.0.{i % 8}.{20 + u}',
            operating_system='Windows 11 Enterprise',
            target_resource=f'\\\\server01\\confidential\\payroll_{i}.xlsx' if is_suspicious else f'C:\\Windows\\System32\\svchost.exe',
            target_type='file' if 'file' in typ else 'network',
            action='read' if 'read' in typ else 'write' if 'write' in typ else 'execute',
            result='SUCCESS',
            bytes_transferred=bytes_n,
            file_count=files,
            is_remote=remote,
            risk_indicators=indicators,
            raw_payload={'demo': True, 'process': 'powershell.exe' if is_suspicious else 'explorer.exe'}
        )
        db.add(e)
        db.flush()
        engine_risk.enrich(db, e)
        events_created.append(e)

    db.flush()

    # 4. Generate explicit Realistic Alerts across severities
    alerts_data = [
        ('demo-21', 'EMP-0007', 'employee7', 'critical', 'Critical: Mass Exfiltration of Financial Records via USB', 'Employee employee7 transferred 260MB of confidential payroll records to an unapproved USB drive after hours (23:14 UTC).', 'open'),
        ('demo-42', 'EMP-0021', 'employee21', 'critical', 'Critical: Unauthorized Privilege Escalation to Domain Admins', 'Privilege modification observed for employee21 granting Domain Admin permissions without an approved ITSM change ticket.', 'investigating'),
        ('demo-63', 'EMP-0003', 'employee3', 'high', 'High: Bulk Download of Confidential Customer Data', 'Employee employee3 downloaded 75 sensitive files exceeding baseline volume limits at 23:45 UTC.', 'open'),
        ('demo-84', 'EMP-0014', 'employee14', 'high', 'High: Anomalous After-Hours Inbound Remote Session', 'Suspicious RDP remote connection detected from external unmanaged IP 10.0.6.34 during non-business hours.', 'acknowledged'),
        ('demo-105', 'EMP-0023', 'employee23', 'high', 'High: Excessive Data Transfer to Unverified Internal Share', '140MB data transfer stream initiated to staging share outside designated maintenance window.', 'investigating'),
        ('demo-126', 'EMP-0001', 'employee1', 'medium', 'Medium: Repeated File Access Deviations in HR Directory', 'Access pattern deviation detected: employee1 accessed 15 personnel folders outside regular departmental profile.', 'open'),
        ('demo-147', 'EMP-0015', 'employee15', 'medium', 'Medium: Execution of Unsigned Administrative Script', 'Process execution anomaly: PowerShell script executed with encoded commands on WORKSTATION-7.', 'resolved'),
        ('demo-168', 'EMP-0024', 'employee24', 'low', 'Low: First-Time Access to Internal Cloud Documentation', 'User accessed cloud documentation repository for the first time; consistent with recent project reassignment.', 'closed')
    ]

    alert_objs = []
    for ev_id, emp_id, uname, sev, title, desc, stat in alerts_data:
        # Check if event exists
        ev = db.query(SecurityEvent).filter_by(event_id=ev_id).first()
        if not ev:
            ev = events_created[0]
            ev_id = ev.event_id
        a = Alert(
            event_id=ev_id,
            employee_id=emp_id,
            username=uname,
            severity=sev,
            title=title,
            description=desc,
            status=stat,
            created_at=now - timedelta(hours=random.randint(1, 48)),
            resolved_at=(now - timedelta(hours=2)) if stat in ['resolved', 'closed'] else None
        )
        db.add(a)
        db.flush()
        alert_objs.append(a)

    # 5. Incident Investigations linked to alerts
    incidents_data = [
        ('INC-2026-081: Exfiltration of Financial Ledger via USB Storage', 'critical', 'investigating', 'analyst', [alert_objs[0].id], 'Forensic snapshot captured. Removable USB volume mounted on WORKSTATION-7 at 23:14 UTC. 260MB written across 75 encrypted payroll sheets. Endpoint isolated for triage.'),
        ('INC-2026-082: Privilege Escalation & Domain Admin Modification', 'critical', 'open', 'analyst', [alert_objs[1].id], 'Active Directory replication log shows unauthorized privilege grant by employee21. ITSM approval ticket absent. Security team reviewing access revoke protocol.'),
        ('INC-2026-079: Off-Hours Bulk Repository Downloads', 'high', 'investigating', 'engineer', [alert_objs[2].id, alert_objs[4].id], 'Correlated telemetry shows 75 files downloaded followed by 140MB network transfer. Traffic routed through internal staging gateway.'),
        ('INC-2026-074: External RDP Connection Verification', 'medium', 'resolved', 'manager', [alert_objs[3].id], 'Investigated employee14 remote access. Employee submitted verified emergency travel ticket retroactive approval. Incident resolved and marked compliant.')
    ]

    for title, sev, stat, assignee, alert_ids, notes in incidents_data:
        inc = Incident(
            title=title,
            severity=sev,
            status=stat,
            assignee=assignee,
            alert_ids=alert_ids,
            notes=notes,
            created_at=now - timedelta(hours=random.randint(6, 72)),
            updated_at=now - timedelta(minutes=random.randint(10, 120))
        )
        db.add(inc)

    # 6. Notifications
    for a in alert_objs[:4]:
        db.add(Notification(
            recipient='*',
            kind='alert',
            title=f'{a.severity.upper()} Insider Threat: {a.title}',
            message=a.description,
            severity=a.severity,
            read=False,
            created_at=a.created_at
        ))

    # 7. Audit Logs
    audit_events = [
        ('analyst', 'alert.investigate', 'Alert #1', {'action': 'opened_case', 'case': 'INC-2026-081'}),
        ('analyst', 'alert.acknowledge', 'Alert #4', {'status': 'acknowledged'}),
        ('engineer', 'agent.poll', 'WS-0', {'status': 'healthy', 'events_ingested': 48}),
        ('manager', 'incident.resolve', 'INC-2026-074', {'resolution': 'verified_travel_approval'}),
        ('admin', 'user.login', 'admin', {'client_ip': '127.0.0.1'}),
        ('admin', 'agent.enroll', 'DESKTOP-PC3PVQB', {'device_type': 'Windows 11'}),
    ]
    for actor, action, target, details in audit_events:
        db.add(AuditLog(
            actor=actor,
            action=action,
            target=target,
            details=details,
            created_at=now - timedelta(minutes=random.randint(5, 300))
        ))

    db.commit()
    print("Successfully seeded realistic 300+ events, 8 threat alerts, 4 investigations, notifications, and audit logs!")

finally:
    db.close()
