import os
import re
from typing import List
import pandas as pd
import numpy as np


class FilePreprocessor:
    """
    Memory-optimized chunked preprocessor for CERT R4.2 file.csv logs.
    Raw columns expected: id, date, user, pc, filename, (activity or content)
    """
    USECOLS = ["id", "date", "user", "pc", "filename", "activity", "content"]
    DTYPES = {
        "id": "string",
        "user": "string",
        "pc": "string",
        "filename": "string"
    }

    SENSITIVE_PATTERNS = re.compile(
        r"(?:confidential|proprietary|secret|password|financial|salary|customer|source|code|database|export|backup|\.zip|\.tar|\.7z|\.iso|\.key|\.pem)",
        re.IGNORECASE
    )

    def __init__(self, chunk_size: int = 100000):
        self.chunk_size = chunk_size

    def process_file(self, file_path: str) -> pd.DataFrame:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"File log not found at {file_path}")

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
            "file_activity_count": "sum",
            "unique_files": "max",
            "sensitive_file_activity": "sum",
            "after_hours_file": "sum",
            "weekend_file": "max"
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

        # Check sensitive file indicators in filename
        df["filename_clean"] = df["filename"].fillna("")
        df["is_sensitive"] = df["filename_clean"].str.contains(self.SENSITIVE_PATTERNS).astype(int)

        df["is_after_hours_file"] = is_after_hours.astype(int)
        df["is_weekend_file"] = is_weekend.astype(int)

        grouped = df.groupby(["user", "date_str"]).agg(
            file_activity_count=("id", "count"),
            unique_files=("filename", "nunique"),
            sensitive_file_activity=("is_sensitive", "sum"),
            after_hours_file=("is_after_hours_file", "sum"),
            weekend_file=("is_weekend_file", "max")
        ).reset_index()

        grouped.rename(columns={"date_str": "date"}, inplace=True)
        return grouped
