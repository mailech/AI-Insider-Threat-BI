import csv
from datetime import datetime
from pathlib import Path

from app.database import SessionLocal
from app.models.email import EmailActivity


# ============================================================
# CERT r4.2 EMAIL DATASET
# ============================================================

DATASET_PATH = Path(
    r"C:\Users\nulim\Downloads\archive (1)\r4.2\email.csv"
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
            f"Unable to parse email date: {value}"
        )


# ============================================================
# SAFE INTEGER
# ============================================================

def safe_int(value):

    if value is None:
        return None

    value = str(value).strip()

    if not value:
        return None

    try:
        return int(float(value))
    except ValueError:
        return None


# ============================================================
# IMPORT EMAIL DATA
# ============================================================

def import_email_data():

    if not DATASET_PATH.exists():

        raise FileNotFoundError(
            f"Email dataset not found:\n{DATASET_PATH}"
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
                "to",
                "cc",
                "bcc",
                "from",
                "size",
                "attachments",
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
                    "Required email columns are missing:\n"
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

                    sender = (
                        row.get("from") or ""
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

                    if not sender:
                        skipped += 1
                        continue

                    event_time = parse_datetime(
                        row.get("date", "")
                    )

                    email_size = safe_int(
                        row.get("size")
                    )

                    attachments = (
                        row.get("attachments")
                        or ""
                    ).strip()

                    recipient_to = (
                        row.get("to")
                        or ""
                    ).strip()

                    recipient_cc = (
                        row.get("cc")
                        or ""
                    ).strip()

                    recipient_bcc = (
                        row.get("bcc")
                        or ""
                    ).strip()

                    content = (
                        row.get("content")
                        or ""
                    )

                    email = EmailActivity(
                        event_id=event_id,
                        event_time=event_time,
                        user_id=user_id,
                        pc=pc,
                        sender=sender,
                        recipient_to=recipient_to,
                        recipient_cc=recipient_cc,
                        recipient_bcc=recipient_bcc,
                        email_size=email_size,
                        attachments=attachments,
                        content=content,
                    )

                    batch.append(email)

                    # ------------------------------------------------
                    # Insert batch
                    # ------------------------------------------------

                    if len(batch) >= BATCH_SIZE:

                        event_ids = [
                            item.event_id
                            for item in batch
                        ]

                        existing_ids = {
                            item[0]
                            for item in (
                                db.query(
                                    EmailActivity.event_id
                                )
                                .filter(
                                    EmailActivity.event_id.in_(
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
                            f"Skipped: {skipped:,}"
                        )

                        batch.clear()

                except Exception as row_error:

                    invalid += 1

                    if invalid <= 10:

                        print(
                            f"Skipped invalid row: "
                            f"{row_error}"
                        )

            # ----------------------------------------------------
            # Insert remaining records
            # ----------------------------------------------------

            if batch:

                event_ids = [
                    item.event_id
                    for item in batch
                ]

                existing_ids = {
                    item[0]
                    for item in (
                        db.query(
                            EmailActivity.event_id
                        )
                        .filter(
                            EmailActivity.event_id.in_(
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

            print()
            print("=" * 60)
            print("CERT EMAIL IMPORT COMPLETED")
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
    import_email_data()