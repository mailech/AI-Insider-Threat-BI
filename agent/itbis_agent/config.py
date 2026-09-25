"""
ITBIS Endpoint Agent — Configuration

Loaded from a YAML file (--config) with environment-variable overrides
prefixed ITBIS_AGENT_*. Booleans, ints, and strings are auto-coerced from env.
"""
from __future__ import annotations

import os
from pathlib import Path
from typing import Any

import yaml
from pydantic import BaseModel, Field, field_validator


class AgentConfig(BaseModel):
    """Identity of this agent host."""

    device_id: str = Field(..., min_length=1, description="Stable device id.")
    device_name: str = Field(..., min_length=1)
    device_type: str = "workstation"
    operating_system: str = "Windows"
    source_dataset: str = "win_endpoint"
    poll_interval_seconds: float = 2.0
    enabled_collectors: list[str] = Field(
        default_factory=lambda: [
            "windows_security",
            "process",
            "usb",
            "removable_files",
            "downloads",
            "network",
        ]
    )
    include_system_activity: bool = Field(
        default=False,
        description=(
            "Keep activity by Windows service, virtual and computer accounts "
            "(SYSTEM, LOCAL SERVICE, NETWORK SERVICE, DWM-n, UMFD-n, HOST$) and "
            "service/batch logons. Off by default: it is high-volume background "
            "noise that swamps per-user behavioural baselines."
        ),
    )

    @field_validator("poll_interval_seconds")
    @classmethod
    def _positive_interval(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("poll_interval_seconds must be > 0")
        return v


class ServerConfig(BaseModel):
    """Remote ITBIS server settings."""

    base_url: str = Field(..., min_length=1)
    api_key: str = Field(..., min_length=1)
    events_path: str = "/api/v1/ingestion/events"
    timeout_seconds: float = 30.0
    verify_tls: bool = True


class QueueConfig(BaseModel):
    """Local persistent queue settings."""

    db_path: str = "./itbis_agent.db"
    max_pending_events: int = 100_000


class UploadConfig(BaseModel):
    """Batching & retry behaviour."""

    batch_size: int = 200
    flush_interval_seconds: float = 10.0
    max_retries: int = 6
    initial_backoff_seconds: float = 1.0
    max_backoff_seconds: float = 60.0


class LoggingConfig(BaseModel):
    level: str = "INFO"
    json_logs: bool = Field(default=True, alias="json")

    model_config = {"populate_by_name": True}


class Config(BaseModel):
    """Top-level agent configuration."""

    agent: AgentConfig
    server: ServerConfig
    queue: QueueConfig = Field(default_factory=QueueConfig)
    upload: UploadConfig = Field(default_factory=UploadConfig)
    logging: LoggingConfig = Field(default_factory=LoggingConfig)

    # ─── Loaders ───────────────────────────────────────────

    @classmethod
    def from_yaml(cls, path: str | Path) -> Config:
        path = Path(path)
        with path.open("r", encoding="utf-8") as fh:
            raw = yaml.safe_load(fh) or {}
        merged = _apply_env_overrides(raw)
        return cls.model_validate(merged)

    @classmethod
    def from_env(cls) -> Config:
        """Build a minimal Config purely from ITBIS_AGENT_* env vars."""
        device_id = os.environ.get("ITBIS_AGENT_DEVICE_ID")
        base_url = os.environ.get("ITBIS_AGENT_BASE_URL")
        api_key = os.environ.get("ITBIS_AGENT_API_KEY")
        if not (device_id and base_url and api_key):
            raise ValueError(
                "ITBIS_AGENT_DEVICE_ID, ITBIS_AGENT_BASE_URL and "
                "ITBIS_AGENT_API_KEY must all be set"
            )
        return cls.model_validate(
            {
                "agent": {
                    "device_id": device_id,
                    "device_name": os.environ.get(
                        "ITBIS_AGENT_DEVICE_NAME", device_id
                    ),
                },
                "server": {
                    "base_url": base_url,
                    "api_key": api_key,
                },
            }
        )


def _apply_env_overrides(raw: dict[str, Any]) -> dict[str, Any]:
    """
    Override scalar values in a nested config dict using ITBIS_AGENT_*
    environment variables. Mapping is flat: ITBIS_AGENT_<SECTION>_<KEY>.
    """
    section_map = {
        "agent": AgentConfig,
        "server": ServerConfig,
        "queue": QueueConfig,
        "upload": UploadConfig,
        "logging": LoggingConfig,
    }
    for section_name, schema in section_map.items():
        section_raw = raw.get(section_name) or {}
        for field_name in schema.model_fields:
            env_var = (
                f"ITBIS_AGENT_{section_name.upper()}_{field_name.upper()}"
            )
            env_val = os.environ.get(env_var)
            if env_val is None:
                continue
            section_raw[field_name] = _coerce_env_value(
                env_val, schema.model_fields[field_name].annotation
            )
        if section_raw:
            raw[section_name] = section_raw
    return raw


def _coerce_env_value(value: str, annotation: Any) -> Any:
    """Coerce an env-string into the Pydantic field annotation's type."""
    if annotation is bool:
        return value.strip().lower() in ("1", "true", "yes", "on")
    if annotation is int:
        return int(value)
    if annotation is float:
        return float(value)
    if annotation is list[str] or str(annotation).startswith("list"):
        return [v.strip() for v in value.split(",") if v.strip()]
    return value
