from sqlalchemy.orm import Session
from sqlalchemy import text

from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler

from app.models.risk import Risk

import numpy as np
import math


class RiskService:

    # ============================================================
    # FEATURES USED BY THE ML MODEL
    # ============================================================

    FEATURE_COLUMNS = [
        "total_logon_events",
        "logon_events",
        "logoff_events",
        "logon_unique_devices",

        "total_emails",
        "emails_with_attachments",
        "emails_without_attachments",
        "average_email_size",
        "email_unique_devices",

        "total_file_events",
        "unique_files",
        "file_unique_devices",

        "total_http_events",
        "unique_websites",
        "http_unique_devices",

        "total_device_events",
        "device_unique_devices",
        "device_activity_types",
    ]

    # ============================================================
    # SAFE NUMBER
    # ============================================================

    @staticmethod
    def safe_number(value):

        if value is None:
            return 0.0

        try:
            number = float(value)

            if not math.isfinite(number):
                return 0.0

            return number

        except (TypeError, ValueError):

            return 0.0

    # ============================================================
    # GET ALL BEHAVIOR FEATURES
    # ============================================================

    @staticmethod
    def get_feature_rows(db: Session):

        query = text("""
            SELECT
                employee_id,

                total_logon_events,
                logon_events,
                logoff_events,
                logon_unique_devices,

                total_emails,
                emails_with_attachments,
                emails_without_attachments,
                average_email_size,
                email_unique_devices,

                total_file_events,
                unique_files,
                file_unique_devices,

                total_http_events,
                unique_websites,
                http_unique_devices,

                total_device_events,
                device_unique_devices,
                device_activity_types

            FROM employee_behavior_features
            ORDER BY employee_id
        """)

        result = db.execute(query)

        return result.mappings().all()

    # ============================================================
    # CALCULATE RISK FOR ALL EMPLOYEES
    # ============================================================

    @staticmethod
    def calculate_all_risks(db: Session):

        # --------------------------------------------------------
        # Load 1000 behavioral feature records
        # --------------------------------------------------------

        rows = RiskService.get_feature_rows(db)

        if not rows:

            return {
                "message": "No behavioral feature records found.",
                "processed": 0,
                "low": 0,
                "medium": 0,
                "high": 0,
                "critical": 0
            }

        employee_ids = []

        feature_matrix = []

        activity_totals = []

        # --------------------------------------------------------
        # Build feature matrix
        # --------------------------------------------------------

        for row in rows:

            employee_ids.append(
                str(row["employee_id"])
            )

            features = []

            for column in RiskService.FEATURE_COLUMNS:

                value = RiskService.safe_number(
                    row[column]
                )

                features.append(value)

            feature_matrix.append(features)

            # ----------------------------------------------------
            # Overall activity volume
            # ----------------------------------------------------

            activity_total = sum([
                RiskService.safe_number(
                    row["total_logon_events"]
                ),

                RiskService.safe_number(
                    row["total_emails"]
                ),

                RiskService.safe_number(
                    row["total_file_events"]
                ),

                RiskService.safe_number(
                    row["total_http_events"]
                ),

                RiskService.safe_number(
                    row["total_device_events"]
                )
            ])

            activity_totals.append(
                math.log1p(activity_total)
            )

        # --------------------------------------------------------
        # Convert to numpy
        # --------------------------------------------------------

        X = np.asarray(
            feature_matrix,
            dtype=float
        )

        # --------------------------------------------------------
        # Replace invalid values
        # --------------------------------------------------------

        X = np.nan_to_num(
            X,
            nan=0.0,
            posinf=0.0,
            neginf=0.0
        )

        # --------------------------------------------------------
        # Standardize features
        # --------------------------------------------------------

        scaler = StandardScaler()

        X_scaled = scaler.fit_transform(X)

        # --------------------------------------------------------
        # Isolation Forest
        # --------------------------------------------------------

        model = IsolationForest(
            n_estimators=200,
            contamination="auto",
            random_state=42,
            n_jobs=-1
        )

        model.fit(X_scaled)

        # --------------------------------------------------------
        # Isolation Forest anomaly scores
        #
        # Higher value after inversion = higher risk
        # --------------------------------------------------------

        raw_scores = model.score_samples(
            X_scaled
        )

        min_score = float(
            np.min(raw_scores)
        )

        max_score = float(
            np.max(raw_scores)
        )

        score_range = (
            max_score - min_score
        )

        if score_range == 0:

            ml_scores = np.zeros(
                len(raw_scores)
            )

        else:

            ml_scores = (
                (max_score - raw_scores)
                / score_range
            ) * 100.0

        # --------------------------------------------------------
        # Activity score
        # --------------------------------------------------------

        activity_array = np.asarray(
            activity_totals,
            dtype=float
        )

        min_activity = float(
            np.min(activity_array)
        )

        max_activity = float(
            np.max(activity_array)
        )

        activity_range = (
            max_activity - min_activity
        )

        if activity_range == 0:

            activity_scores = np.zeros(
                len(activity_array)
            )

        else:

            activity_scores = (
                (activity_array - min_activity)
                / activity_range
            ) * 100.0

        # --------------------------------------------------------
        # Final risk score
        #
        # 70% ML anomaly
        # 30% activity intensity
        # --------------------------------------------------------

        final_scores = (
            (ml_scores * 0.70)
            +
            (activity_scores * 0.30)
        )

        final_scores = np.clip(
            np.rint(final_scores),
            0,
            100
        ).astype(int)

        # --------------------------------------------------------
        # Counters
        # --------------------------------------------------------

        low_count = 0
        medium_count = 0
        high_count = 0
        critical_count = 0

        # --------------------------------------------------------
        # Save risk records
        # --------------------------------------------------------

        for index, employee_id in enumerate(
            employee_ids
        ):

            score = int(
                final_scores[index]
            )

            # ----------------------------------------------------
            # Risk classification
            # ----------------------------------------------------

            if score >= 80:

                level = "CRITICAL"

                critical_count += 1

            elif score >= 60:

                level = "HIGH"

                high_count += 1

            elif score >= 30:

                level = "MEDIUM"

                medium_count += 1

            else:

                level = "LOW"

                low_count += 1

            # ----------------------------------------------------
            # Find existing record
            # ----------------------------------------------------

            existing = (
                db.query(Risk)
                .filter(
                    Risk.employee_id == employee_id
                )
                .first()
            )

            if existing:

                existing.risk_score = score
                existing.risk_level = level

            else:

                new_risk = Risk(
                    employee_id=employee_id,
                    risk_score=score,
                    risk_level=level
                )

                db.add(new_risk)

        # --------------------------------------------------------
        # Commit
        # --------------------------------------------------------

        db.commit()

        return {
            "message": "Risk analysis completed successfully.",

            "processed": len(employee_ids),

            "low": low_count,

            "medium": medium_count,

            "high": high_count,

            "critical": critical_count
        }

    # ============================================================
    # GET ALL RISKS
    # ============================================================

    @staticmethod
    def get_all_risks(
        db: Session,
        skip: int = 0,
        limit: int = 100
    ):

        return (
            db.query(Risk)
            .order_by(
                Risk.risk_score.desc()
            )
            .offset(skip)
            .limit(limit)
            .all()
        )

    # ============================================================
    # GET ONE EMPLOYEE RISK
    # ============================================================

    @staticmethod
    def get_risk_by_employee(
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
    # RISK SUMMARY
    # ============================================================

    @staticmethod
    def get_risk_summary(
        db: Session
    ):

        low = (
            db.query(Risk)
            .filter(
                Risk.risk_level == "LOW"
            )
            .count()
        )

        medium = (
            db.query(Risk)
            .filter(
                Risk.risk_level == "MEDIUM"
            )
            .count()
        )

        high = (
            db.query(Risk)
            .filter(
                Risk.risk_level == "HIGH"
            )
            .count()
        )

        critical = (
            db.query(Risk)
            .filter(
                Risk.risk_level == "CRITICAL"
            )
            .count()
        )

        total = (
            db.query(Risk)
            .count()
        )

        return {
            "total": total,
            "low": low,
            "medium": medium,
            "high": high,
            "critical": critical
        }