from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone
import pandas as pd
from sqlalchemy.orm import Session
from backend.app.models.alert import Alert
from backend.app.models.employee import Employee


class AlertEngine:
    """
    Automated Security Alert Engine for Insider Threat Detection.
    Evaluates ML anomaly scores, risk factor drivers, and CERT heuristic rules
    to generate actionable, explainable alerts for SOC analysts.
    """

    def __init__(
        self,
        risk_threshold_high: float = 65.0,
        risk_threshold_critical: float = 80.0,
        anomaly_threshold: float = 0.75
    ):
        self.risk_threshold_high = risk_threshold_high
        self.risk_threshold_critical = risk_threshold_critical
        self.anomaly_threshold = anomaly_threshold

    def evaluate_record(
        self,
        record: Dict[str, Any],
        risk_result: Dict[str, Any],
        employee_context: Optional[Dict[str, Any]] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Evaluates a single daily user record and returns an alert payload if alert criteria are met.
        """
        user_id = str(record.get("user_id", ""))
        date_str = str(record.get("date", datetime.now(timezone.utc).date().isoformat()))
        risk_score = float(risk_result.get("risk_score", 0.0))
        anomaly_score = float(record.get("anomaly_score", 0.0))
        threat_prob = float(record.get("threat_probability", 0.0))

        reasons = []
        related_activities = []
        severity = "LOW"

        # Check Triggers
        # 1. Critical Risk Score
        if risk_score >= self.risk_threshold_critical:
            severity = "CRITICAL"
            reasons.append(f"Composite Insider Risk Score reached CRITICAL level ({risk_score}/100)")
        elif risk_score >= self.risk_threshold_high:
            severity = "HIGH"
            reasons.append(f"Composite Insider Risk Score reached HIGH level ({risk_score}/100)")
        elif anomaly_score >= self.anomaly_threshold or threat_prob >= 0.70:
            severity = "HIGH"
            reasons.append(f"Machine Learning Anomaly Engine flagged severe behavioral deviation (Score: {anomaly_score:.3f})")

        # 2. Data Sensitivity / USB Exfiltration
        sens_files = int(record.get("sensitive_file_activity", 0))
        usb_connects = int(record.get("device_connect_count", 0))
        after_device = int(record.get("after_hours_device", 0))
        if sens_files > 0:
            reasons.append(f"Access to {sens_files} sensitive/classified files")
            related_activities.append({"event": "SENSITIVE_FILE_ACCESS", "count": sens_files, "date": date_str})
        if usb_connects > 0:
            reasons.append(f"Removable USB storage drive connected ({usb_connects} events)")
            related_activities.append({"event": "USB_CONNECT", "count": usb_connects, "date": date_str})
        if after_device > 0:
            reasons.append(f"After-hours USB device usage ({after_device} events outside normal shift)")

        # 3. Off-Hours & Access Patterns
        after_logon = int(record.get("after_hours_logon", 0))
        weekend_logon = int(record.get("weekend_logon", 0))
        unique_pcs = int(record.get("unique_pcs", 1))
        if after_logon > 0:
            reasons.append(f"After-hours system logon detected ({after_logon} logons)")
            related_activities.append({"event": "AFTER_HOURS_LOGON", "count": after_logon, "date": date_str})
        if weekend_logon > 0:
            reasons.append(f"Unscheduled weekend workstation access ({weekend_logon} logons)")
        if unique_pcs > 2:
            reasons.append(f"Unusual lateral movement: Logged into {unique_pcs} distinct workstations")

        # 4. Web & Email Exfiltration
        susp_domains = int(record.get("suspicious_domain_count", 0))
        attachments = int(record.get("attachment_count", 0))
        avg_email_sz = float(record.get("avg_email_size", 0.0))
        if susp_domains > 0:
            reasons.append(f"Outbound network connections to {susp_domains} unapproved external cloud storage/personal webmail sites")
            related_activities.append({"event": "SUSPICIOUS_HTTP_REQUEST", "count": susp_domains, "date": date_str})
        if attachments >= 4:
            reasons.append(f"High outbound email attachment volume ({attachments} attachments, avg size {avg_email_sz:.1f} MB)")
            related_activities.append({"event": "EMAIL_ATTACHMENT_SPIKE", "count": attachments, "date": date_str})

        # If no security reasons triggered or severity is LOW, do not raise alert
        if not reasons or (severity == "LOW" and risk_score < 50.0):
            return None

        # Build Alert Object
        alert_id = f"ALT-2026-{uuid.uuid4().hex[:6].upper()}"
        timestamp_str = f"{date_str}T18:30:00Z"

        assigned_analyst = "Elena Rostova (Tier-2 Security Analyst)"
        if severity == "CRITICAL":
            assigned_analyst = "David Miller (Lead SOC Engineer)"

        return {
            "alert_id": alert_id,
            "user_id": user_id,
            "timestamp": timestamp_str,
            "severity": severity,
            "risk_score": float(risk_score),
            "anomaly_score": float(anomaly_score),
            "reasons": reasons,
            "related_activities": related_activities or [{"event": "ANOMALOUS_ACTIVITY_SUMMARY", "date": date_str}],
            "status": "NEW",
            "assigned_analyst": assigned_analyst,
            "notes": f"Auto-generated by Insider Threat AI Risk Engine on {date_str}."
        }

    def sync_alerts_to_db(
        self,
        alerts_list: List[Dict[str, Any]],
        db: Session
    ) -> int:
        """
        Saves generated alerts into the database `alerts` table, avoiding duplicates.
        """
        if not alerts_list:
            return 0

        created_count = 0
        for alert_data in alerts_list:
            # Check for existing alert for user with same date / score to prevent flood
            user_id = alert_data["user_id"]
            timestamp = alert_data["timestamp"]
            
            existing = db.query(Alert).filter(
                Alert.user_id == user_id,
                Alert.timestamp == timestamp
            ).first()

            if not existing:
                new_alert = Alert(
                    alert_id=alert_data["alert_id"],
                    user_id=user_id,
                    timestamp=timestamp,
                    severity=alert_data["severity"],
                    risk_score=alert_data["risk_score"],
                    anomaly_score=alert_data["anomaly_score"],
                    reasons=alert_data["reasons"],
                    related_activities=alert_data["related_activities"],
                    status=alert_data["status"],
                    assigned_analyst=alert_data["assigned_analyst"],
                    notes=alert_data.get("notes")
                )
                db.add(new_alert)
                created_count += 1

                # Increment employee alert count
                emp = db.query(Employee).filter(Employee.user_id == user_id).first()
                if emp:
                    emp.alert_count = (emp.alert_count or 0) + 1

        db.commit()
        return created_count
