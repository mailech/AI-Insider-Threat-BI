import math

from sqlalchemy.orm import Session

from app.models.behavior_features import EmployeeBehaviorFeatures
from app.services.risk_service import RiskService


class BehaviorAnalysisService:

    # ============================================================
    # SAFE NUMBER
    # ============================================================

    @staticmethod
    def safe_number(value):
        if value is None:
            return 0.0

        try:
            value = float(value)

            if not math.isfinite(value):
                return 0.0

            return value

        except (TypeError, ValueError):
            return 0.0

    # ============================================================
    # FORMAT DATETIME
    # ============================================================

    @staticmethod
    def format_datetime(value):

        if value is None:
            return None

        try:
            return value.isoformat()

        except AttributeError:
            return str(value)

    # ============================================================
    # GET EMPLOYEE BEHAVIOR
    # ============================================================

    @staticmethod
    def get_employee_behavior(
        db: Session,
        employee_id: str
    ):

        # --------------------------------------------------------
        # Get aggregated behavioral features
        # --------------------------------------------------------

        behavior = (
            db.query(EmployeeBehaviorFeatures)
            .filter(
                EmployeeBehaviorFeatures.employee_id
                == employee_id
            )
            .first()
        )

        if not behavior:
            return None

        # ========================================================
        # BASIC ACTIVITY
        # ========================================================

        logon_activity = int(
            BehaviorAnalysisService.safe_number(
                behavior.total_logon_events
            )
        )

        email_activity = int(
            BehaviorAnalysisService.safe_number(
                behavior.total_emails
            )
        )

        file_activity = int(
            BehaviorAnalysisService.safe_number(
                behavior.total_file_events
            )
        )

        http_activity = int(
            BehaviorAnalysisService.safe_number(
                behavior.total_http_events
            )
        )

        device_activity = int(
            BehaviorAnalysisService.safe_number(
                behavior.total_device_events
            )
        )

        # ========================================================
        # UNIQUE DEVICES
        # ========================================================

        logon_unique_devices = int(
            BehaviorAnalysisService.safe_number(
                behavior.logon_unique_devices
            )
        )

        email_unique_devices = int(
            BehaviorAnalysisService.safe_number(
                behavior.email_unique_devices
            )
        )

        file_unique_devices = int(
            BehaviorAnalysisService.safe_number(
                behavior.file_unique_devices
            )
        )

        http_unique_devices = int(
            BehaviorAnalysisService.safe_number(
                behavior.http_unique_devices
            )
        )

        device_unique_devices = int(
            BehaviorAnalysisService.safe_number(
                behavior.device_unique_devices
            )
        )

        # ========================================================
        # ACTIVITY VOLUME
        # ========================================================

        total_activity = (
            logon_activity
            + email_activity
            + file_activity
            + http_activity
            + device_activity
        )

        # Logarithmic representation for dashboard visualization.
        activity_volume = min(
            math.log1p(total_activity) * 10,
            100
        )

        # ========================================================
        # ACTIVITY DIVERSITY
        # ========================================================

        activity_categories = 0

        if logon_activity > 0:
            activity_categories += 1

        if email_activity > 0:
            activity_categories += 1

        if file_activity > 0:
            activity_categories += 1

        if http_activity > 0:
            activity_categories += 1

        if device_activity > 0:
            activity_categories += 1

        activity_diversity = (
            activity_categories / 5
        ) * 100

        # ========================================================
        # DEVICE DIVERSITY
        # ========================================================

        device_counts = [
            logon_unique_devices,
            email_unique_devices,
            file_unique_devices,
            http_unique_devices,
            device_unique_devices
        ]

        device_diversity = min(
            sum(device_counts) * 10,
            100
        )

        # ========================================================
        # EXISTING ML RISK / ANOMALY DETECTION
        # ========================================================

        ml_result = RiskService.calculate_risk(
            db,
            employee_id
        )

        anomaly_score = float(
            ml_result["risk_score"]
        )

        anomaly_level = str(
            ml_result["risk_level"]
        ).upper()

        # ========================================================
        # BEHAVIORAL STATUS
        # ========================================================

        if anomaly_level == "CRITICAL":

            behavioral_status = (
                "Highly unusual behavioral activity"
            )

        elif anomaly_level == "HIGH":

            behavioral_status = (
                "Suspicious behavioral activity"
            )

        elif anomaly_level == "MEDIUM":

            behavioral_status = (
                "Moderate behavioral deviation"
            )

        else:

            behavioral_status = (
                "Behavior within normal range"
            )

        # ========================================================
        # EXPLANATION
        # ========================================================

        explanation = ml_result.get(
            "explanation",
            "Behavioral analysis completed using the trained "
            "Isolation Forest model."
        )

        # ========================================================
        # RESPONSE
        # ========================================================

        return {

            "employee_id":
                employee_id,

            # ----------------------------------------------------
            # Activity profile
            # ----------------------------------------------------

            "logon_activity":
                logon_activity,

            "email_activity":
                email_activity,

            "file_activity":
                file_activity,

            "http_activity":
                http_activity,

            "device_activity":
                device_activity,

            # ----------------------------------------------------
            # Device profile
            # ----------------------------------------------------

            "logon_unique_devices":
                logon_unique_devices,

            "email_unique_devices":
                email_unique_devices,

            "file_unique_devices":
                file_unique_devices,

            "http_unique_devices":
                http_unique_devices,

            "device_unique_devices":
                device_unique_devices,

            # ----------------------------------------------------
            # Behavioral profile indicators
            # ----------------------------------------------------

            "activity_volume":
                round(
                    activity_volume,
                    2
                ),

            "activity_diversity":
                round(
                    activity_diversity,
                    2
                ),

            "device_diversity":
                round(
                    device_diversity,
                    2
                ),

            # ----------------------------------------------------
            # ML anomaly result
            # ----------------------------------------------------

            "anomaly_score":
                round(
                    anomaly_score,
                    2
                ),

            "anomaly_level":
                anomaly_level,

            "behavioral_status":
                behavioral_status,

            "explanation":
                explanation,

            # ----------------------------------------------------
            # Last activity
            # ----------------------------------------------------

            "last_logon_activity":
                BehaviorAnalysisService.format_datetime(
                    behavior.last_logon_activity
                ),

            "last_email_activity":
                BehaviorAnalysisService.format_datetime(
                    behavior.last_email_activity
                ),

            "last_file_activity":
                BehaviorAnalysisService.format_datetime(
                    behavior.last_file_activity
                ),

            "last_http_activity":
                BehaviorAnalysisService.format_datetime(
                    behavior.last_http_activity
                ),

            "last_device_activity":
                BehaviorAnalysisService.format_datetime(
                    behavior.last_device_activity
                )
        }

    # ============================================================
    # GET ALL EMPLOYEE BEHAVIOR
    # ============================================================

    @staticmethod
    def get_all_behavior(
        db: Session,
        skip: int = 0,
        limit: int = 100
    ):

        skip = max(
            int(skip),
            0
        )

        limit = min(
            max(int(limit), 1),
            100
        )

        rows = (
            db.query(EmployeeBehaviorFeatures)
            .order_by(
                EmployeeBehaviorFeatures.employee_id
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

        results = []

        for row in rows:

            result = (
                BehaviorAnalysisService
                .get_employee_behavior(
                    db,
                    row.employee_id
                )
            )

            if result:
                results.append(result)

        return results