import argparse
import os
from pathlib import Path
import pandas as pd
import numpy as np

from ml.preprocessing.logon import LogonPreprocessor
from ml.preprocessing.device import DevicePreprocessor
from ml.preprocessing.file import FilePreprocessor
from ml.preprocessing.http import HttpPreprocessor
from ml.preprocessing.email import EmailPreprocessor
from ml.preprocessing.ldap import LDAPPreprocessor
from ml.preprocessing.psychometric import PsychometricPreprocessor
from ml.preprocessing.ground_truth import GroundTruthPreprocessor
from ml.features.engineer import BehavioralFeatureEngineer


class CERTPreprocessingPipeline:
    """
    Unified, memory-efficient data ingestion and daily behavioral aggregation pipeline
    for CERT Insider Threat Dataset Release 4.2.
    """
    def __init__(self, data_path: str, output_path: str, chunk_size: int = 100000):
        self.data_path = Path(data_path)
        self.output_path = Path(output_path)
        self.chunk_size = chunk_size
        self.output_path.mkdir(parents=True, exist_ok=True)

    def run(self) -> pd.DataFrame:
        print(f"[*] Starting CERT R4.2 Preprocessing Pipeline from {self.data_path}...")
        
        # 1. Logon logs
        logon_file = self.data_path / "logon.csv"
        if logon_file.exists():
            print(f"[*] Processing {logon_file.name} (chunk_size={self.chunk_size})...")
            logon_df = LogonPreprocessor(self.chunk_size).process_file(str(logon_file))
        else:
            print(f"[!] Warning: {logon_file.name} not found. Initializing empty logon frame.")
            logon_df = pd.DataFrame(columns=["user", "date", "login_count", "logout_count", "after_hours_logon", "weekend_logon", "unique_pcs", "avg_login_hour"])

        # 2. Device logs
        device_file = self.data_path / "device.csv"
        if device_file.exists():
            print(f"[*] Processing {device_file.name} (chunk_size={self.chunk_size})...")
            device_df = DevicePreprocessor(self.chunk_size).process_file(str(device_file))
        else:
            device_df = pd.DataFrame(columns=["user", "date", "device_connect_count", "device_disconnect_count", "after_hours_device", "weekend_device"])

        # 3. File logs
        file_log = self.data_path / "file.csv"
        if file_log.exists():
            print(f"[*] Processing {file_log.name} (chunk_size={self.chunk_size})...")
            file_df = FilePreprocessor(self.chunk_size).process_file(str(file_log))
        else:
            file_df = pd.DataFrame(columns=["user", "date", "file_activity_count", "unique_files", "sensitive_file_activity", "after_hours_file", "weekend_file"])

        # 4. HTTP logs
        http_file = self.data_path / "http.csv"
        if http_file.exists():
            print(f"[*] Processing {http_file.name} (chunk_size={self.chunk_size})...")
            http_df = HttpPreprocessor(self.chunk_size).process_file(str(http_file))
        else:
            http_df = pd.DataFrame(columns=["user", "date", "http_request_count", "unique_domains", "after_hours_http", "weekend_http", "suspicious_domain_count"])

        # 5. Email logs
        email_file = self.data_path / "email.csv"
        if email_file.exists():
            print(f"[*] Processing {email_file.name} (chunk_size={self.chunk_size})...")
            email_df = EmailPreprocessor(self.chunk_size).process_file(str(email_file))
        else:
            email_df = pd.DataFrame(columns=["user", "date", "email_count", "attachment_count", "recipient_count", "avg_email_size", "after_hours_email", "weekend_email"])

        # 6. Merge all channel aggregates on (user, date)
        print("[*] Merging daily user-level multi-channel records...")
        all_dfs = [logon_df, device_df, file_df, http_df, email_df]
        
        # Start outer merge
        merged = logon_df
        for df in all_dfs[1:]:
            if not df.empty:
                merged = pd.merge(merged, df, on=["user", "date"], how="outer")

        # Standardize column names
        merged.rename(columns={"user": "user_id"}, inplace=True)
        
        # Fill missing count values with 0
        fill_zero_cols = [
            "login_count", "logout_count", "after_hours_logon", "weekend_logon", "unique_pcs",
            "device_connect_count", "device_disconnect_count", "after_hours_device", "weekend_device",
            "file_activity_count", "unique_files", "sensitive_file_activity", "after_hours_file", "weekend_file",
            "http_request_count", "unique_domains", "after_hours_http", "weekend_http", "suspicious_domain_count",
            "email_count", "attachment_count", "recipient_count", "after_hours_email", "weekend_email"
        ]
        for col in fill_zero_cols:
            if col in merged.columns:
                merged[col] = merged[col].fillna(0).astype(int)

        if "avg_login_hour" in merged.columns:
            merged["avg_login_hour"] = merged["avg_login_hour"].fillna(9.0).astype(float)
        if "avg_email_size" in merged.columns:
            merged["avg_email_size"] = merged["avg_email_size"].fillna(0.0).astype(float)

        # Sort chronologically by user and date
        merged = merged.sort_values(by=["user_id", "date"]).reset_index(drop=True)

        # 7. Ground Truth Evaluation Labels (Isolated from feature columns)
        ans_file = self.data_path / "answers" / "insiders.csv"
        if not ans_file.exists():
            ans_file = self.data_path / "insiders.csv"
        
        if ans_file.exists():
            print(f"[*] Extracting ground-truth evaluation labels from {ans_file.name}...")
            gt_df = GroundTruthPreprocessor().process_file(str(ans_file))
            labels = GroundTruthPreprocessor().match_daily_labels(merged, gt_df)
            merged["is_malicious_label"] = labels
            merged["is_insider"] = labels
        else:
            merged["is_malicious_label"] = 0
            merged["is_insider"] = 0

        # 8. Feature Engineering: Rolling baselines, z-scores, and behavioral indicators
        print("[*] Computing historical rolling z-scores and behavioral anomaly indicators...")
        engineer = BehavioralFeatureEngineer()
        enriched_df = engineer.engineer_features(merged)

        # Save to optimized Parquet & CSV cache
        parquet_path = self.output_path / "behavioral_feature_matrix.parquet"
        csv_path = self.output_path / "behavioral_feature_matrix.csv"
        
        enriched_df.to_parquet(parquet_path, index=False, engine="pyarrow")
        enriched_df.to_csv(csv_path, index=False)

        # Also maintain daily_features.parquet for backwards-compatibility
        merged.to_parquet(self.output_path / "daily_features.parquet", index=False, engine="pyarrow")

        print(f"[+] Successfully processed {len(enriched_df)} daily user records with {len(enriched_df.columns)} behavioral features.")
        print(f"[+] Final behavioral feature matrix cached at: {parquet_path}")
        return enriched_df


def main():
    parser = argparse.ArgumentParser(description="CERT Insider Threat Dataset R4.2 Preprocessing CLI")
    parser.add_argument("--data-path", type=str, default="./data/cert_r4.2", help="Path to directory containing raw CERT CSV files")
    parser.add_argument("--output-path", type=str, default="./data/processed", help="Path to save processed feature parquet & csv files")
    parser.add_argument("--chunk-size", type=int, default=100000, help="Chunk size for memory-optimized reading")

    args = parser.parse_args()
    pipeline = CERTPreprocessingPipeline(args.data_path, args.output_path, args.chunk_size)
    pipeline.run()


if __name__ == "__main__":
    main()
