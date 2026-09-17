#!/usr/bin/env python3
"""Docker container entrypoint: schema + optional seed, then Uvicorn (1 worker for SSE)."""

from __future__ import annotations

import os
import subprocess
import sys

from app.db.init_db import init_db
from app.db.session import SessionLocal
from app.models.domain import User


def _should_seed() -> bool:
    db = SessionLocal()
    try:
        return db.query(User).count() == 0
    except Exception:
        return True
    finally:
        db.close()


def main() -> None:
    init_db()
    if os.environ.get("ITBIS_SKIP_SEED", "").lower() not in {"1", "true", "yes"}:
        if _should_seed():
            print("ITBIS: no platform users found — running seed_data.py")
            subprocess.check_call([sys.executable, "seed_data.py"])
        else:
            print("ITBIS: users already present — skipping seed")

    os.execvp(
        "uvicorn",
        [
            "uvicorn",
            "app.main:app",
            "--host", "0.0.0.0",
            "--port", "8000",
            "--workers", "1",
        ],
    )


if __name__ == "__main__":
    main()
