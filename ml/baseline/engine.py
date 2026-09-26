from typing import List, Dict, Any, Optional
import os
import pandas as pd
import numpy as np
from sqlalchemy.orm import Session
from backend.app.models.baseline import BehavioralBaseline


class BehavioralBaselineEngine:
    """
    Computes, tracks, and persists statistical behavioral baselines for each employee
    across CERT data dimensions (Logon, Device, File, HTTP, Email).
    Enables explainable deviation scoring against personal normal behavior.
    """

    CORE_METRICS = [
        "login_count",
        "after_hours_logon",
        "weekend_logon",
        "unique_pcs",
        "device_connect_count",
        "after_hours_device",
        "file_activity_count",
        "sensitive_file_activity",
        "after_hours_file",
        "http_request_count",
        "suspicious_domain_count",
        "email_count",
        "attachment_count",
        "total_activity_volume"
    ]

    def __init__(self, metrics: Optional[List[str]] = None):
        self.metrics = metrics or self.CORE_METRICS

    def calculate_baselines(self, df: pd.DataFrame, exclude_known_anomalies: bool = True) -> pd.DataFrame:
        """
        Calculates per-employee baseline profiles across all core behavioral metrics.
        If exclude_known_anomalies is True and 'is_insider' / 'is_anomaly' is present,
        malicious rows are excluded to keep baselines pristine.
        """
        if df.empty:
            return pd.DataFrame(columns=[
                "user_id", "metric_name", "mean", "std", "median",
                "q25", "q75", "min_val", "max_val", "normal_hours_start",
                "normal_hours_end", "sample_size"
            ])

        clean_df = df.copy()

        # Ensure total_activity_volume exists
        if "total_activity_volume" not in clean_df.columns:
            clean_df["total_activity_volume"] = (
                clean_df.get("login_count", 0) +
                clean_df.get("device_connect_count", 0) +
                clean_df.get("file_activity_count", 0) +
                clean_df.get("http_request_count", 0) +
                clean_df.get("email_count", 0)
            )

        if exclude_known_anomalies:
            if "is_insider" in clean_df.columns:
                clean_df = clean_df[clean_df["is_insider"] == 0]
            if "is_anomaly" in clean_df.columns:
                clean_df = clean_df[clean_df["is_anomaly"] == 0]

        records = []

        for user_id, user_group in clean_df.groupby("user_id"):
            sample_size = len(user_group)
            
            # Normal working hours heuristic
            avg_logon_hours = user_group.get("avg_login_hour", pd.Series([9.0]))
            normal_start = float(np.clip(avg_logon_hours.mean() if not avg_logon_hours.isna().all() else 8.5, 6.0, 10.0))
            normal_end = float(np.clip(normal_start + 9.0, 16.0, 20.0))

            for metric in self.metrics:
                if metric not in user_group.columns:
                    series = pd.Series([0.0] * sample_size)
                else:
                    series = pd.to_numeric(user_group[metric], errors="coerce").fillna(0.0)

                mean_val = float(series.mean())
                std_val = float(series.std()) if sample_size > 1 else 1.0
                if np.isnan(std_val) or std_val < 0.001:
                    std_val = 1.0  # Avoid zero division in downstream z-scores

                median_val = float(series.median())
                q25_val = float(series.quantile(0.25))
                q75_val = float(series.quantile(0.75))
                min_val = float(series.min())
                max_val = float(series.max())

                records.append({
                    "user_id": str(user_id),
                    "metric_name": metric,
                    "mean": round(mean_val, 4),
                    "std": round(std_val, 4),
                    "median": round(median_val, 4),
                    "q25": round(q25_val, 4),
                    "q75": round(q75_val, 4),
                    "min_val": round(min_val, 4),
                    "max_val": round(max_val, 4),
                    "normal_hours_start": round(normal_start, 2),
                    "normal_hours_end": round(normal_end, 2),
                    "sample_size": sample_size
                })

        baseline_df = pd.DataFrame(records)
        return baseline_df

    def detect_baseline_deviations(
        self,
        daily_record: Dict[str, Any],
        baseline_df: pd.DataFrame,
        z_threshold: float = 3.0
    ) -> Dict[str, Any]:
        """
        Compares an individual daily activity record against the user's established statistical baseline.
        Returns detailed deviation metrics and boolean anomaly flags.
        """
        user_id = str(daily_record.get("user_id", ""))
        user_baselines = baseline_df[baseline_df["user_id"] == user_id]

        if user_baselines.empty:
            return {
                "user_id": user_id,
                "has_baseline": False,
                "deviations": {},
                "anomalous_metrics_count": 0,
                "max_zscore": 0.0
            }

        deviations = {}
        anomalous_count = 0
        max_zscore = 0.0

        for _, row in user_baselines.iterrows():
            metric = row["metric_name"]
            val = float(daily_record.get(metric, 0.0))
            mean = float(row["mean"])
            std = float(row["std"]) if row["std"] > 0 else 1.0
            q75 = float(row["q75"])
            q25 = float(row["q25"])
            iqr = max(q75 - q25, 1.0)
            
            z_score = round((val - mean) / std, 3)
            is_iqr_outlier = val > (q75 + 1.5 * iqr)
            is_z_outlier = z_score >= z_threshold

            if z_score > max_zscore:
                max_zscore = z_score

            is_anomalous = bool(is_z_outlier or is_iqr_outlier)
            if is_anomalous:
                anomalous_count += 1

            deviations[metric] = {
                "observed_value": val,
                "baseline_mean": mean,
                "baseline_std": std,
                "z_score": z_score,
                "is_outlier": is_anomalous
            }

        return {
            "user_id": user_id,
            "has_baseline": True,
            "deviations": deviations,
            "anomalous_metrics_count": anomalous_count,
            "max_zscore": round(max_zscore, 3)
        }

    def save_baselines_to_parquet(
        self,
        baseline_df: pd.DataFrame,
        output_path: str = "data/processed/baselines.parquet"
    ) -> str:
        """Saves calculated baseline table to Parquet cache."""
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        baseline_df.to_parquet(output_path, index=False)
        return output_path

    def load_baselines_from_parquet(
        self,
        input_path: str = "data/processed/baselines.parquet"
    ) -> pd.DataFrame:
        """Loads baseline table from Parquet cache."""
        if not os.path.exists(input_path):
            return pd.DataFrame()
        return pd.read_parquet(input_path)

    def sync_to_db(self, baseline_df: pd.DataFrame, db: Session) -> int:
        """
        Upserts calculated baselines into the SQL database `behavioral_baselines` table.
        """
        if baseline_df.empty:
            return 0

        synced_count = 0
        for _, row in baseline_df.iterrows():
            user_id = str(row["user_id"])
            metric_name = str(row["metric_name"])

            existing = db.query(BehavioralBaseline).filter(
                BehavioralBaseline.user_id == user_id,
                BehavioralBaseline.metric_name == metric_name
            ).first()

            if existing:
                existing.mean = float(row["mean"])
                existing.std = float(row["std"])
                existing.median = float(row["median"])
                existing.q25 = float(row["q25"])
                existing.q75 = float(row["q75"])
                existing.min_val = float(row["min_val"])
                existing.max_val = float(row["max_val"])
                existing.normal_hours_start = float(row["normal_hours_start"])
                existing.normal_hours_end = float(row["normal_hours_end"])
                existing.sample_size = int(row["sample_size"])
            else:
                new_baseline = BehavioralBaseline(
                    user_id=user_id,
                    metric_name=metric_name,
                    mean=float(row["mean"]),
                    std=float(row["std"]),
                    median=float(row["median"]),
                    q25=float(row["q25"]),
                    q75=float(row["q75"]),
                    min_val=float(row["min_val"]),
                    max_val=float(row["max_val"]),
                    normal_hours_start=float(row["normal_hours_start"]),
                    normal_hours_end=float(row["normal_hours_end"]),
                    sample_size=int(row["sample_size"])
                )
                db.add(new_baseline)
            synced_count += 1

        db.commit()
        return synced_count
