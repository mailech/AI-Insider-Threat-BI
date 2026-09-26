import os
import re
from typing import List
from urllib.parse import urlparse
import pandas as pd
import numpy as np


class HttpPreprocessor:
    """
    Memory-optimized chunked preprocessor for CERT R4.2 http.csv web logs.
    Raw columns expected: id, date, user, pc, url, (content)
    """
    USECOLS = ["id", "date", "user", "pc", "url"]
    DTYPES = {
        "id": "string",
        "user": "string",
        "pc": "string",
        "url": "string"
    }

    SUSPICIOUS_DOMAINS_PATTERN = re.compile(
        r"(?:mega\.nz|dropbox\.com|wetransfer\.com|pastebin\.com|anonfiles\.com|wikileaks\.org|thepiratebay|torrent|jobsearch|monster\.com|indeed\.com|linkedin\.com/jobs|filedropper\.com|mediafire\.com|sendspace\.com)",
        re.IGNORECASE
    )

    def __init__(self, chunk_size: int = 100000):
        self.chunk_size = chunk_size

    def process_file(self, file_path: str) -> pd.DataFrame:
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"HTTP log not found at {file_path}")

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
            "http_request_count": "sum",
            "unique_domains": "max",
            "after_hours_http": "sum",
            "weekend_http": "max",
            "suspicious_domain_count": "sum"
        })
        return final_df

    def extract_domain(self, url: str) -> str:
        try:
            if not isinstance(url, str):
                return ""
            if "://" not in url:
                url = "http://" + url
            parsed = urlparse(url)
            return parsed.netloc.lower()
        except Exception:
            return ""

    def process_chunk(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        
        df["timestamp"] = pd.to_datetime(df["date"], errors="coerce")
        df["date_str"] = df["timestamp"].dt.strftime("%Y-%m-%d")
        df["hour"] = df["timestamp"].dt.hour + df["timestamp"].dt.minute / 60.0
        df["dayofweek"] = df["timestamp"].dt.dayofweek

        is_after_hours = (df["hour"] < 8.5) | (df["hour"] > 17.5)
        is_weekend = df["dayofweek"] >= 5

        # Domain parsing and suspicious indicator matching
        df["url_clean"] = df["url"].fillna("")
        df["domain"] = df["url_clean"].apply(self.extract_domain)
        df["is_suspicious_domain"] = df["url_clean"].str.contains(self.SUSPICIOUS_DOMAINS_PATTERN).astype(int)

        df["is_after_hours_http"] = is_after_hours.astype(int)
        df["is_weekend_http"] = is_weekend.astype(int)

        grouped = df.groupby(["user", "date_str"]).agg(
            http_request_count=("id", "count"),
            unique_domains=("domain", "nunique"),
            after_hours_http=("is_after_hours_http", "sum"),
            weekend_http=("is_weekend_http", "max"),
            suspicious_domain_count=("is_suspicious_domain", "sum")
        ).reset_index()

        grouped.rename(columns={"date_str": "date"}, inplace=True)
        return grouped
