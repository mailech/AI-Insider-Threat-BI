import os
import shutil
import pytest
import pandas as pd
from pathlib import Path

from ml.preprocessing.logon import LogonPreprocessor
from ml.preprocessing.device import DevicePreprocessor
from ml.preprocessing.file import FilePreprocessor
from ml.preprocessing.http import HttpPreprocessor
from ml.preprocessing.email import EmailPreprocessor
from ml.preprocessing.pipeline import CERTPreprocessingPipeline
from ml.preprocessing.generator import generate_sample_cert_dataset


@pytest.fixture(scope="module")
def sample_cert_data(tmp_path_factory):
    temp_dir = tmp_path_factory.mktemp("cert_test_data")
    generate_sample_cert_dataset(str(temp_dir), num_users=5, days=7, seed=99)
    return str(temp_dir)


def test_logon_preprocessor(sample_cert_data):
    file_path = os.path.join(sample_cert_data, "logon.csv")
    preprocessor = LogonPreprocessor(chunk_size=500)
    df = preprocessor.process_file(file_path)

    assert not df.empty
    assert "user" in df.columns
    assert "date" in df.columns
    assert "login_count" in df.columns
    assert "after_hours_logon" in df.columns
    assert "weekend_logon" in df.columns
    assert "unique_pcs" in df.columns
    assert "avg_login_hour" in df.columns
    assert (df["login_count"] >= 1).all()


def test_device_preprocessor(sample_cert_data):
    file_path = os.path.join(sample_cert_data, "device.csv")
    preprocessor = DevicePreprocessor(chunk_size=500)
    df = preprocessor.process_file(file_path)

    assert not df.empty
    assert "device_connect_count" in df.columns
    assert "after_hours_device" in df.columns


def test_file_preprocessor(sample_cert_data):
    file_path = os.path.join(sample_cert_data, "file.csv")
    preprocessor = FilePreprocessor(chunk_size=500)
    df = preprocessor.process_file(file_path)

    assert not df.empty
    assert "file_activity_count" in df.columns
    assert "sensitive_file_activity" in df.columns
    assert "unique_files" in df.columns


def test_http_preprocessor(sample_cert_data):
    file_path = os.path.join(sample_cert_data, "http.csv")
    preprocessor = HttpPreprocessor(chunk_size=500)
    df = preprocessor.process_file(file_path)

    assert not df.empty
    assert "http_request_count" in df.columns
    assert "unique_domains" in df.columns
    assert "suspicious_domain_count" in df.columns


def test_email_preprocessor(sample_cert_data):
    file_path = os.path.join(sample_cert_data, "email.csv")
    preprocessor = EmailPreprocessor(chunk_size=500)
    df = preprocessor.process_file(file_path)

    assert not df.empty
    assert "email_count" in df.columns
    assert "attachment_count" in df.columns
    assert "recipient_count" in df.columns


def test_full_preprocessing_pipeline(sample_cert_data, tmp_path):
    output_dir = tmp_path / "processed_test"
    pipeline = CERTPreprocessingPipeline(sample_cert_data, str(output_dir), chunk_size=500)
    result_df = pipeline.run()

    parquet_file = output_dir / "daily_features.parquet"
    assert parquet_file.exists()

    # Load from parquet to verify integrity
    parquet_df = pd.read_parquet(parquet_file)
    assert len(parquet_df) == len(result_df)
    assert "user_id" in parquet_df.columns
    assert "date" in parquet_df.columns
    assert "is_malicious_label" in parquet_df.columns

    # Verify no duplicate user-date pairs
    assert not parquet_df.duplicated(subset=["user_id", "date"]).any()
