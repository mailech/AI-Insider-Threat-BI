from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.alert import Alert
from app.models.risk import Risk

from app.models.logon import LogonActivity
from app.models.email import EmailActivity
from app.models.file_activity import FileActivity
from app.models.http_activity import HttpActivity
from app.models.device import DeviceActivity


class InvestigationService:

    # ============================================================
    # GET EMPLOYEE
    # ============================================================

    @staticmethod
    def get_employee(
        db: Session,
        employee_id: str
    ):

        return (
            db.query(Employee)
            .filter(
                Employee.employee_id == employee_id
            )
            .first()
        )

    # ============================================================
    # GET CURRENT RISK
    # ============================================================

    @staticmethod
    def get_current_risk(
        db: Session,
        employee_id: str
    ):

        return (
            db.query(Risk)
            .filter(
                Risk.employee_id == employee_id
            )
            .first()
        )

    # ============================================================
    # GET ALERTS
    # ============================================================

    @staticmethod
    def get_employee_alerts(
        db: Session,
        employee_id: str
    ):

        return (
            db.query(Alert)
            .filter(
                Alert.employee_id == employee_id
            )
            .order_by(
                Alert.created_at.desc(),
                Alert.id.desc()
            )
            .all()
        )

    # ============================================================
    # BUILD LOGON EVENTS
    # ============================================================

    @staticmethod
    def get_logon_events(
        db: Session,
        employee_id: str,
        limit: int
    ):

        rows = (
            db.query(LogonActivity)
            .filter(
                LogonActivity.user_id == employee_id
            )
            .order_by(
                LogonActivity.event_time.desc()
            )
            .limit(limit)
            .all()
        )

        events = []

        for row in rows:

            events.append({

                "source": "Logon",

                "event_id": row.event_id,

                "activity_type":
                    f"Logon {row.activity}",

                "timestamp":
                    (
                        row.event_time.isoformat()
                        if row.event_time
                        else None
                    ),

                "device": row.pc,

                "details":
                    f"Computer: {row.pc}",

                "risk_level": "Normal"
            })

        return events

    # ============================================================
    # BUILD EMAIL EVENTS
    # ============================================================

    @staticmethod
    def get_email_events(
        db: Session,
        employee_id: str,
        limit: int
    ):

        rows = (
            db.query(EmailActivity)
            .filter(
                EmailActivity.user_id == employee_id
            )
            .order_by(
                EmailActivity.event_time.desc()
            )
            .limit(limit)
            .all()
        )

        events = []

        for row in rows:

            attachment_text = (
                "Attachment present"
                if row.attachments
                else "No attachment"
            )

            events.append({

                "source": "Email",

                "event_id": row.event_id,

                "activity_type":
                    "Email Activity",

                "timestamp":
                    (
                        row.event_time.isoformat()
                        if row.event_time
                        else None
                    ),

                "device": row.pc,

                "details":
                    f"Sender: {row.sender}; "
                    f"{attachment_text}",

                "risk_level": "Normal"
            })

        return events

    # ============================================================
    # BUILD FILE EVENTS
    # ============================================================

    @staticmethod
    def get_file_events(
        db: Session,
        employee_id: str,
        limit: int
    ):

        rows = (
            db.query(FileActivity)
            .filter(
                FileActivity.user_id == employee_id
            )
            .order_by(
                FileActivity.event_time.desc()
            )
            .limit(limit)
            .all()
        )

        events = []

        for row in rows:

            events.append({

                "source": "File",

                "event_id": row.event_id,

                "activity_type":
                    "File Activity",

                "timestamp":
                    (
                        row.event_time.isoformat()
                        if row.event_time
                        else None
                    ),

                "device": row.pc,

                "details":
                    f"File: {row.filename}",

                "risk_level": "Normal"
            })

        return events

    # ============================================================
    # BUILD HTTP EVENTS
    # ============================================================

    @staticmethod
    def get_http_events(
        db: Session,
        employee_id: str,
        limit: int
    ):

        rows = (
            db.query(HttpActivity)
            .filter(
                HttpActivity.user_id == employee_id
            )
            .order_by(
                HttpActivity.event_time.desc()
            )
            .limit(limit)
            .all()
        )

        events = []

        for row in rows:

            events.append({

                "source": "HTTP",

                "event_id": row.event_id,

                "activity_type":
                    "Web Activity",

                "timestamp":
                    (
                        row.event_time.isoformat()
                        if row.event_time
                        else None
                    ),

                "device": row.pc,

                "details":
                    f"URL: {row.url}",

                "risk_level": "Normal"
            })

        return events

    # ============================================================
    # BUILD DEVICE EVENTS
    # ============================================================

    @staticmethod
    def get_device_events(
        db: Session,
        employee_id: str,
        limit: int
    ):

        rows = (
            db.query(DeviceActivity)
            .filter(
                DeviceActivity.user_id == employee_id
            )
            .order_by(
                DeviceActivity.event_time.desc()
            )
            .limit(limit)
            .all()
        )

        events = []

        for row in rows:

            events.append({

                "source": "Device",

                "event_id": row.event_id,

                "activity_type":
                    f"Device {row.activity}",

                "timestamp":
                    (
                        row.event_time.isoformat()
                        if row.event_time
                        else None
                    ),

                "device": row.pc,

                "details":
                    f"Device activity: {row.activity}",

                "risk_level": "Normal"
            })

        return events

    # ============================================================
    # GET COMBINED ACTIVITY TIMELINE
    # ============================================================

    @staticmethod
    def get_activity_timeline(
        db: Session,
        employee_id: str,
        limit: int = 100
    ):

        limit = min(
            max(int(limit), 1),
            500
        )

        # Fetch records from every CERT activity source.
        #
        # We fetch up to `limit` from each source and then
        # combine them into one chronological timeline.

        all_events = []

        all_events.extend(
            InvestigationService.get_logon_events(
                db,
                employee_id,
                limit
            )
        )

        all_events.extend(
            InvestigationService.get_email_events(
                db,
                employee_id,
                limit
            )
        )

        all_events.extend(
            InvestigationService.get_file_events(
                db,
                employee_id,
                limit
            )
        )

        all_events.extend(
            InvestigationService.get_http_events(
                db,
                employee_id,
                limit
            )
        )

        all_events.extend(
            InvestigationService.get_device_events(
                db,
                employee_id,
                limit
            )
        )

        # Newest events first.
        all_events.sort(
            key=lambda event: (
                event["timestamp"] or ""
            ),
            reverse=True
        )

        return all_events[:limit]

    # ============================================================
    # DEVICE ANALYSIS
    # ============================================================

    @staticmethod
    def get_devices(
        activities
    ):

        devices = set()

        for activity in activities:

            device = activity.get("device")

            if device:

                device = str(
                    device
                ).strip()

                if device:
                    devices.add(device)

        return sorted(
            list(devices)
        )

    # ============================================================
    # EVENT CORRELATION
    # ============================================================
        

    @staticmethod
    def correlate_events(
        activities,
        risk
    ):

        correlated = []

        # --------------------------------------------------------
        # Determine current employee risk level
        # --------------------------------------------------------

        risk_level = "LOW"

        if risk:
            risk_level = str(
                risk.risk_level
            ).upper()

        # --------------------------------------------------------
        # Suspicious indicators
        # --------------------------------------------------------

        suspicious_keywords = [
            "upload",
            "download",
            "transfer",
            "remote",
            "usb",
            "privilege",
            "unauthorized",
            "suspicious",
            "exfiltration",
            "external"
        ]

        # --------------------------------------------------------
        # Correlate events
        # --------------------------------------------------------

        for activity in activities:

            source = str(
                activity.get("source", "")
            ).lower()

            activity_type = str(
                activity.get("activity_type", "")
            ).lower()

            details = str(
                activity.get("details", "")
            ).lower()

            suspicious = False

            # ----------------------------------------------------
            # HIGH / CRITICAL risk
            # ----------------------------------------------------
            # For high-risk employees, activity correlation is
            # broader because the employee already has elevated
            # behavioral risk from the ML risk engine.
            # ----------------------------------------------------

            if risk_level in ["HIGH", "CRITICAL"]:

                if source in [
                    "file",
                    "device",
                    "http"
                ]:
                    suspicious = True

                elif any(
                    keyword in activity_type
                    or keyword in details
                    for keyword in suspicious_keywords
                ):
                    suspicious = True

            # ----------------------------------------------------
            # MEDIUM risk
            # ----------------------------------------------------
            # Require an additional suspicious activity indicator.
            # ----------------------------------------------------

            elif risk_level == "MEDIUM":

                if any(
                    keyword in activity_type
                    or keyword in details
                    for keyword in suspicious_keywords
                ):
                    suspicious = True

                elif source in ["file", "device"]:
                    suspicious = True

            # ----------------------------------------------------
            # LOW risk
            # ----------------------------------------------------
            # Do NOT treat ordinary email attachments as suspicious.
            # Only correlate events containing stronger indicators.
            # ----------------------------------------------------

            else:

                if any(
                    keyword in activity_type
                    or keyword in details
                    for keyword in suspicious_keywords
                ):
                    suspicious = True

                elif source in ["file", "device"]:

                    suspicious = True

            # ----------------------------------------------------
            # Add correlated event
            # ----------------------------------------------------

            if suspicious:

                correlated.append(activity)

        return correlated

    

        correlated = []

        # --------------------------------------------------------
        # High-level employee risk
        # --------------------------------------------------------

        risk_level = "LOW"

        if risk:

            risk_level = str(
                risk.risk_level
            ).upper()

        # --------------------------------------------------------
        # Correlate suspicious activity sources
        # --------------------------------------------------------

        for activity in activities:

            source = str(
                activity.get("source", "")
            ).lower()

            activity_type = str(
                activity.get("activity_type", "")
            ).lower()

            details = str(
                activity.get("details", "")
            ).lower()

            suspicious = False

            # Existing risk context
            if risk_level in [
                "HIGH",
                "CRITICAL"
            ]:

                suspicious = True

            # File-related investigation evidence
            if source == "file":

                suspicious = True

            # Device-related activity
            if source == "device":

                suspicious = True

            # Attachment-related email evidence
            if (
                source == "email"
                and "attachment present" in details
            ):

                suspicious = True

            # Potentially sensitive activity keywords
            keywords = [
                "upload",
                "download",
                "transfer",
                "remote",
                "usb",
                "privilege",
                "unauthorized",
                "suspicious"
            ]

            if any(
                keyword in activity_type
                or keyword in details
                for keyword in keywords
            ):

                suspicious = True

            if suspicious:

                correlated.append(
                    activity
                )

        return correlated

    # ============================================================
    # THREAT EVIDENCE COLLECTION
    # ============================================================
        

    @staticmethod
    def collect_evidence(
        activities,
        alerts,
        correlated_events
    ):

        evidence = []

        # --------------------------------------------------------
        # ALERT EVIDENCE
        # --------------------------------------------------------

        for alert in alerts:

            created_at = (
                alert.created_at.isoformat()
                if alert.created_at
                else "unknown time"
            )

            evidence.append(
                f"Alert Evidence | "
                f"Alert #{alert.id} | "
                f"Severity: {alert.severity} | "
                f"Status: {alert.status} | "
                f"Created: {created_at} | "
                f"Description: {alert.description}"
            )

        # --------------------------------------------------------
        # CORRELATED ACTIVITY EVIDENCE
        # --------------------------------------------------------

        seen_events = set()

        for activity in correlated_events:

            event_id = activity.get("event_id")

            # Prevent duplicate evidence records
            if event_id in seen_events:
                continue

            seen_events.add(event_id)

            source = activity.get(
                "source",
                "Unknown"
            )

            activity_type = activity.get(
                "activity_type",
                "Unknown activity"
            )

            timestamp = activity.get(
                "timestamp"
            ) or "unknown time"

            device = activity.get(
                "device"
            ) or "Unknown device"

            details = activity.get(
                "details"
            ) or "No additional details"

            evidence.append(
                f"Activity Evidence | "
                f"Source: {source} | "
                f"Event ID: {event_id} | "
                f"Activity: {activity_type} | "
                f"Timestamp: {timestamp} | "
                f"Device: {device} | "
                f"Details: {details}"
            )

        # --------------------------------------------------------
        # FILE-SPECIFIC EVIDENCE
        # --------------------------------------------------------
        # Only add file events that are already correlated.
        # Normal file activity is not automatically evidence.
        # --------------------------------------------------------

        for activity in correlated_events:

            if activity.get("source") != "File":
                continue

            event_id = activity.get("event_id")

            if event_id in seen_events:
                continue

            timestamp = (
                activity.get("timestamp")
                or "unknown time"
            )

            device = (
                activity.get("device")
                or "Unknown device"
            )

            details = (
                activity.get("details")
                or "No file details available"
            )

            evidence.append(
                f"File Evidence | "
                f"Event ID: {event_id} | "
                f"Timestamp: {timestamp} | "
                f"Device: {device} | "
                f"Details: {details}"
            )

            seen_events.add(event_id)

        # --------------------------------------------------------
        # LIMIT RESPONSE SIZE
        # --------------------------------------------------------

        return evidence[:100]

    

        evidence = []

        # --------------------------------------------------------
        # Alert evidence
        # --------------------------------------------------------

        for alert in alerts:

            created_at = (
                alert.created_at.isoformat()
                if alert.created_at
                else "unknown time"
            )

            evidence.append(
                f"Alert #{alert.id}: "
                f"{alert.severity} severity alert "
                f"created at {created_at}. "
                f"{alert.description}"
            )

        # --------------------------------------------------------
        # Correlated activity evidence
        # --------------------------------------------------------

        for activity in correlated_events:

            timestamp = (
                activity.get("timestamp")
                or "unknown time"
            )

            evidence.append(
                f"{activity.get('source')} event "
                f"{activity.get('event_id')} "
                f"at {timestamp}: "
                f"{activity.get('details')}"
            )

        # --------------------------------------------------------
        # File evidence
        # --------------------------------------------------------

        for activity in activities:

            if activity.get("source") == "File":

                evidence.append(
                    f"File evidence "
                    f"{activity.get('event_id')}: "
                    f"{activity.get('details')}"
                )

        return evidence[:100]

    # ============================================================
    # INVESTIGATION STATUS
    # ============================================================

    @staticmethod
    def determine_status(
        alerts,
        risk,
        correlated_events
    ):

        # --------------------------------------------------------
        # Active alerts
        # --------------------------------------------------------

        active_alerts = [
            alert
            for alert in alerts
            if alert.status != "Resolved"
        ]

        if active_alerts:

            if any(
                str(alert.severity).upper()
                == "CRITICAL"
                for alert in active_alerts
            ):

                return "Critical Investigation"

            return "Investigation Required"

        # --------------------------------------------------------
        # Risk
        # --------------------------------------------------------

        if risk:

            level = str(
                risk.risk_level
            ).upper()

            if level == "CRITICAL":

                return "Critical Investigation"

            if level == "HIGH":

                return "Investigation Required"

            if level == "MEDIUM":

                return "Monitoring"

        # --------------------------------------------------------
        # Correlated activity
        # --------------------------------------------------------

        if correlated_events:

            return "Monitoring"

        return "No Active Investigation"

    # ============================================================
    # INVESTIGATION SUMMARY
    # ============================================================

    @staticmethod
    def build_summary(
        employee,
        risk,
        alerts,
        activities,
        correlated_events
    ):

        employee_id = employee.employee_id

        if risk:

            risk_text = (
                f"Current risk score is "
                f"{risk.risk_score}/100 "
                f"with {risk.risk_level} severity."
            )

        else:

            risk_text = (
                "No current risk score is available."
            )

        active_alerts = [
            alert
            for alert in alerts
            if alert.status != "Resolved"
        ]

        summary = (
            f"Investigation profile for employee "
            f"{employee_id}. "
            f"{risk_text} "
            f"{len(active_alerts)} active alert(s), "
            f"{len(activities)} recorded activity event(s), "
            f"and {len(correlated_events)} correlated "
            f"suspicious event(s) were identified."
        )

        return summary

    # ============================================================
    # BUILD INVESTIGATION
    # ============================================================

    @staticmethod
    def get_investigation(
        db: Session,
        employee_id: str,
        activity_limit: int = 100
    ):

        # --------------------------------------------------------
        # Employee
        # --------------------------------------------------------

        employee = (
            InvestigationService.get_employee(
                db,
                employee_id
            )
        )

        if not employee:
            return None

        # --------------------------------------------------------
        # Risk
        # --------------------------------------------------------

        risk = (
            InvestigationService.get_current_risk(
                db,
                employee_id
            )
        )

        # --------------------------------------------------------
        # Alerts
        # --------------------------------------------------------

        alerts = (
            InvestigationService.get_employee_alerts(
                db,
                employee_id
            )
        )

        # --------------------------------------------------------
        # Real CERT activity timeline
        # --------------------------------------------------------

        activities = (
            InvestigationService.get_activity_timeline(
                db,
                employee_id,
                activity_limit
            )
        )

        # --------------------------------------------------------
        # Correlated events
        # --------------------------------------------------------

        correlated_events = (
            InvestigationService.correlate_events(
                activities,
                risk
            )
        )

        # --------------------------------------------------------
        # Devices
        # --------------------------------------------------------

        devices = (
            InvestigationService.get_devices(
                activities
            )
        )

        # --------------------------------------------------------
        # Evidence
        # --------------------------------------------------------

        evidence = (
            InvestigationService.collect_evidence(
                activities,
                alerts,
                correlated_events
            )
        )

        # --------------------------------------------------------
        # Investigation status
        # --------------------------------------------------------

        investigation_status = (
            InvestigationService.determine_status(
                alerts,
                risk,
                correlated_events
            )
        )

        # --------------------------------------------------------
        # Summary
        # --------------------------------------------------------

        summary = (
            InvestigationService.build_summary(
                employee,
                risk,
                alerts,
                activities,
                correlated_events
            )
        )

        # ========================================================
        # EMPLOYEE RESPONSE
        # ========================================================

        employee_data = {

            "employee_id":
                employee.employee_id,

            "full_name":
                employee.full_name,

            "department":
                employee.department,

            "designation":
                employee.designation,

            "manager":
                employee.manager,

            "device_information":
                employee.device_information,

            "access_privileges":
                employee.access_privileges,

            "risk_level":
                employee.risk_level,

            "status":
                employee.status
        }

        # ========================================================
        # RISK RESPONSE
        # ========================================================

        risk_data = None

        if risk:

            risk_data = {

                "risk_score":
                    risk.risk_score,

                "risk_level":
                    risk.risk_level,

                "behavioral_anomalies":
                    getattr(
                        risk,
                        "behavioral_anomalies",
                        0
                    ),

                "privilege_misuse":
                    getattr(
                        risk,
                        "privilege_misuse",
                        0
                    ),

                "data_access_violations":
                    getattr(
                        risk,
                        "data_access_violations",
                        0
                    ),

                "access_pattern_deviations":
                    getattr(
                        risk,
                        "access_pattern_deviations",
                        0
                    ),

                "historical_security_events":
                    getattr(
                        risk,
                        "historical_security_events",
                        0
                    )
            }

        # ========================================================
        # ALERT RESPONSE
        # ========================================================

        alert_data = []

        for alert in alerts:

            alert_data.append({

                "id":
                    alert.id,

                "employee_id":
                    alert.employee_id,

                "severity":
                    alert.severity,

                "status":
                    alert.status,

                "description":
                    alert.description,

                "assigned_analyst":
                    alert.assigned_analyst,

                "created_at":
                    (
                        alert.created_at.isoformat()
                        if alert.created_at
                        else None
                    ),

                "resolved_at":
                    (
                        alert.resolved_at.isoformat()
                        if alert.resolved_at
                        else None
                    )
            })

        # ========================================================
        # FINAL RESPONSE
        # ========================================================

        return {

            "employee":
                employee_data,

            "risk":
                risk_data,

            "alerts":
                alert_data,

            "activity_timeline":
                activities,

            "correlated_events":
                correlated_events,

            "devices":
                devices,

            "evidence":
                evidence,

            "investigation_status":
                investigation_status,

            "summary":
                summary
        }