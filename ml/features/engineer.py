from typing import List, Optional
import pandas as pd
import numpy as np


class BehavioralFeatureEngineer:
    """
    Engineers advanced behavioral indicators, rolling averages, personal baseline z-scores,
    and anomalous deviation scores over the aggregated daily CERT user event matrix.
    """
    
    BASE_NUMERIC_COLS = [
        "login_count", "logout_count", "after_hours_logon", "weekend_logon", "unique_pcs",
        "device_connect_count", "device_disconnect_count", "after_hours_device", "weekend_device",
        "file_activity_count", "unique_files", "sensitive_file_activity", "after_hours_file", "weekend_file",
        "http_request_count", "unique_domains", "after_hours_http", "weekend_http", "suspicious_domain_count",
        "email_count", "attachment_count", "recipient_count", "avg_email_size", "after_hours_email", "weekend_email"
    ]

    def __init__(self, rolling_window: int = 7, min_periods: int = 2):
        self.rolling_window = rolling_window
        self.min_periods = min_periods

    def engineer_features(self, df: pd.DataFrame) -> pd.DataFrame:
        if df.empty:
            return pd.DataFrame()

        df = df.copy()
        
        # Ensure proper sorting by user and chronological date
        df["date_dt"] = pd.to_datetime(df["date"], errors="coerce")
        df = df.sort_values(by=["user_id", "date_dt"]).reset_index(drop=True)

        # 1. Total Daily Activity Volume
        df["total_activity_volume"] = (
            df.get("login_count", 0) +
            df.get("device_connect_count", 0) +
            df.get("file_activity_count", 0) +
            df.get("http_request_count", 0) +
            df.get("email_count", 0)
        )

        # 2. Rolling Historical Baseline Metrics per Employee
        # We use shift(1) so baseline strictly reflects past normal behavior (no lookahead data leakage)
        feature_dfs = []
        for user_id, user_group in df.groupby("user_id"):
            user_group = user_group.sort_values("date_dt").copy()
            
            # Rolling Mean & Std for Activity Volume
            shifted_vol = user_group["total_activity_volume"].shift(1)
            user_group["rolling_activity_avg_7d"] = shifted_vol.rolling(self.rolling_window, min_periods=1).mean().fillna(user_group["total_activity_volume"])
            user_group["rolling_activity_std_7d"] = shifted_vol.rolling(self.rolling_window, min_periods=1).std().fillna(1.0)
            user_group.loc[user_group["rolling_activity_std_7d"] < 1.0, "rolling_activity_std_7d"] = 1.0

            # Z-Score of total activity
            user_group["activity_volume_zscore"] = (
                (user_group["total_activity_volume"] - user_group["rolling_activity_avg_7d"]) / user_group["rolling_activity_std_7d"]
            ).clip(lower=-3.0, upper=10.0)

            # Rolling Mean & Std for Sensitive Files
            shifted_sens = user_group["sensitive_file_activity"].shift(1)
            user_group["rolling_sensitive_file_avg"] = shifted_sens.rolling(self.rolling_window, min_periods=1).mean().fillna(0.0)
            user_group["rolling_sensitive_file_std"] = shifted_sens.rolling(self.rolling_window, min_periods=1).std().fillna(1.0)
            user_group.loc[user_group["rolling_sensitive_file_std"] < 0.5, "rolling_sensitive_file_std"] = 0.5

            user_group["sensitive_file_zscore"] = (
                (user_group["sensitive_file_activity"] - user_group["rolling_sensitive_file_avg"]) / user_group["rolling_sensitive_file_std"]
            ).clip(lower=0.0, upper=10.0)

            # Rolling Mean & Std for Email Attachments
            shifted_att = user_group["attachment_count"].shift(1)
            user_group["rolling_attachment_avg"] = shifted_att.rolling(self.rolling_window, min_periods=1).mean().fillna(0.0)
            user_group["rolling_attachment_std"] = shifted_att.rolling(self.rolling_window, min_periods=1).std().fillna(1.0)
            user_group.loc[user_group["rolling_attachment_std"] < 0.5, "rolling_attachment_std"] = 0.5

            user_group["attachment_zscore"] = (
                (user_group["attachment_count"] - user_group["rolling_attachment_avg"]) / user_group["rolling_attachment_std"]
            ).clip(lower=0.0, upper=10.0)

            # Rolling Mean & Std for File Count
            shifted_file = user_group["file_activity_count"].shift(1)
            user_group["rolling_file_avg"] = shifted_file.rolling(self.rolling_window, min_periods=1).mean().fillna(user_group["file_activity_count"])
            user_group["rolling_file_std"] = shifted_file.rolling(self.rolling_window, min_periods=1).std().fillna(1.0)
            user_group.loc[user_group["rolling_file_std"] < 1.0, "rolling_file_std"] = 1.0

            user_group["file_activity_zscore"] = (
                (user_group["file_activity_count"] - user_group["rolling_file_avg"]) / user_group["rolling_file_std"]
            ).clip(lower=-3.0, upper=10.0)

            feature_dfs.append(user_group)

        df = pd.concat(feature_dfs, ignore_index=True)

        # 3. Behavioral Binary Anomaly Indicators
        # unusual login indicator
        df["unusual_login_indicator"] = (
            (df["after_hours_logon"] > 0) |
            (df["weekend_logon"] > 0) |
            (df["unique_pcs"] > 2)
        ).astype(int)

        # unusual USB activity indicator
        df["unusual_usb_indicator"] = (
            (df["after_hours_device"] > 0) |
            (df["device_connect_count"] >= 1)
        ).astype(int)

        # unusual file activity indicator
        df["unusual_file_indicator"] = (
            (df["sensitive_file_activity"] > 0) |
            (df["file_activity_zscore"] > 2.5) |
            (df["after_hours_file"] > 10)
        ).astype(int)

        # unusual web activity indicator
        df["unusual_web_indicator"] = (
            (df["suspicious_domain_count"] > 0) |
            (df["after_hours_http"] > 150)
        ).astype(int)

        # unusual email activity indicator
        df["unusual_email_indicator"] = (
            (df["attachment_count"] >= 4) |
            (df["attachment_zscore"] > 2.5) |
            (df["avg_email_size"] > 5.0)
        ).astype(int)

        # 4. Composite Activity Deviation Score (0.0 to 1.0)
        # Normalized weighted combination of z-scores and indicator flags
        raw_deviation = (
            df["activity_volume_zscore"].clip(lower=0) * 0.15 +
            df["sensitive_file_zscore"] * 0.25 +
            df["attachment_zscore"] * 0.20 +
            df["unusual_login_indicator"] * 1.5 +
            df["unusual_usb_indicator"] * 2.0 +
            df["unusual_web_indicator"] * 1.5 +
            df["unusual_file_indicator"] * 2.0
        )
        # Scale through a sigmoid-like function to [0, 1]
        df["activity_deviation_score"] = np.round(1.0 / (1.0 + np.exp(-0.6 * (raw_deviation - 2.0))), 4)

        # Clean up temporary date helper column
        if "date_dt" in df.columns:
            df.drop(columns=["date_dt"], inplace=True)

        return df

    def get_feature_column_names(self) -> List[str]:
        """
        Returns list of numerical features used as inputs for machine learning models.
        """
        return [
            # Base Logon features
            "login_count", "logout_count", "after_hours_logon", "weekend_logon", "unique_pcs", "avg_login_hour",
            # Base Device features
            "device_connect_count", "device_disconnect_count", "after_hours_device", "weekend_device",
            # Base File features
            "file_activity_count", "unique_files", "sensitive_file_activity", "after_hours_file", "weekend_file",
            # Base HTTP features
            "http_request_count", "unique_domains", "after_hours_http", "weekend_http", "suspicious_domain_count",
            # Base Email features
            "email_count", "attachment_count", "recipient_count", "avg_email_size", "after_hours_email", "weekend_email",
            # Behavioral & Statistical Z-Score Features
            "total_activity_volume", "rolling_activity_avg_7d", "activity_volume_zscore",
            "sensitive_file_zscore", "attachment_zscore", "file_activity_zscore",
            # Behavioral Anomaly Indicators
            "unusual_login_indicator", "unusual_usb_indicator", "unusual_file_indicator",
            "unusual_web_indicator", "unusual_email_indicator", "activity_deviation_score"
        ]
