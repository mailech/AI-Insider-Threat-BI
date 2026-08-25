import csv
from pathlib import Path

from app.database import SessionLocal
from app.models.psychometric import PsychometricProfile


# ============================================================
# CERT PSYCHOMETRIC DATASET
# ============================================================

DATASET_PATH = Path(
    r"D:\CERT\archive (1)\r4.2\psychometric.csv"
)

BATCH_SIZE = 1000


# ============================================================
# IMPORT PSYCHOMETRIC DATA
# ============================================================

def import_psychometric_data():

    if not DATASET_PATH.exists():
        raise FileNotFoundError(
            f"Psychometric dataset not found:\n{DATASET_PATH}"
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
                "employee_name",
                "user_id",
                "O",
                "C",
                "E",
                "A",
                "N",
            }

            actual_columns = set(
                reader.fieldnames or []
            )

            missing_columns = (
                required_columns - actual_columns
            )

            if missing_columns:
                raise ValueError(
                    "Required Psychometric columns are missing:\n"
                    + "\n".join(sorted(missing_columns))
                    + "\n\nFound columns:\n"
                    + ", ".join(reader.fieldnames or [])
                )

            batch = []

            for row in reader:

                try:

                    employee_name = (
                        row.get("employee_name") or ""
                    ).strip()

                    user_id = (
                        row.get("user_id") or ""
                    ).strip()

                    if not employee_name or not user_id:
                        invalid += 1
                        continue

                    openness = int(
                        row.get("O", "").strip()
                    )

                    conscientiousness = int(
                        row.get("C", "").strip()
                    )

                    extraversion = int(
                        row.get("E", "").strip()
                    )

                    agreeableness = int(
                        row.get("A", "").strip()
                    )

                    neuroticism = int(
                        row.get("N", "").strip()
                    )

                    profile = PsychometricProfile(
                        employee_name=employee_name,
                        user_id=user_id,
                        openness=openness,
                        conscientiousness=conscientiousness,
                        extraversion=extraversion,
                        agreeableness=agreeableness,
                        neuroticism=neuroticism,
                    )

                    batch.append(profile)

                    # ================================================
                    # INSERT BATCH
                    # ================================================

                    if len(batch) >= BATCH_SIZE:

                        user_ids = [
                            item.user_id
                            for item in batch
                        ]

                        existing_ids = {
                            item[0]
                            for item in (
                                db.query(
                                    PsychometricProfile.user_id
                                )
                                .filter(
                                    PsychometricProfile.user_id.in_(
                                        user_ids
                                    )
                                )
                                .all()
                            )
                        }

                        new_records = [
                            item
                            for item in batch
                            if item.user_id
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

            # ================================================
            # REMAINING RECORDS
            # ================================================

            if batch:

                user_ids = [
                    item.user_id
                    for item in batch
                ]

                existing_ids = {
                    item[0]
                    for item in (
                        db.query(
                            PsychometricProfile.user_id
                        )
                        .filter(
                            PsychometricProfile.user_id.in_(
                                user_ids
                            )
                        )
                        .all()
                    )
                }

                new_records = [
                    item
                    for item in batch
                    if item.user_id
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

            # ================================================
            # FINAL RESULT
            # ================================================

            print()
            print("=" * 60)
            print("CERT PSYCHOMETRIC IMPORT COMPLETED")
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
    import_psychometric_data()