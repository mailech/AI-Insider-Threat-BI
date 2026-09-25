"""ITBIS Endpoint Agent — CLI entrypoint."""
from __future__ import annotations

import argparse
import sys

import structlog

from itbis_agent.config import Config
from itbis_agent.logging_config import configure_logging
from itbis_agent.runtime import AgentRuntime

log = structlog.get_logger(__name__)


def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="itbis-agent",
        description="ITBIS Windows Endpoint Agent",
    )
    p.add_argument(
        "--config",
        type=str,
        default=None,
        help="Path to a YAML config file.",
    )
    p.add_argument(
        "--requeue-dead",
        action="store_true",
        help=(
            "Return dead-lettered events in the local queue to pending, then "
            "exit. Use after fixing whatever caused them to fail (e.g. an "
            "expired agent token or a server-side rejection)."
        ),
    )
    p.add_argument(
        "--queue-stats",
        action="store_true",
        help="Print local queue counts (pending/sent/dead) and exit.",
    )
    return p


def main(argv: list[str] | None = None) -> int:
    args = _build_parser().parse_args(argv)

    try:
        if args.config:
            config = Config.from_yaml(args.config)
        else:
            config = Config.from_env()
    except Exception as exc:  # noqa: BLE001
        print(f"itbis-agent: failed to load configuration: {exc}", file=sys.stderr)
        return 2

    configure_logging(config.logging)

    # ─── One-shot maintenance commands ──────────────────────
    if args.queue_stats or args.requeue_dead:
        from itbis_agent.queue import PersistentQueue

        queue = PersistentQueue(config.queue, config.agent.device_id)
        try:
            if args.requeue_dead:
                revived = queue.revive_dead()
                log.info("agent.requeue_dead", revived=revived)
                print(f"Returned {revived} dead-lettered event(s) to the queue.")
            stats = queue.stats()
            log.info("agent.queue_stats", **stats)
            print(
                f"Queue: pending={stats['pending']} "
                f"sent={stats['sent']} dead={stats['dead']}"
            )
        finally:
            queue.close()
        return 0

    runtime = AgentRuntime(config)
    try:
        runtime.start()
    except KeyboardInterrupt:
        runtime.stop()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
