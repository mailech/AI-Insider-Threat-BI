import os
from typing import Generator, Optional, List, Dict
import pandas as pd
import numpy as np


class LogonPreprocessor:
    """
    Memory-optimized chunked preprocessor for CERT R4.2 logon.csv logs.
    Raw columns expected: id, date, user, pc, activity
    """
    USECOLS = ["id", "date", "user", "pc", "activity"]
    DTYPES = {
        "id": "string",
        "user": "string",
        "pc": "string",
        "activity": "category"
    }

    def __init__(self, chunk_size: int = 100000):
        self.chunk_size = chunk_size

    def process_file(self, file_path: str) -> pd.DataFrame:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Logon log file not found at {file_path}")

        daily_chunks: List[pd.DataFrame] = []

        for chunk in pd.read_csv(
            file_path,
            usecols=lambda c: c in self.USECOLS,
            dtype=self.DTYPES,
            chunksize=self.chunk_size,
            engine="c"
        ):
            daily_chunk = self.process_chunk(chunk)
            daily_chunks.append(daily_chunk)

        if not daily_chunks:
            return pd.DataFrame()

        # Combine chunk aggregates into finalized daily user summary
        combined = pd.concat(daily_chunks, ignore_index=True)
        final_df = combined.groupby(["user", "date"], as_index=False).agg({
            "login_count": "sum",
            "logout_count": "sum",
            "after_hours_logon": "sum",
            "weekend_logon": "max",
            "unique_pcs": "max",
            "avg_login_hour": "mean"
        })
        return final_df

    def process_chunk(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        
        # Parse datetime - CERT timestamps are typically MM/DD/YYYY HH:MM:SS
        df["timestamp"] = pd.to_datetime(df["date"], errors="coerce")
        df["date_str"] = df["timestamp"].dt.strftime("%Y-%m-%d")
        df["hour"] = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60.0
        df["dayofweek"] = df["timestamp"].dt.dayofweek  # 5=Sat, 6=Sun

        # Working hours baseline definition: 08:30 to 17:30 Monday-Friday
        is_after_hours = (df["hour"] < 8.5) | (df["hour"] > 17.5)
        is_weekend = df["dayofweek"] >= 5

        df["is_logon"] = (df["activity"] == "Logon").astype(int)
        df["is_logoff"] = (df["activity"] == "Logoff").astype(int)
        df["is_after_hours_logon"] = (df["is_logon"] & is_after_hours).astype(int)
        df["is_weekend_logon"] = (df["is_logon"] & is_weekend).astype(int)

        # Aggregate per user and date
        grouped = df.groupby(["user", "date_str"]).agg(
            login_count=("is_logon", "sum"),
            logout_count=("is_logoff", "sum"),
            after_hours_logon=("is_after_hours_logon", "sum"),
            weekend_logon=("is_weekend_logon", "max"),
            unique_pcs=("pc", "nunique"),
            avg_login_hour=("hour", lambda h: h[df.loc[h.index, "is_logon"] == 1].mean() if (df.loc[h.index, "is_logon"] == 1).any() else 9.0)
        ).reset_index()

        grouped.rename(columns={"date_str": "date"}, inplace=True)
        grouped["avg_login_hour"] = grouped["avg_login_hour"].fillna(9.0)
        return grouped
