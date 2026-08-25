from pathlib import Path
import json
import math
from urllib.parse import urlparse

import joblib
import pandas as pd
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.models.risk import Risk
from app.models.logon import LogonActivity
from app.models.email import EmailActivity
from app.models.file_activity import FileActivity
from app.models.http_activity import HttpActivity
from app.models.device import DeviceActivity
from app.models.psychometric import PsychometricProfile


class RiskService:

    # ============================================================
    # ML MODEL PATHS
    # ============================================================

    # File location:
    # backend/app/services/risk_service.py
    #
    # parents[0] = services
    # parents[1] = app
    # parents[2] = backend

    BACKEND_ROOT = Path(__file__).resolve().parents[2]

    MODEL_DIR = BACKEND_ROOT / "ml" / "models"

    MODEL_PATH = MODEL_DIR / "isolation_forest.pkl"
    SCALER_PATH = MODEL_DIR / "scaler.pkl"
    FEATURES_PATH = MODEL_DIR / "feature_columns.txt"
    CALIBRATION_PATH = MODEL_DIR / "risk_calibration.json"

    # ============================================================
    # CACHED MODEL OBJECTS
    # ============================================================

    _model = None
    _scaler = None
    _feature_columns = None
    _calibration = None

    # ============================================================
    # LOAD TRAINED ML ARTIFACTS
    # ============================================================

    @classmethod
    def _load_ml_artifacts(cls):

        if (
            cls._model is not None
            and cls._scaler is not None
            and cls._feature_columns is not None
            and cls._calibration is not None
        ):
            return

        required_files = [
            cls.MODEL_PATH,
            cls.SCALER_PATH,
            cls.FEATURES_PATH,
            cls.CALIBRATION_PATH,
        ]

        missing_files = [
            str(path)
            for path in required_files
            if not path.exists()
        ]

        if missing_files:
            raise FileNotFoundError(
                "Required ML files are missing:\n"
                + "\n".join(missing_files)
            )

        cls._model = joblib.load(
            cls.MODEL_PATH
        )

        cls._scaler = joblib.load(
            cls.SCALER_PATH
        )

        with open(
            cls.FEATURES_PATH,
            "r",
            encoding="utf-8"
        ) as file:

            cls._feature_columns = [
                line.strip()
                for line in file
                if line.strip()
            ]

        with open(
            cls.CALIBRATION_PATH,
            "r",
            encoding="utf-8"
        ) as file:

            cls._calibration = json.load(file)

        if len(cls._feature_columns) != 24:
            raise ValueError(
                "Expected 24 ML features, "
                f"but found {len(cls._feature_columns)}."
            )

    # ============================================================
    # HELPER FUNCTIONS
    # ============================================================

    @staticmethod
    def _safe_int(value) -> int:

        if value is None:
            return 0

        try:
            return int(value)

        except (TypeError, ValueError):
            return 0

    @staticmethod
    def _safe_float(value) -> float:

        if value is None:
            return 0.0

        try:
            value = float(value)

            if not math.isfinite(value):
                return 0.0

            return value

        except (TypeError, ValueError):
            return 0.0

    @staticmethod
    def _clamp(
        value: float,
        minimum: float = 0.0,
        maximum: float = 100.0,
    ) -> float:

        return max(
            minimum,
            min(float(value), maximum)
        )

    @staticmethod
    def _risk_level(score: int) -> str:

        if score >= 75:
            return "CRITICAL"

        if score >= 50:
            return "HIGH"

        if score >= 25:
            return "MEDIUM"

        return "LOW"

    @staticmethod
    def _count_activity(
        db: Session,
        model,
        user_id: str,
    ) -> int:

        return (
            db.query(
                func.count(model.id)
            )
            .filter(
                model.user_id == user_id
            )
            .scalar()
            or 0
        )

    # ============================================================
    # ATTACHMENT COUNT
    # ============================================================

    @staticmethod
    def _attachment_count(value) -> int:

        if value is None:
            return 0

        text = str(value).strip()

        if not text:
            return 0

        # Numeric attachment count
        try:
            return int(float(text))

        except ValueError:
            pass

        # Handle multiple attachments
        for separator in [";", ",", "|"]:

            if separator in text:

                parts = [
                    part.strip()
                    for part in text.split(separator)
                    if part.strip()
                ]

                return len(parts)

        return 1

    # ============================================================
    # BUILD EXACT 24 FEATURES
    # ============================================================

    @classmethod
    def _build_user_features(
        cls,
        db: Session,
        user_id: str,
    ) -> dict:

        # ========================================================
        # LOGON
        # ========================================================

        logon_count = cls._count_activity(
            db,
            LogonActivity,
            user_id
        )

        logoff_count = (
            db.query(
                func.count(LogonActivity.id)
            )
            .filter(
                LogonActivity.user_id == user_id,
                LogonActivity.activity == "Logoff"
            )
            .scalar()
            or 0
        )

        after_hours_logon_count = (
            db.query(
                func.count(LogonActivity.id)
            )
            .filter(
                LogonActivity.user_id == user_id,
                LogonActivity.activity == "Logon",
                (
                    (
                        func.extract(
                            "hour",
                            LogonActivity.event_time
                        ) < 6
                    )
                    |
                    (
                        func.extract(
                            "hour",
                            LogonActivity.event_time
                        ) >= 22
                    )
                )
            )
            .scalar()
            or 0
        )

        after_hours_logoff_count = (
            db.query(
                func.count(LogonActivity.id)
            )
            .filter(
                LogonActivity.user_id == user_id,
                LogonActivity.activity == "Logoff",
                (
                    (
                        func.extract(
                            "hour",
                            LogonActivity.event_time
                        ) < 6
                    )
                    |
                    (
                        func.extract(
                            "hour",
                            LogonActivity.event_time
                        ) >= 22
                    )
                )
            )
            .scalar()
            or 0
        )

        unique_pc_count = (
            db.query(
                func.count(
                    func.distinct(
                        LogonActivity.pc
                    )
                )
            )
            .filter(
                LogonActivity.user_id == user_id
            )
            .scalar()
            or 0
        )

        # ========================================================
        # EMAIL
        # ========================================================

        email_count = cls._count_activity(
            db,
            EmailActivity,
            user_id
        )

        email_rows = (
            db.query(
                EmailActivity.attachments
            )
            .filter(
                EmailActivity.user_id == user_id
            )
            .all()
        )

        emails_with_attachments = 0
        total_attachments = 0

        for row in email_rows:

            attachment_count = (
                cls._attachment_count(
                    row[0]
                )
            )

            if attachment_count > 0:

                emails_with_attachments += 1

                total_attachments += (
                    attachment_count
                )

        total_email_size = (
            db.query(
                func.coalesce(
                    func.sum(
                        EmailActivity.email_size
                    ),
                    0
                )
            )
            .filter(
                EmailActivity.user_id == user_id
            )
            .scalar()
            or 0
        )

        unique_recipients = (
            db.query(
                func.count(
                    func.distinct(
                        EmailActivity.recipient_to
                    )
                )
            )
            .filter(
                EmailActivity.user_id == user_id,
                EmailActivity.recipient_to.isnot(None),
                EmailActivity.recipient_to != ""
            )
            .scalar()
            or 0
        )

        # ========================================================
        # FILE
        # ========================================================

        file_activity_count = (
            cls._count_activity(
                db,
                FileActivity,
                user_id
            )
        )

        unique_files = (
            db.query(
                func.count(
                    func.distinct(
                        FileActivity.filename
                    )
                )
            )
            .filter(
                FileActivity.user_id == user_id
            )
            .scalar()
            or 0
        )

        unique_file_pcs = (
            db.query(
                func.count(
                    func.distinct(
                        FileActivity.pc
                    )
                )
            )
            .filter(
                FileActivity.user_id == user_id
            )
            .scalar()
            or 0
        )

        # ========================================================
        # HTTP
        # ========================================================

        http_request_count = (
            cls._count_activity(
                db,
                HttpActivity,
                user_id
            )
        )

        # unique_http_pc_count was removed
        # because it was constant during training.

        http_rows = (
            db.query(
                HttpActivity.url
            )
            .filter(
                HttpActivity.user_id == user_id
            )
            .all()
        )

        domains = set()

        for row in http_rows:

            url = row[0]

            if not url:
                continue

            try:

                url = str(url).strip()

                if not url.startswith(
                    ("http://", "https://")
                ):
                    url = "http://" + url

                parsed = urlparse(url)

                domain = (
                    parsed.netloc
                    .lower()
                )

                if domain:
                    domains.add(domain)

            except Exception:
                continue

        unique_domain_count = len(domains)

        # ========================================================
        # DEVICE
        # ========================================================

        device_activity_count = (
            cls._count_activity(
                db,
                DeviceActivity,
                user_id
            )
        )

        device_connect_count = (
            db.query(
                func.count(DeviceActivity.id)
            )
            .filter(
                DeviceActivity.user_id == user_id,
                DeviceActivity.activity == "Connect"
            )
            .scalar()
            or 0
        )

        device_disconnect_count = (
            db.query(
                func.count(DeviceActivity.id)
            )
            .filter(
                DeviceActivity.user_id == user_id,
                DeviceActivity.activity == "Disconnect"
            )
            .scalar()
            or 0
        )

        unique_device_pc_count = (
            db.query(
                func.count(
                    func.distinct(
                        DeviceActivity.pc
                    )
                )
            )
            .filter(
                DeviceActivity.user_id == user_id
            )
            .scalar()
            or 0
        )

        # ========================================================
        # PSYCHOMETRIC
        # ========================================================

        psychometric = (
            db.query(
                PsychometricProfile
            )
            .filter(
                PsychometricProfile.user_id == user_id
            )
            .first()
        )

        O = 0
        C = 0
        E = 0
        A = 0
        N = 0

        if psychometric:

            O = cls._safe_int(
                psychometric.openness
            )

            C = cls._safe_int(
                psychometric.conscientiousness
            )

            E = cls._safe_int(
                psychometric.extraversion
            )

            A = cls._safe_int(
                psychometric.agreeableness
            )

            N = cls._safe_int(
                psychometric.neuroticism
            )

        # ========================================================
        # EXACT TRAINING FEATURE DICTIONARY
        # ========================================================

        return {

            "O": O,
            "C": C,
            "E": E,
            "A": A,
            "N": N,

            "logon_count":
                logon_count,

            "logoff_count":
                logoff_count,

            "after_hours_logon_count":
                after_hours_logon_count,

            "after_hours_logoff_count":
                after_hours_logoff_count,

            "unique_pc_count":
                unique_pc_count,

            "email_count":
                email_count,

            "emails_with_attachments":
                emails_with_attachments,

            "total_attachments":
                total_attachments,

            "total_email_size":
                total_email_size,

            "unique_recipients":
                unique_recipients,

            "file_activity_count":
                file_activity_count,

            "unique_files":
                unique_files,

            "unique_file_pcs":
                unique_file_pcs,

            "http_request_count":
                http_request_count,

            "unique_domain_count":
                unique_domain_count,

            "device_activity_count":
                device_activity_count,

            "device_connect_count":
                device_connect_count,

            "device_disconnect_count":
                device_disconnect_count,

            "unique_device_pc_count":
                unique_device_pc_count,
        }

    # ============================================================
    # CALCULATE RISK
    # ============================================================

    @classmethod
    def calculate_risk(
        cls,
        db: Session,
        user_id: str,
    ) -> dict:

        # Load saved ML model
        cls._load_ml_artifacts()

        # Build user's 24 features
        features = cls._build_user_features(
            db,
            user_id
        )

        # Check exact feature compatibility
        missing_features = [
            column
            for column in cls._feature_columns
            if column not in features
        ]

        if missing_features:

            raise ValueError(
                "Missing ML features: "
                + ", ".join(
                    missing_features
                )
            )

        # Preserve EXACT training order
        feature_values = [
            cls._safe_float(
                features[column]
            )
            for column in cls._feature_columns
        ]

        feature_df = pd.DataFrame(
            [feature_values],
            columns=cls._feature_columns
        )

        # ========================================================
        # SCALE
        # ========================================================

        scaled_features = (
            cls._scaler.transform(
                feature_df
            )
        )

        # ========================================================
        # ISOLATION FOREST
        # ========================================================

        prediction = int(
            cls._model.predict(
                scaled_features
            )[0]
        )

        raw_score = float(
            cls._model.decision_function(
                scaled_features
            )[0]
        )

        # ========================================================
        # CONVERT TO 0-100 RISK SCORE
        # ========================================================

        anomaly_strength = -raw_score

        min_strength = float(
            cls._calibration[
                "min_anomaly_strength"
            ]
        )

        max_strength = float(
            cls._calibration[
                "max_anomaly_strength"
            ]
        )

        if max_strength == min_strength:

            risk_score = 0.0

        else:

            risk_score = (
                (
                    anomaly_strength
                    - min_strength
                )
                /
                (
                    max_strength
                    - min_strength
                )
                * 100
            )

        risk_score = cls._clamp(
            risk_score
        )

        risk_score = int(
            round(risk_score)
        )

        risk_level = cls._risk_level(
            risk_score
        )

        # ========================================================
        # EXPLANATION INDICATORS
        # ========================================================

        logon_count = features[
            "logon_count"
        ]

        after_hours_count = (
            features[
                "after_hours_logon_count"
            ]
            +
            features[
                "after_hours_logoff_count"
            ]
        )

        behavioral_anomalies = cls._clamp(
            after_hours_count
            /
            max(logon_count, 1)
            * 100
        )

        device_activity = features[
            "device_activity_count"
        ]

        privilege_misuse = cls._clamp(
            device_activity
            / 100
            * 100
        )

        file_activity = features[
            "file_activity_count"
        ]

        email_count = features[
            "email_count"
        ]

        attachments = features[
            "total_attachments"
        ]

        data_access_violations = cls._clamp(
            (
                file_activity
                + attachments
            )
            /
            max(
                file_activity
                + email_count
                + attachments,
                1
            )
            * 100
        )

        http_count = features[
            "http_request_count"
        ]

        access_pattern_deviations = cls._clamp(
            http_count
            / 2000
            * 100
        )

        # Historical signal
        previous_risk = (
            db.query(Risk)
            .filter(
                Risk.employee_id == user_id
            )
            .first()
        )

        historical_security_events = 0.0

        if previous_risk:

            historical_security_events = (
                float(
                    previous_risk.risk_score
                )
            )

        # ========================================================
        # EXPLANATION
        # ========================================================

        explanation_parts = []

        if prediction == -1:

            explanation_parts.append(
                "Behavioral pattern identified "
                "as anomalous by the Isolation "
                "Forest model"
            )

        else:

            explanation_parts.append(
                "Behavioral pattern is within "
                "the observed population range"
            )

        if behavioral_anomalies >= 50:

            explanation_parts.append(
                "elevated after-hours activity"
            )

        if privilege_misuse >= 60:

            explanation_parts.append(
                "elevated device activity"
            )

        if data_access_violations >= 60:

            explanation_parts.append(
                "elevated file/email activity"
            )

        if access_pattern_deviations >= 60:

            explanation_parts.append(
                "elevated HTTP activity"
            )

        explanation_parts.append(
            f"ML risk score: {risk_score}/100"
        )

        explanation = ". ".join(
            explanation_parts
        )

        # ========================================================
        # FINAL RESPONSE
        # ========================================================

        return {

            "employee_id":
                user_id,

            "risk_score":
                risk_score,

            "risk_level":
                risk_level,

            "behavioral_anomalies":
                round(
                    behavioral_anomalies,
                    2
                ),

            "privilege_misuse":
                round(
                    privilege_misuse,
                    2
                ),

            "data_access_violations":
                round(
                    data_access_violations,
                    2
                ),

            "access_pattern_deviations":
                round(
                    access_pattern_deviations,
                    2
                ),

            "historical_security_events":
                round(
                    historical_security_events,
                    2
                ),

            "explanation":
                explanation
        }

    # ============================================================
    # CALCULATE + SAVE
    # ============================================================

    @classmethod
    def calculate_and_save(
        cls,
        db: Session,
        user_id: str,
    ) -> dict:

        result = cls.calculate_risk(
            db,
            user_id
        )

        risk = (
            db.query(Risk)
            .filter(
                Risk.employee_id == user_id
            )
            .first()
        )

        if risk:

            risk.risk_score = (
                result["risk_score"]
            )

            risk.risk_level = (
                result["risk_level"]
            )

        else:

            risk = Risk(
                employee_id=result[
                    "employee_id"
                ],
                risk_score=result[
                    "risk_score"
                ],
                risk_level=result[
                    "risk_level"
                ]
            )

            db.add(risk)

        db.commit()
        db.refresh(risk)

        return result

    # ============================================================
    # GET ALL RISKS
    # ============================================================

    @staticmethod
    def get_all_risks(
        db: Session
    ):

        return (
            db.query(Risk)
            .order_by(
                Risk.risk_score.desc()
            )
            .all()
        )

    # ============================================================
    # GET RISK FOR ONE USER
    # ============================================================

    @staticmethod
    def get_risk_by_user(
        db: Session,
        user_id: str
    ):

        return (
            db.query(Risk)
            .filter(
                Risk.employee_id == user_id
            )
            .first()
        )