import sqlite3
from contextlib import contextmanager
from collections.abc import Iterator
from pathlib import Path

from backend.app.config import DATABASE_PATH


SCHEMA_SQL = """
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('security_analyst', 'soc_engineer', 'security_manager', 'administrator')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
    last_login_at TEXT,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS employees (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    department TEXT NOT NULL,
    designation TEXT NOT NULL,
    manager TEXT NOT NULL,
    device_info TEXT NOT NULL,
    access_privileges TEXT NOT NULL,
    risk_score INTEGER NOT NULL DEFAULT 25 CHECK (risk_score BETWEEN 0 AND 100),
    risk_level TEXT NOT NULL DEFAULT 'Low' CHECK (risk_level IN ('Low', 'Medium', 'High', 'Critical')),
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'under_review')),
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ingestion_batches (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source TEXT NOT NULL,
    received_count INTEGER NOT NULL DEFAULT 0,
    accepted_count INTEGER NOT NULL DEFAULT 0,
    submitted_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    submitted_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    source TEXT NOT NULL,
    description TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('Informational', 'Low', 'Medium', 'High', 'Critical')),
    asset TEXT,
    actor TEXT,
    ip_address TEXT,
    event_time TEXT NOT NULL,
    ingested_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    batch_id INTEGER REFERENCES ingestion_batches(id) ON DELETE SET NULL,
    metadata TEXT NOT NULL DEFAULT '{}',
    ingested_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_employees_employee_id ON employees(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_employee_id ON activity_logs(employee_id);
CREATE INDEX IF NOT EXISTS idx_activity_event_time ON activity_logs(event_time);
CREATE INDEX IF NOT EXISTS idx_activity_severity ON activity_logs(severity);
"""


@contextmanager
def get_connection() -> Iterator[sqlite3.Connection]:
    Path(DATABASE_PATH).parent.mkdir(parents=True, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON;")
    try:
        yield connection
    finally:
        connection.close()


def init_database() -> None:
    with get_connection() as connection:
        connection.executescript(SCHEMA_SQL)
        connection.commit()


def row_to_dict(row: sqlite3.Row | None) -> dict | None:
    if row is None:
        return None
    return {key: row[key] for key in row.keys()}
