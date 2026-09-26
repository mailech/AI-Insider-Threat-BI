import os
from typing import List
import pandas as pd
import numpy as np


class EmailPreprocessor:
    """
    Memory-optimized chunked preprocessor for CERT R4.2 email.csv logs.
    Raw columns expected: id, date, user, pc, to, cc, bcc, from, size, attachments, content
    """
    USECOLS = ["id", "date", "user", "pc", "to", "cc", "bcc", "from", "size", "attachments"]
    DTYPES = {
        "id": "string",
        "user": "string",
        "pc": "string",
        "to": "string",
        "cc": "string",
        "bcc": "string",
        "from": "string",
        "size": "float64",
        "attachments": "string"
    }

    def __init__(self, chunk_size: int = 100000):
        self.chunk_size = chunk_size

    def process_file(self, file_path: str) -> pd.DataFrame:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"Email log not found at {file_path}")

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
            "email_count": "sum",
            "attachment_count": "sum",
            "recipient_count": "sum",
            "avg_email_size": "mean",
            "after_hours_email": "sum",
            "weekend_email": "max"
        })
        return final_df

    def count_recipients(self, to_val, cc_val, bcc_val) -> int:
        total = 0
        for field in [to_val, cc_val, bcc_val]:
            if isinstance(field, str) and field.strip():
                total += len(field.split(";"))
        return max(1, total)

    def count_attachments(self, att_val) -> int:
        if pd.isna(att_val) or not str(att_val).strip():
            return 0
        val_str = str(att_val).strip()
        if val_str.isdigit():
            return int(val_str)
        return len(val_str.split(";"))

    def process_chunk(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        
        df["timestamp"] = pd.to_datetime(df["date"], errors="coerce")
        df["date_str"] = df["timestamp"].dt.strftime("%Y-%m-%d")
        df["hour"] = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60.0
        df["dayofweek"] = df["timestamp"].dt.dayofweek

        is_after_hours = (df["hour"] < 8.5) | (df["hour"] > 17.5)
        is_weekend = df["dayofweek"] >= 5

        df["num_attachments"] = df["attachments"].apply(self.count_attachments)
        df["num_recipients"] = [
            self.count_recipients(t, c, b)
            for t, c, b in zip(df.get("to", ""), df.get("cc", ""), df.get("bcc", ""))
        ]

        df["size_mb"] = (df["size"].fillna(0) / (1024.0 * 1024.0)).astype(float)
        df["is_after_hours_email"] = is_after_hours.astype(int)
        df["is_weekend_email"] = is_weekend.astype(int)

        grouped = df.groupby(["user", "date_str"]).agg(
            email_count=("id", "count"),
            attachment_count=("num_attachments", "sum"),
            recipient_count=("num_recipients", "sum"),
            avg_email_size=("size_mb", "mean"),
            after_hours_email=("is_after_hours_email", "sum"),
            weekend_email=("is_weekend_email", "max")
        ).reset_index()

        grouped.rename(columns={"date_str": "date"}, inplace=True)
        return grouped
