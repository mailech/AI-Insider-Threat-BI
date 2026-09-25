"""Download the CERT r4.2 files from Kaggle using the official Kaggle CLI.

This avoids a manual browser download. The files are written into data/cert/raw/
and are ignored by Git. By default the very large http.csv is NOT downloaded.
Use --include-http only if you explicitly want it.

Prerequisites:
  pip install kaggle
  kaggle auth login

Example:
  python scripts/download_cert.py
  python scripts/download_cert.py --include-http
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

DATASET = "andrihjonior/cert-insider-threat-dataset-r4-2"
ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "cert" / "raw"
ANSWERS_DIR = ROOT / "data" / "cert" / "answers"

# The Kaggle mirror exposes the release under r4.2/ and the ground-truth
# answers under answers/. HTTP is optional because it is very large and is not
# required by the core CERT user-day model.
FILES = [
    "r4.2/logon.csv",
    "r4.2/device.csv",
    "r4.2/file.csv",
    "r4.2/email.csv",
    "answers/insiders.csv",
]


def run_kaggle(file_name: str, target: Path) -> None:
    target.mkdir(parents=True, exist_ok=True)
    cmd = [
        "kaggle",
        "datasets",
        "download",
        DATASET,
        "--file",
        file_name,
        "--path",
        str(target),
        "--unzip",
    ]
    print("+", " ".join(cmd))
    try:
        subprocess.run(cmd, check=True)
    except FileNotFoundError:
        raise SystemExit(
            "Kaggle CLI was not found. Run: python -m pip install kaggle"
        )
    except subprocess.CalledProcessError as exc:
        raise SystemExit(exc.returncode)


def flatten_downloaded_files() -> None:
    """Move downloaded r4.2 CSVs into our stable local layout."""
    # Depending on the Kaggle CLI version, --unzip may preserve the source
    # directory. Find the requested files recursively and copy them into the
    # exact locations expected by the training pipeline.
    mappings = {
        "logon.csv": RAW_DIR / "logon.csv",
        "device.csv": RAW_DIR / "device.csv",
        "file.csv": RAW_DIR / "file.csv",
        "email.csv": RAW_DIR / "email.csv",
        "insiders.csv": ANSWERS_DIR / "insiders.csv",
    }
    for filename, destination in mappings.items():
        matches = list((ROOT / "data" / "cert").rglob(filename))
        matches = [p for p in matches if p.resolve() != destination.resolve()]
        if not matches:
            if destination.exists():
                continue
            print(f"WARNING: {filename} was not found after download")
            continue
        source = sorted(matches, key=lambda p: len(str(p)))[0]
        destination.parent.mkdir(parents=True, exist_ok=True)
        if source.resolve() != destination.resolve():
            shutil.copy2(source, destination)
            print(f"  {filename}: {destination}")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--include-http",
        action="store_true",
        help="also download r4.2/http.csv; this is very large and optional",
    )
    args = parser.parse_args()

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    ANSWERS_DIR.mkdir(parents=True, exist_ok=True)

    selected = list(FILES)
    if args.include_http:
        selected.insert(4, "r4.2/http.csv")

    print(f"Dataset: {DATASET}")
    print(f"Destination: {ROOT / 'data' / 'cert'}")
    print("The downloaded dataset is ignored by Git and will not be committed.\n")

    for file_name in selected:
        # Download the HTTP file directly into raw; other files can use the
        # common data/cert root and then be normalized below.
        target = RAW_DIR if file_name.endswith("http.csv") else ROOT / "data" / "cert"
        run_kaggle(file_name, target)

    flatten_downloaded_files()

    print("\nCERT download complete. Files currently available:")
    for path in [
        RAW_DIR / "logon.csv",
        RAW_DIR / "device.csv",
        RAW_DIR / "file.csv",
        RAW_DIR / "email.csv",
        RAW_DIR / "http.csv",
        ANSWERS_DIR / "insiders.csv",
    ]:
        if path.exists():
            print(f"  OK  {path.relative_to(ROOT)} ({path.stat().st_size / 1024 / 1024:.1f} MB)")
        else:
            print(f"  --  {path.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
