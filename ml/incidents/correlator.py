from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timezone
from sqlalchemy.orm import Session
from backend.app.models.incident import Incident, IncidentComment
from backend.app.models.alert import Alert
from backend.app.models.employee import Employee


class IncidentCorrelator:
    """
    Correlates multiple security alerts and behavioral threat signals into cohesive,
    actionable SOC incident investigation cases with MITRE ATT&CK technique mapping.
    """

    MITRE_MAPPINGS = {
        "USB": {"id": "T1052.001", "name": "Exfiltration Over Physical Medium: USB Removable Drive"},
        "SENSITIVE_FILE": {"id": "T1005", "name": "Data from Local System: Sensitive File Harvesting"},
        "CLOUD_STORAGE": {"id": "T1567", "name": "Exfiltration Over Web Service: Unapproved Cloud Storage"},
        "OFF_HOURS": {"id": "T1078", "name": "Valid Accounts: Anomalous Off-Hours Logons"},
        "EMAIL": {"id": "T1048", "name": "Exfiltration Over Alternative Protocol: Suspicious External Webmail"}
    }

    def correlate_alerts_for_user(
        self,
        user_id: str,
        alerts: List[Alert],
        employee: Optional[Employee] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Synthesizes a list of alerts for a single employee into an Incident case payload.
        """
        if not alerts:
            return None

        # Determine highest severity
        severities = [a.severity for a in alerts]
        max_severity = "CRITICAL" if "CRITICAL" in severities else ("HIGH" if "HIGH" in severities else "MEDIUM")
        
        # Only create full incidents for HIGH or CRITICAL alert patterns
        if max_severity not in ["HIGH", "CRITICAL"]:
            return None

        emp_name = employee.full_name if employee else f"Employee {user_id}"
        emp_role = employee.role if employee else "Staff"
        emp_dept = employee.department if employee else "Engineering"

        # Evidence collection and MITRE mapping
        evidence = []
        mitre_tags = []
        all_reasons = []

        for a in alerts:
            evidence.append(a.alert_id)
            for r in (a.reasons or []):
                all_reasons.append(r)
                if "USB" in r or "removable" in r.lower():
                    mitre_tags.append(self.MITRE_MAPPINGS["USB"]["id"])
                if "sensitive" in r.lower() or "file" in r.lower():
                    mitre_tags.append(self.MITRE_MAPPINGS["SENSITIVE_FILE"]["id"])
                if "cloud" in r.lower() or "web" in r.lower() or "unapproved" in r.lower():
                    mitre_tags.append(self.MITRE_MAPPINGS["CLOUD_STORAGE"]["id"])
                if "after-hours" in r.lower() or "weekend" in r.lower():
                    mitre_tags.append(self.MITRE_MAPPINGS["OFF_HOURS"]["id"])
                if "attachment" in r.lower() or "email" in r.lower():
                    mitre_tags.append(self.MITRE_MAPPINGS["EMAIL"]["id"])

        unique_mitre = list(set(mitre_tags))
        unique_reasons = list(dict.fromkeys(all_reasons))[:4]

        # Generate Title & Description
        threat_type = "Multi-Vector Data Exfiltration"
        if "T1052.001" in unique_mitre:
            threat_type = "Potential IP / Data Exfiltration via USB Drive"
        elif "T1567" in unique_mitre:
            threat_type = "Unauthorized Data Transfer via External Web Services"
        elif "T1048" in unique_mitre:
            threat_type = "Mass Email Attachment Exfiltration"

        title = f"{threat_type} - {emp_name} ({user_id})"
        description = (
            f"Automated incident generated following {len(alerts)} correlated security alerts for {emp_name} "
            f"({emp_role}, {emp_dept}). Key indicators detected:\n" +
            "\n".join([f"- {reason}" for reason in unique_reasons])
        )

        incident_id = f"INC-2026-{uuid.uuid4().hex[:4].upper()}"
        assigned = "Elena Rostova (Tier-2 Security Analyst)" if max_severity != "CRITICAL" else "David Miller (Lead SOC Engineer)"

        return {
            "incident_id": incident_id,
            "title": title,
            "user_id": user_id,
            "severity": max_severity,
            "status": "IN_PROGRESS",
            "assigned_analyst": assigned,
            "description": description,
            "evidence_references": evidence + [f"MITRE:{t}" for t in unique_mitre],
            "root_cause": "Anomalous multi-channel spikes correlating with sensitive file harvesting and off-hours extraction.",
            "initial_comment": f"Auto-triaged by Insider Threat Correlation Engine based on {len(alerts)} linked alerts."
        }

    def sync_incidents_to_db(
        self,
        db: Session
    ) -> int:
        """
        Scans all unresolved alerts in DB, groups them by user_id, and creates correlated incidents.
        """
        # Fetch high and critical alerts without linked incident
        high_alerts = db.query(Alert).filter(Alert.severity.in_(["HIGH", "CRITICAL"])).all()
        if not high_alerts:
            return 0

        alerts_by_user = {}
        for a in high_alerts:
            alerts_by_user.setdefault(a.user_id, []).append(a)

        created_count = 0
        for user_id, user_alerts in alerts_by_user.items():
            # Check if active incident already exists for this user
            existing_inc = db.query(Incident).filter(
                Incident.user_id == user_id,
                Incident.status.in_(["NEW", "IN_PROGRESS", "INVESTIGATING", "ESCALATED"])
            ).first()

            if not existing_inc and len(user_alerts) >= 1:
                employee = db.query(Employee).filter(Employee.user_id == user_id).first()
                inc_data = self.correlate_alerts_for_user(user_id, user_alerts, employee)
                
                if inc_data:
                    new_incident = Incident(
                        incident_id=inc_data["incident_id"],
                        title=inc_data["title"],
                        user_id=inc_data["user_id"],
                        severity=inc_data["severity"],
                        status=inc_data["status"],
                        assigned_analyst=inc_data["assigned_analyst"],
                        description=inc_data["description"],
                        evidence_references=inc_data["evidence_references"],
                        root_cause=inc_data["root_cause"]
                    )
                    db.add(new_incident)
                    
                    # Add initial comment
                    comment = IncidentComment(
                        incident_id=inc_data["incident_id"],
                        author="AI Correlation Engine",
                        comment=inc_data["initial_comment"],
                        timestamp=datetime.now(timezone.utc)
                    )
                    db.add(comment)
                    created_count += 1

        db.commit()
        return created_count
