import csv
from datetime import datetime
from pathlib import Path

from app.database import SessionLocal
from app.models.http_activity import HttpActivity


# ============================================================
# CERT r4.2 HTTP DATASET
# ============================================================

DATASET_PATH = Path(
    r"D:\CERT\archive (1)\archive (1)\r4.2\http.csv"
)

BATCH_SIZE = 5000


# ============================================================
# DATE PARSER
# ============================================================

def parse_datetime(value: str):

    value = value.strip()

    formats = [
        "%m/%d/%Y %H:%M:%S",
        "%m/%d/%Y %I:%M:%S %p",
        "%m/%d/%Y %H:%M",
        "%m/%d/%Y %I:%M %p",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%d %H:%M:%S.%f",
    ]

    for fmt in formats:
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(
            value.replace("Z", "")
        )
    except ValueError:
        raise ValueError(
            f"Unable to parse HTTP date: {value}"
        )


# ============================================================
# IMPORT HTTP DATA
# ============================================================

def import_http_data():

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"HTTP dataset not found:\n{DATASET_PATH}"
        )

    db = SessionLocal()

    inserted = 0
    skipped = 0
    invalid = 0

    try:

        with DATASET_PATH.open(
            "r",
            encoding="utf-8-sig",
            newline=""
        ) as file:

            reader = csv.DictReader(file)

            required_columns = {
                "id",
                "date",
                "user",
                "pc",
                "url",
                "content",
            }

            actual_columns = set(
                reader.fieldnames or []
            )

            missing_columns = (
                required_columns - actual_columns
            )

            if missing_columns:

                raise ValueError(
                    "Required HTTP columns are missing:\n"
                    + "\n".join(
                        sorted(missing_columns)
                    )
                    + "\n\nFound columns:\n"
                    + ", ".join(
                        reader.fieldnames or []
                    )
                )

            batch = []

            for row in reader:

                try:

                    event_id = (
                        row.get("id") or ""
                    ).strip()

                    user_id = (
                        row.get("user") or ""
                    ).strip()

                    pc = (
                        row.get("pc") or ""
                    ).strip()

                    url = (
                        row.get("url") or ""
                    ).strip()

                    if not event_id:
                        skipped += 1
                        continue

                    if not user_id:
                        skipped += 1
                        continue

                    if not pc:
                        skipped += 1
                        continue

                    if not url:
                        skipped += 1
                        continue

                    event_time = parse_datetime(
                        row.get("date", "")
                    )

                    content = (
                        row.get("content") or ""
                    )

                    http_activity = HttpActivity(
                        event_id=event_id,
                        event_time=event_time,
                        user_id=user_id,
                        pc=pc,
                        url=url,
                        content=content,
                    )

                    batch.append(http_activity)

                    # ====================================================
                    # INSERT BATCH
                    # ====================================================

                    if len(batch) >= BATCH_SIZE:

                        event_ids = [
                            item.event_id
                            for item in batch
                        ]

                        existing_ids = {
                            item[0]
                            for item in (
                                db.query(
                                    HttpActivity.event_id
                                )
                                .filter(
                                    HttpActivity.event_id.in_(
                                        event_ids
                                    )
                                )
                                .all()
                            )
                        }

                        new_records = [
                            item
                            for item in batch
                            if item.event_id
                            not in existing_ids
                        ]

                        if new_records:

                            db.bulk_save_objects(
                                new_records
                            )

                            inserted += len(
                                new_records
                            )

                        skipped += (
                            len(batch)
                            - len(new_records)
                        )

                        db.commit()

                        print(
                            f"Inserted: {inserted:,} | "
                            f"Skipped: {skipped:,} | "
                            f"Invalid: {invalid:,}"
                        )

                        batch.clear()

                except Exception as row_error:

                    invalid += 1

                    if invalid <= 10:

                        print(
                            f"Skipped invalid row: "
                            f"{row_error}"
                        )

            # ====================================================
            # INSERT REMAINING RECORDS
            # ====================================================

            if batch:

                event_ids = [
                    item.event_id
                    for item in batch
                ]

                existing_ids = {
                    item[0]
                    for item in (
                        db.query(
                            HttpActivity.event_id
                        )
                        .filter(
                            HttpActivity.event_id.in_(
                                event_ids
                            )
                        )
                        .all()
                    )
                }

                new_records = [
                    item
                    for item in batch
                    if item.event_id
                    not in existing_ids
                ]

                if new_records:

                    db.bulk_save_objects(
                        new_records
                    )

                    inserted += len(
                        new_records
                    )

                skipped += (
                    len(batch)
                    - len(new_records)
                )

                db.commit()

            # ====================================================
            # FINAL RESULT
            # ====================================================

            print()
            print("=" * 60)
            print("CERT HTTP IMPORT COMPLETED")
            print("=" * 60)
            print(f"Inserted : {inserted:,}")
            print(f"Skipped  : {skipped:,}")
            print(f"Invalid  : {invalid:,}")
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
    import_http_data()