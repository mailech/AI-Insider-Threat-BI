import os
from typing import Optional
import pandas as pd


class GroundTruthPreprocessor:
    """
    Parser for CERT R4.2 ground truth answer keys (answers/insiders.csv).
    CRITICAL CONSTRAINT: Answer key labels are strictly for training evaluation and must NEVER be used as input features.
    """
    def process_file(self, file_path: str) -> pd.DataFrame:
        if not os.path.exists(file_path):
            return pd.DataFrame(columns=["dataset", "scenario", "details", "user", "start", "end"])

        df = pd.read_csv(file_path, dtype=str)
        # Normalize column names
        df.columns = [c.lower().strip() for c in df.columns]
        
        # Ensure user column exists
        if "user" not in df.columns and "user_id" in df.columns:
            df["user"] = df["user_id"]

        return df

    def match_daily_labels(self, features_df: pd.DataFrame, ground_truth_df: pd.DataFrame) -> pd.Series:
        """
        Creates a boolean ground-truth label array for daily user feature records.
        A record is labeled as 1 (Malicious) if user matches and date falls within [start, end].
        """
        if ground_truth_df.empty or features_df.empty:
            return pd.Series(0, index=features_df.index)

        labels = pd.Series(0, index=features_df.index)
        
        # Parse dates
        features_dates = pd.to_datetime(features_df["date"], errors="coerce")

        for _, row in ground_truth_df.iterrows():
            target_user = str(row.get("user", "")).strip()
            start_dt = pd.to_datetime(row.get("start"), errors="coerce")
            end_dt = pd.to_datetime(row.get("end"), errors="coerce")

            if not target_user or pd.isna(start_dt) or pd.isna(end_dt):
                continue

            user_mask = (features_df["user_id"] == target_user)
            date_mask = (features_dates >= start_dt) & (features_dates <= end_dt)
            labels.loc[user_mask & date_mask] = 1

        return labels
