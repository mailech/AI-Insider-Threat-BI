from sqlalchemy.orm import Session

from app.models.employee import Employee
from app.models.risk import Risk
from app.models.alert import Alert
from app.models.investigation import Investigation
from app.models.behavior_features import EmployeeBehaviorFeatures


class ReportService:

    # =========================================================
    # RISK ASSESSMENT REPORT
    # =========================================================

    @staticmethod
    def get_risk_assessment_report(db: Session):

        risks = (
            db.query(Risk)
            .order_by(Risk.risk_score.desc())
            .all()
        )

        total_employees = len(risks)

        risk_distribution = {
            "Low": 0,
            "Medium": 0,
            "High": 0,
            "Critical": 0
        }

        employees = []

        for risk in risks:

            # Normalize risk level so LOW / Low / low
            # are all treated consistently.
            raw_level = risk.risk_level

            if raw_level:
                normalized_level = str(raw_level).strip().lower()
            else:
                normalized_level = ""

            level_map = {
                "low": "Low",
                "medium": "Medium",
                "high": "High",
                "critical": "Critical"
            }

            display_level = level_map.get(
                normalized_level,
                "Low"
            )

            risk_distribution[display_level] += 1

            employees.append({
                "employee_id": risk.employee_id,
                "risk_score": risk.risk_score,
                "risk_level": display_level,
                "behavioral_anomalies": risk.behavioral_anomalies,
                "privilege_misuse": risk.privilege_misuse,
                "data_access_violations": risk.data_access_violations,
                "access_pattern_deviations": risk.access_pattern_deviations,
                "historical_security_events": risk.historical_security_events
            })

        average_risk_score = (
            sum(r.risk_score for r in risks) / total_employees
            if total_employees > 0
            else 0
        )

        return {
            "report_type": "Risk Assessment Report",
            "total_employees": total_employees,
            "average_risk_score": round(average_risk_score, 2),
            "risk_distribution": risk_distribution,
            "employees": employees
        }

    # =========================================================
    # BEHAVIORAL ANALYTICS REPORT
    # =========================================================

    @staticmethod
    def get_behavioral_analytics_report(db: Session):

        features = (
            db.query(EmployeeBehaviorFeatures)
            .all()
        )

        employees = []

        for feature in features:

            employees.append({
                "employee_id": feature.employee_id,

                "logon": {
                    "total_events": feature.total_logon_events,
                    "logon_events": feature.logon_events,
                    "logoff_events": feature.logoff_events,
                    "unique_devices": feature.logon_unique_devices
                },

                "email": {
                    "total_emails": feature.total_emails,
                    "with_attachments": feature.emails_with_attachments,
                    "without_attachments": feature.emails_without_attachments,
                    "average_size": feature.average_email_size,
                    "unique_devices": feature.email_unique_devices
                },

                "file": {
                    "total_events": feature.total_file_events,
                    "unique_files": feature.unique_files,
                    "unique_devices": feature.file_unique_devices
                },

                "http": {
                    "total_events": feature.total_http_events,
                    "unique_websites": feature.unique_websites,
                    "unique_devices": feature.http_unique_devices
                },

                "device": {
                    "total_events": feature.total_device_events,
                    "unique_devices": feature.device_unique_devices,
                    "activity_types": feature.device_activity_types
                }
            })

        return {
            "report_type": "Behavioral Analytics Report",
            "total_employees": len(employees),
            "employees": employees
        }

    # =========================================================
    # ALERT / THREAT REPORT
    # =========================================================

    @staticmethod
    def get_threat_report(db: Session):

        alerts = (
            db.query(Alert)
            .order_by(Alert.created_at.desc())
            .all()
        )

        severity_distribution = {
            "Informational": 0,
            "Low": 0,
            "Medium": 0,
            "High": 0,
            "Critical": 0
        }

        status_distribution = {
            "Open": 0,
            "In Progress": 0,
            "Resolved": 0
        }

        alert_data = []

        for alert in alerts:

            if alert.severity in severity_distribution:
                severity_distribution[alert.severity] += 1

            if alert.status in status_distribution:
                status_distribution[alert.status] += 1

            alert_data.append({
                "id": alert.id,
                "employee_id": alert.employee_id,
                "severity": alert.severity,
                "status": alert.status,
                "description": alert.description,
                "assigned_analyst": alert.assigned_analyst,

                "created_at": (
                    alert.created_at.isoformat()
                    if alert.created_at
                    else None
                ),

                "resolved_at": (
                    alert.resolved_at.isoformat()
                    if alert.resolved_at
                    else None
                )
            })

        return {
            "report_type": "Insider Threat Report",
            "total_alerts": len(alerts),
            "severity_distribution": severity_distribution,
            "status_distribution": status_distribution,
            "alerts": alert_data
        }

    # =========================================================
    # INVESTIGATION REPORT
    # =========================================================

    @staticmethod
    def get_investigation_report(db: Session):

        investigations = (
            db.query(Investigation)
            .order_by(Investigation.created_at.desc())
            .all()
        )

        status_distribution = {
            "Open": 0,
            "In Progress": 0,
            "Resolved": 0
        }

        severity_distribution = {
            "Informational": 0,
            "Low": 0,
            "Medium": 0,
            "High": 0,
            "Critical": 0
        }

        investigation_data = []

        for investigation in investigations:

            if investigation.status in status_distribution:
                status_distribution[investigation.status] += 1

            if investigation.severity in severity_distribution:
                severity_distribution[investigation.severity] += 1

            investigation_data.append({
                "id": investigation.id,
                "investigation_id": investigation.investigation_id,
                "employee_id": investigation.employee_id,
                "alert_id": investigation.alert_id,
                "title": investigation.title,
                "description": investigation.description,
                "severity": investigation.severity,
                "status": investigation.status,
                "assigned_analyst": investigation.assigned_analyst,
                "resolution_notes": investigation.resolution_notes,

                "created_at": (
                    investigation.created_at.isoformat()
                    if investigation.created_at
                    else None
                ),

                "updated_at": (
                    investigation.updated_at.isoformat()
                    if investigation.updated_at
                    else None
                ),

                "resolved_at": (
                    investigation.resolved_at.isoformat()
                    if investigation.resolved_at
                    else None
                )
            })

        return {
            "report_type": "Investigation Report",
            "total_investigations": len(investigations),
            "status_distribution": status_distribution,
            "severity_distribution": severity_distribution,
            "investigations": investigation_data
        }

    # =========================================================
    # COMPLIANCE REPORT
    # =========================================================

    @staticmethod
    def get_compliance_report(db: Session):

        employees = db.query(Employee).all()
        risks = db.query(Risk).all()
        alerts = db.query(Alert).all()
        investigations = db.query(Investigation).all()

        risk_map = {
            risk.employee_id: risk
            for risk in risks
        }

        employee_data = []

        for employee in employees:

            risk = risk_map.get(employee.employee_id)

            employee_alerts = [
                alert
                for alert in alerts
                if alert.employee_id == employee.employee_id
            ]

            employee_investigations = [
                investigation
                for investigation in investigations
                if investigation.employee_id == employee.employee_id
            ]

            employee_data.append({
                "employee_id": employee.employee_id,
                "full_name": employee.full_name,
                "department": employee.department,
                "designation": employee.designation,
                "manager": employee.manager,
                "status": employee.status,

                "risk_level": (
                    risk.risk_level
                    if risk
                    else employee.risk_level
                ),

                "risk_score": (
                    risk.risk_score
                    if risk
                    else None
                ),

                "total_alerts": len(employee_alerts),

                "total_investigations": len(
                    employee_investigations
                ),

                "open_alerts": sum(
                    1
                    for alert in employee_alerts
                    if alert.status == "Open"
                ),

                "open_investigations": sum(
                    1
                    for investigation in employee_investigations
                    if investigation.status == "Open"
                )
            })

        return {
            "report_type": "Compliance Report",
            "total_employees": len(employees),
            "total_alerts": len(alerts),
            "total_investigations": len(investigations),
            "employees": employee_data
        }