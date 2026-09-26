import os
from typing import List
import pandas as pd
import numpy as np


class DevicePreprocessor:
    """
    Memory-optimized chunked preprocessor for CERT R4.2 device.csv (USB/Removable media logs).
    Raw columns expected: id, date, user, pc, activity (Connect / Disconnect)
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
            raise FileNotFoundError(f"Device log file not found at {file_path}")

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

        combined = pd.concat(daily_chunks, ignore_index=True)
        final_df = combined.groupby(["user", "date"], as_index=False).agg({
            "device_connect_count": "sum",
            "device_disconnect_count": "sum",
            "after_hours_device": "sum",
            "weekend_device": "max"
        })
        return final_df

    def process_chunk(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        
        df["timestamp"] = pd.to_datetime(df["date"], errors="coerce")
        df["date_str"] = df["timestamp"].dt.strftime("%Y-%m-%d")
        df["hour"] = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60.0
        df["dayofweek"] = df["timestamp"].dt.dayofweek

        is_after_hours = (df["hour"] < 8.5) | (df["hour"] > 17.5)
        is_weekend = df["dayofweek"] >= 5

        df["is_connect"] = (df["activity"] == "Connect").astype(int)
        df["is_disconnect"] = (df["activity"] == "Disconnect").astype(int)
        df["is_after_hours_dev"] = (df["is_connect"] & is_after_hours).astype(int)
        df["is_weekend_dev"] = (df["is_connect"] & is_weekend).astype(int)

        grouped = df.groupby(["user", "date_str"]).agg(
            device_connect_count=("is_connect", "sum"),
            device_disconnect_count=("is_disconnect", "sum"),
            after_hours_device=("is_after_hours_dev", "sum"),
            weekend_device=("is_weekend_dev", "max")
        ).reset_index()

        grouped.rename(columns={"date_str": "date"}, inplace=True)
        return grouped
