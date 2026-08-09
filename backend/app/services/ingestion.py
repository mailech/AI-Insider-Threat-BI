"""Activity log ingestion.

Accepts CSV batches exported from SIEM/endpoint tooling and turns them into
``ActivityEvent`` rows. Malformed rows are collected and reported rather than
aborting the batch -- a single bad line in a 50k-row export should not cost the
whole upload.
"""

import csv
import io
from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.activity import ActivityEvent
from app.models.employee import Employee
from app.models.enums import EventSource, EventType
from app.schemas.activity import IngestionResult

MAX_REPORTED_ERRORS = 25

REQUIRED_COLUMNS = {"employee_code", "event_type", "timestamp"}


def is_after_hours(moment: datetime) -> bool:
    return not (settings.BUSINESS_HOUR_START <= moment.hour < settings.BUSINESS_HOUR_END)


def _parse_timestamp(raw: str) -> datetime:
    text = raw.strip().replace("Z", "+00:00")
    parsed = datetime.fromisoformat(text)
    # Store naive UTC so comparisons stay consistent across SQLite and Postgres.
    if parsed.tzinfo is not None:
        parsed = parsed.astimezone(timezone.utc).replace(tzinfo=None)
    return parsed


def _parse_int(raw: str | None) -> int:
    if raw is None or not str(raw).strip():
        return 0
    return max(0, int(float(raw)))


def ingest_csv(db: Session, content: bytes) -> IngestionResult:
    """Parse and persist a CSV batch.

    Expected columns: employee_code, event_type, timestamp, and optionally
    source, ip_address, bytes_transferred, details.
    """
    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        return IngestionResult(
            received=0, inserted=0, rejected=0, errors=["File is not valid UTF-8 text"]
        )

    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        return IngestionResult(
            received=0, inserted=0, rejected=0, errors=["File is empty or has no header row"]
        )

    headers = {name.strip().lower() for name in reader.fieldnames}
    missing = REQUIRED_COLUMNS - headers
    if missing:
        return IngestionResult(
            received=0,
            inserted=0,
            rejected=0,
            errors=[f"Missing required column(s): {', '.join(sorted(missing))}"],
        )

    # One lookup for the whole batch instead of a query per row.
    code_to_id = {
        code: employee_id
        for employee_id, code in db.execute(select(Employee.id, Employee.employee_code))
    }

    received = 0
    errors: list[str] = []
    events: list[ActivityEvent] = []

    for line_number, raw_row in enumerate(reader, start=2):
        received += 1
        row = {(k or "").strip().lower(): (v or "").strip() for k, v in raw_row.items()}
        try:
            employee_id = code_to_id.get(row["employee_code"])
            if employee_id is None:
                raise ValueError(f"unknown employee_code '{row['employee_code']}'")

            event_type = EventType(row["event_type"].upper())
            source_value = row.get("source", "").upper()
            source = EventSource(source_value) if source_value else EventSource.ENDPOINT_AGENT
            timestamp = _parse_timestamp(row["timestamp"])

            events.append(
                ActivityEvent(
                    employee_id=employee_id,
                    event_type=event_type,
                    source=source,
                    timestamp=timestamp,
                    ip_address=row.get("ip_address") or None,
                    bytes_transferred=_parse_int(row.get("bytes_transferred")),
                    is_after_hours=is_after_hours(timestamp),
                    details={"raw_details": row["details"]} if row.get("details") else None,
                )
            )
        except (KeyError, ValueError) as exc:
            if len(errors) < MAX_REPORTED_ERRORS:
                errors.append(f"line {line_number}: {exc}")

    if events:
        db.add_all(events)
        db.commit()

    rejected = received - len(events)
    if rejected > len(errors):
        errors.append(f"...and {rejected - len(errors)} further rejected row(s)")

    return IngestionResult(
        received=received, inserted=len(events), rejected=rejected, errors=errors
    )
