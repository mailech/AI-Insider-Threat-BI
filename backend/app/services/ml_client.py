"""HTTP client for the existing Isolation Forest scoring service (ml-service/).

The backend never re-implements scoring: it extracts features from PostgreSQL
and delegates every score to the model service.
"""

from typing import Any

import httpx

from app.core.config import settings

FEATURE_ORDER = (
    "logon_count",
    "after_hours_logon_count",
    "usb_connect_count",
    "file_copy_count",
    "email_count",
)


class MLServiceError(RuntimeError):
    """Raised when the model service is unreachable or returns an error."""


def _base_url() -> str:
    return settings.ml_service_url.rstrip("/")


def health() -> dict[str, Any]:
    try:
        with httpx.Client(timeout=settings.ml_service_timeout_seconds) as client:
            response = client.get(f"{_base_url()}/health")
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:  # pragma: no cover - network failure path
        raise MLServiceError(f"Model service health check failed: {exc}") from exc


def is_available() -> bool:
    try:
        return bool(health())
    except MLServiceError:
        return False


def score_single(features: dict[str, float]) -> dict[str, Any]:
    payload = {key: float(features[key]) for key in FEATURE_ORDER}
    try:
        with httpx.Client(timeout=settings.ml_service_timeout_seconds) as client:
            response = client.post(f"{_base_url()}/score", json=payload)
            response.raise_for_status()
            return response.json()
    except httpx.HTTPError as exc:
        raise MLServiceError(f"Model service scoring failed: {exc}") from exc


def score_batch(items: list[dict[str, Any]]) -> list[dict[str, Any]]:
    if not items:
        return []

    payload = {
        "employees": [
            {
                "employee_id": str(item["employee_id"]),
                "logon_count": float(item["logon_count"]),
                "after_hours_logon_count": float(item["after_hours_logon_count"]),
                "usb_connect_count": float(item["usb_connect_count"]),
                "file_copy_count": float(item["file_copy_count"]),
                "email_count": float(item["email_count"]),
            }
            for item in items
        ],
        "lookback_days": 30,
    }

    try:
        with httpx.Client(timeout=settings.ml_service_timeout_seconds * 3) as client:
            response = client.post(f"{_base_url()}/score/batch", json=payload)
            response.raise_for_status()
            data = response.json()
    except httpx.HTTPError as exc:
        raise MLServiceError(f"Model service batch scoring failed: {exc}") from exc

    return data.get("results", [])