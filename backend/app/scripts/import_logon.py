import csv
from datetime import datetime
from pathlib import Path

from app.database import SessionLocal
from app.models.logon import LogonActivity


# ============================================================
# CERT r4.2 LOGON DATASET
# ============================================================

DATASET_PATH = Path(
    r"C:\Users\nulim\Downloads\archive (1)\r4.2\logon.csv"
)


# ============================================================
# IMPORT LOGON DATA
# ============================================================

def import_logon_data():

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Logon dataset not found:\n{DATASET_PATH}"
        )

    db = SessionLocal()

    inserted = 0
    skipped = 0

    try:

        with DATASET_PATH.open(
            "r",
            encoding="utf-8",
            newline=""
        ) as file:

            reader = csv.DictReader(file)

            required_columns = {
                "id",
                "date",
                "user",
                "pc",
                "activity"
            }

            if not required_columns.issubset(
                reader.fieldnames or []
            ):
                raise ValueError(
                    "Unexpected logon.csv columns.\n"
                    f"Expected: {required_columns}\n"
                    f"Found: {reader.fieldnames}"
                )

            for row in reader:

                event_id = row["id"].strip()
                event_time = row["date"].strip()
                user_id = row["user"].strip()
                pc = row["pc"].strip()
                activity = row["activity"].strip()

                if not event_id:
                    skipped += 1
                    continue

                if not user_id:
                    skipped += 1
                    continue

                if not pc:
                    skipped += 1
                    continue

                if not activity:
                    skipped += 1
                    continue

                # ------------------------------------------------
                # CERT timestamp conversion
                # ------------------------------------------------

                try:

                    parsed_datetime = datetime.strptime(
                        event_time,
                        "%m/%d/%Y %H:%M:%S"
                    )

                except ValueError:

                    try:

                        parsed_datetime = datetime.fromisoformat(
                            event_time
                        )

                    except ValueError:

                        skipped += 1
                        continue

                # ------------------------------------------------
                # Avoid duplicate CERT events
                # ------------------------------------------------

                existing = (
                    db.query(LogonActivity)
                    .filter(
                        LogonActivity.event_id == event_id
                    )
                    .first()
                )

                if existing:
                    skipped += 1
                    continue

                # ------------------------------------------------
                # CERT → Database mapping
                # ------------------------------------------------

                logon = LogonActivity(
                    event_id=event_id,
                    user_id=user_id,
                    pc=pc,
                    activity=activity,
                    event_time=parsed_datetime
                )

                db.add(logon)

                inserted += 1

                # Commit periodically so the transaction
                # does not become excessively large.
                if inserted % 5000 == 0:

                    db.commit()

                    print(
                        f"Inserted {inserted} logon records..."
                    )

            db.commit()

            print()
            print("=" * 60)
            print("CERT LOGON IMPORT COMPLETED")
            print("=" * 60)
            print(f"Inserted : {inserted}")
            print(f"Skipped  : {skipped}")
            print("=" * 60)

    except Exception:

        db.rollback()
        raise

    finally:

        db.close()


# ============================================================
# MAIN
# ============================================================

if __name__ == "__main__":
    import_logon_data()