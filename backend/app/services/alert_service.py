from datetime import datetime

from sqlalchemy.orm import Session

from app.models.alert import Alert


class AlertService:

    # ============================================================
    # CREATE RISK ALERT
    # ============================================================

    @staticmethod
    def create_risk_alert(
        db: Session,
        employee_id: str,
        risk_score: int,
        risk_level: str,
        explanation: str = ""
    ):
        """
        Creates an alert for HIGH or CRITICAL risk employees.

        Existing unresolved alerts with the same employee and
        severity are reused to prevent duplicate active alerts.
        """

        risk_level = str(
            risk_level
        ).upper()

        # Only HIGH and CRITICAL generate alerts
        if risk_level not in [
            "HIGH",
            "CRITICAL"
        ]:
            return None

        # Determine severity
        severity = (
            "Critical"
            if risk_level == "CRITICAL"
            else "High"
        )

        # --------------------------------------------------------
        # Check for existing active alert
        # --------------------------------------------------------

        existing_alert = (
            db.query(Alert)
            .filter(
                Alert.employee_id == employee_id,
                Alert.severity == severity,
                Alert.status != "Resolved"
            )
            .first()
        )

        if existing_alert:
            return existing_alert

        # --------------------------------------------------------
        # Build description
        # --------------------------------------------------------

        description = (
            f"{risk_level} insider threat risk detected "
            f"for employee {employee_id}. "
            f"Risk score: {risk_score}/100."
        )

        if explanation:
            description += f" {explanation}"

        # Respect database column length
        description = description[:1000]

        # --------------------------------------------------------
        # Create alert
        # --------------------------------------------------------

        alert = Alert(
            employee_id=employee_id,
            severity=severity,
            status="Open",
            description=description
        )

        db.add(alert)

        db.commit()

        db.refresh(alert)

        return alert


    # ============================================================
    # BACKWARD COMPATIBILITY
    # ============================================================

    @staticmethod
    def create_high_risk_alert(
        db: Session,
        employee_id: str
    ):
        """
        Backward-compatible method.
        """

        return AlertService.create_risk_alert(
            db=db,
            employee_id=employee_id,
            risk_score=0,
            risk_level="HIGH",
            explanation=""
        )


    # ============================================================
    # GET ALL ALERTS - PAGINATED
    # ============================================================

    @staticmethod
    def get_all_alerts(
        db: Session,
        skip: int = 0,
        limit: int = 20
    ):
        """
        Returns a limited number of alerts.

        This is used by the Alerts page.
        The Dashboard should use get_alert_summary()
        instead of loading alert records.
        """

        return (
            db.query(Alert)
            .order_by(
                Alert.created_at.desc(),
                Alert.id.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )


    # ============================================================
    # ALERT SUMMARY
    # ============================================================

    @staticmethod
    def get_alert_summary(
        db: Session
    ):
        """
        Lightweight dashboard alert statistics.

        This does NOT load alert objects.
        Only database counts are returned.
        """

        total = (
            db.query(Alert)
            .count()
        )

        open_alerts = (
            db.query(Alert)
            .filter(
                Alert.status == "Open"
            )
            .count()
        )

        in_progress = (
            db.query(Alert)
            .filter(
                Alert.status == "In Progress"
            )
            .count()
        )

        resolved = (
            db.query(Alert)
            .filter(
                Alert.status == "Resolved"
            )
            .count()
        )

        high = (
            db.query(Alert)
            .filter(
                Alert.severity == "High"
            )
            .count()
        )

        critical = (
            db.query(Alert)
            .filter(
                Alert.severity == "Critical"
            )
            .count()
        )

        return {
            "total": total,
            "open": open_alerts,
            "in_progress": in_progress,
            "resolved": resolved,
            "high": high,
            "critical": critical
        }


    # ============================================================
    # GET ONE ALERT
    # ============================================================

    @staticmethod
    def get_alert_by_id(
        db: Session,
        alert_id: int
    ):

        return (
            db.query(Alert)
            .filter(
                Alert.id == alert_id
            )
            .first()
        )


    # ============================================================
    # ASSIGN ANALYST
    # ============================================================

    @staticmethod
    def assign_analyst(
        db: Session,
        alert_id: int,
        analyst: str
    ):

        alert = (
            db.query(Alert)
            .filter(
                Alert.id == alert_id
            )
            .first()
        )

        if not alert:
            return None

        alert.assigned_analyst = analyst

        db.commit()

        db.refresh(alert)

        return alert


    # ============================================================
    # UPDATE ALERT STATUS
    # ============================================================

    @staticmethod
    def update_status(
        db: Session,
        alert_id: int,
        status: str
    ):

        alert = (
            db.query(Alert)
            .filter(
                Alert.id == alert_id
            )
            .first()
        )

        if not alert:
            return None

        alert.status = status

        if status == "Resolved":

            alert.resolved_at = datetime.utcnow()

        else:

            alert.resolved_at = None

        db.commit()

        db.refresh(alert)

        return alert