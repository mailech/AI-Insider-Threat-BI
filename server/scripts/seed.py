# scripts/seed.py - explicit CLI for (re)seeding the database, instead of relying only
# on the automatic seed-on-first-run inside db.init_db(). Useful for demos, tests, or
# resetting a Docker volume back to a clean state.
#
# Run from the server/ directory:
#   python -m scripts.seed --employees 100 --reset
#
# --employees N   how many additional synthetic employees to generate (plus the 5
#                  named ones used by the alerts/investigation pages)
# --reset          delete the existing database file first and start completely fresh

import argparse
import sys
import os

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from db import init_db, DB_PATH  # noqa: E402


def main():
    parser = argparse.ArgumentParser(description="Seed the Activity Management System database.")
    parser.add_argument("--employees", type=int, default=100, help="number of additional synthetic employees to generate (default: 100)")
    parser.add_argument("--reset", action="store_true", help="delete the existing database file first")
    args = parser.parse_args()

    if args.reset:
        print(f"Resetting database at {DB_PATH} ...")
    init_db(employee_count=args.employees, reset=args.reset)
    print(f"Done. Database ready at {DB_PATH} with {args.employees + 5} employees, 3 staff accounts, 4 alerts.")


if __name__ == "__main__":
    main()
