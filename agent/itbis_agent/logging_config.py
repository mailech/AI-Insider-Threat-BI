"""
ITBIS Endpoint Agent — structured logging configuration.
"""
from __future__ import annotations

import logging
import sys

import structlog

from itbis_agent.config import LoggingConfig


def configure_logging(cfg: LoggingConfig) -> None:
    """Configure structlog + stdlib logging according to LoggingConfig."""
    level = getattr(logging, cfg.level.upper(), logging.INFO)

    timestamper = structlog.processors.TimeStamper(fmt="iso", utc=True)
    shared_processors: list = [
        structlog.contextvars.merge_contextvars,
        # The logger factory below yields structlog PrintLoggers, not stdlib
        # loggers, so structlog.stdlib.* processors don't belong here:
        # stdlib.add_logger_name reads `logger.name`, which PrintLogger lacks,
        # and crashed the agent CLI on its very first log line.
        structlog.processors.add_log_level,
        timestamper,
        structlog.processors.StackInfoRenderer(),
    ]

    if cfg.json_logs:
        renderer: structlog.types.Processor = structlog.processors.JSONRenderer()
    else:
        renderer = structlog.dev.ConsoleRenderer(colors=sys.stderr.isatty())

    structlog.configure(
        processors=[
            *shared_processors,
            structlog.processors.format_exc_info,
            renderer,
        ],
        wrapper_class=structlog.make_filtering_bound_logger(level),
        logger_factory=structlog.PrintLoggerFactory(file=sys.stderr),
        cache_logger_on_first_use=True,
    )

    # Quiet down noisy third-party loggers
    for noisy in ("httpx", "httpcore", "urllib3"):
        logging.getLogger(noisy).setLevel(logging.WARNING)
