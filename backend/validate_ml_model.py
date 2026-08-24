#!/usr/bin/env python3
"""
Top-level entrypoint for the Antigravity / ITBIS ML Validation Suite.
Delegates directly to `scripts/validate_antigravity_ml.py`.
"""
import sys
import pathlib

# Forward execution to scripts/validate_antigravity_ml.py
scripts_path = pathlib.Path(__file__).resolve().parent / "scripts" / "validate_antigravity_ml.py"
if not scripts_path.exists():
    raise FileNotFoundError(f"Validation script not found at: {scripts_path}")

from scripts.validate_antigravity_ml import main

if __name__ == "__main__":
    main()
