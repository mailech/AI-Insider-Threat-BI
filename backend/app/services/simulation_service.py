import random
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.models import Employee, ActivityLog, ThreatAlert, Incident, Investigation, InvestigationTimeline, AlertSeverity, ActivityType, IncidentStatus, RiskLevel
from app.services.risk_service import InsiderRiskScoringEngine

def inject_realtime_threat_simulation(
    db: Session,
    scenario: str,
    employee_id: str = None
) -> Dict[str, Any]:
    """
    Injects an active insider threat attack scenario for live interactive demonstration in SOC dashboards:
    - 'data_exfiltration': Mass sensitive file downloads and external cloud transfer
    - 'privilege_escalation': Unauthorized sudo/root privilege escalation and audit log tampering
    - 'usb_theft': Unauthorized USB connection and large volume data copy
    - 'after_hours_recon': 2:00 AM login, internal network scanning with nmap/mimikatz
    """
    if not employee_id:
        # Pick a default employee
        emp = db.query(Employee).filter(Employee.is_red_team == True).first()
        if not emp:
            emp = db.query(Employee).first()
    else:
        emp = db.query(Employee).filter(Employee.employee_id == employee_id).first()
        
    if not emp:
        return {"error": "Employee not found"}
        
    now = datetime.utcnow()
    logs_created = []
    
    if scenario == "data_exfiltration":
        # 1. Access sensitive files
        f1 = ActivityLog(
            employee_id=emp.employee_id,
            timestamp=now - timedelta(minutes=15),
            activity_type=ActivityType.FILE_ACCESS,
            action="mass_file_download",
            resource="customer_pii_dump_2026.csv",
            details={"file_size_mb": 420.5, "sensitivity": "RESTRICTED", "location": "/share/finance/vault"},
            is_anomalous=True,
            anomaly_reason="Uncharacteristic mass bulk download of restricted financial PII",
            severity=AlertSeverity.HIGH
        )
        # 2. Cloud exfiltration
        f2 = ActivityLog(
            employee_id=emp.employee_id,
            timestamp=now - timedelta(minutes=5),
            activity_type=ActivityType.DATA_TRANSFER,
            action="external_cloud_upload",
            resource="https://mega.nz/upload/vault",
            details={"upload_mb": 420.5, "destination_ip": "185.220.101.5", "protocol": "HTTPS_POST"},
            is_anomalous=True,
            anomaly_reason="Large data egress to unauthorized external file locker",
            severity=AlertSeverity.CRITICAL
        )
        db.add_all([f1, f2])
        logs_created.extend([f1, f2])
        
        # Increase risk score
        emp.risk_score = min(100.0, emp.risk_score + 35.0)
        emp.risk_level = RiskLevel.CRITICAL if emp.risk_score >= 80 else RiskLevel.HIGH
        
        # Trigger Alert
        alert_id = f"ALT-SIM-{now.strftime('%H%M%S')}-{emp.employee_id}"
        alert = ThreatAlert(
            alert_id=alert_id,
            employee_id=emp.employee_id,
            title=f"Critical Data Exfiltration in Progress: {emp.name}",
            description=f"User downloaded 420MB restricted PII and transferred it directly to mega.nz external IP 185.220.101.5.",
            severity=AlertSeverity.CRITICAL,
            status="New",
            source_engine="Data Loss Prevention & UEBA",
            anomaly_score=94.5,
            risk_score=emp.risk_score
        )
        db.add(alert)
        
    elif scenario == "privilege_escalation":
        p1 = ActivityLog(
            employee_id=emp.employee_id,
            timestamp=now - timedelta(minutes=10),
            activity_type=ActivityType.APPLICATION,
            action="process_execution",
            resource="mimikatz.exe",
            details={"command_line": "mimikatz.exe sekurlsa::logonpasswords", "parent_proc": "powershell.exe"},
            is_anomalous=True,
            anomaly_reason="Execution of known credential harvesting offensive tool",
            severity=AlertSeverity.CRITICAL
        )
        p2 = ActivityLog(
            employee_id=emp.employee_id,
            timestamp=now - timedelta(minutes=2),
            activity_type=ActivityType.PRIVILEGE_CHANGE,
            action="unauthorized_admin_grant",
            resource="Domain Admins",
            details={"target_account": emp.employee_id, "action": "Add-ADGroupMember"},
            is_anomalous=True,
            anomaly_reason="Unauthorized self-elevation to Domain Administrator",
            severity=AlertSeverity.CRITICAL
        )
        db.add_all([p1, p2])
        logs_created.extend([p1, p2])
        
        emp.risk_score = min(100.0, emp.risk_score + 40.0)
        emp.risk_level = RiskLevel.CRITICAL
        
        alert_id = f"ALT-SIM-{now.strftime('%H%M%S')}-{emp.employee_id}"
        alert = ThreatAlert(
            alert_id=alert_id,
            employee_id=emp.employee_id,
            title=f"Active Privilege Abuse & Credential Access: {emp.name}",
            description=f"Offensive tool mimikatz.exe executed followed by unauthorized domain privilege escalation.",
            severity=AlertSeverity.CRITICAL,
            status="New",
            source_engine="Host Intrusion & Privilege Monitoring",
            anomaly_score=98.0,
            risk_score=emp.risk_score
        )
        db.add(alert)
        
    elif scenario == "usb_theft":
        u1 = ActivityLog(
            employee_id=emp.employee_id,
            timestamp=now - timedelta(minutes=8),
            activity_type=ActivityType.USB_USAGE,
            action="unauthorized_mass_storage_plug",
            resource="SanDisk_Ultra_128GB_S394819",
            details={"vendor_id": "0781", "product_id": "5581", "serial": "SANDISK-9941"},
            is_anomalous=True,
            anomaly_reason="Unapproved hardware storage device connected to SOC endpoint",
            severity=AlertSeverity.HIGH
        )
        u2 = ActivityLog(
            employee_id=emp.employee_id,
            timestamp=now - timedelta(minutes=3),
            activity_type=ActivityType.FILE_ACCESS,
            action="copy_to_removable_media",
            resource="source_code_auth_core.zip",
            details={"files_count": 48, "destination": "E:\\backup\\"},
            is_anomalous=True,
            anomaly_reason="Mass source code extraction to removable USB storage",
            severity=AlertSeverity.HIGH
        )
        db.add_all([u1, u2])
        logs_created.extend([u1, u2])
        
        emp.risk_score = min(100.0, emp.risk_score + 25.0)
        emp.risk_level = RiskLevel.HIGH if emp.risk_score < 80 else RiskLevel.CRITICAL
        
        alert_id = f"ALT-SIM-{now.strftime('%H%M%S')}-{emp.employee_id}"
        alert = ThreatAlert(
            alert_id=alert_id,
            employee_id=emp.employee_id,
            title=f"Removable Media Security Violation: {emp.name}",
            description=f"Unauthorized USB SanDisk connected with immediate copy of 48 source code repositories.",
            severity=AlertSeverity.HIGH,
            status="New",
            source_engine="Endpoint Peripheral Monitor",
            anomaly_score=88.0,
            risk_score=emp.risk_score
        )
        db.add(alert)
        
    else:  # after_hours_recon
        a1 = ActivityLog(
            employee_id=emp.employee_id,
            timestamp=now - timedelta(minutes=20),
            activity_type=ActivityType.REMOTE_ACCESS,
            action="vpn_login",
            resource="VPN-Gateway-East",
            details={"client_ip": "185.190.141.22", "country": "Seychelles", "hour": 2},
            is_anomalous=True,
            anomaly_reason="Off-hours VPN connection from unfamiliar geographical IP",
            severity=AlertSeverity.HIGH
        )
        a2 = ActivityLog(
            employee_id=emp.employee_id,
            timestamp=now - timedelta(minutes=10),
            activity_type=ActivityType.NETWORK,
            action="port_scan_reconnaissance",
            resource="10.0.0.0/16",
            details={"tool": "nmap", "ports_scanned": 1000, "flagged": True},
            is_anomalous=True,
            anomaly_reason="Internal network subnet reconnaissance scan",
            severity=AlertSeverity.HIGH
        )
        db.add_all([a1, a2])
        logs_created.extend([a1, a2])
        
        emp.risk_score = min(100.0, emp.risk_score + 28.0)
        emp.risk_level = RiskLevel.HIGH if emp.risk_score < 80 else RiskLevel.CRITICAL
        
        alert_id = f"ALT-SIM-{now.strftime('%H%M%S')}-{emp.employee_id}"
        alert = ThreatAlert(
            alert_id=alert_id,
            employee_id=emp.employee_id,
            title=f"After-Hours Network Reconnaissance: {emp.name}",
            description=f"Off-hours VPN session from overseas followed by port scanning of the 10.0.0.0/16 subnet.",
            severity=AlertSeverity.HIGH,
            status="New",
            source_engine="Network Threat Analytics",
            anomaly_score=85.0,
            risk_score=emp.risk_score
        )
        db.add(alert)
        
    db.commit()
    
    return {
        "status": "success",
        "scenario": scenario,
        "target_employee": {
            "id": emp.employee_id,
            "name": emp.name,
            "department": emp.department,
            "new_risk_score": emp.risk_score,
            "new_risk_level": emp.risk_level.value
        },
        "events_injected": len(logs_created),
        "alert_generated": alert_id
    }
