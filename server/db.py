# db.py - SQLite storage for the app. This is the "proper backend" replacing the
# earlier localStorage-only demo: employees, alerts, notifications, login accounts,
# and a security audit log all live here now.

import sqlite3
import os
import json
import datetime

from werkzeug.security import generate_password_hash
from seed_data import NAMED_SEED, generate_employees, ALERTS_SEED, NOTIF_SEED

DB_PATH = os.environ.get("DB_PATH", os.path.join(os.path.dirname(__file__), "database.db"))

SCHEMA = """
CREATE TABLE IF NOT EXISTS users(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    employee_id TEXT,
    active INTEGER DEFAULT 1,
    failed_attempts INTEGER DEFAULT 0,
    locked_until TEXT
);
CREATE TABLE IF NOT EXISTS employees(
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    dept TEXT,
    role TEXT,
    manager TEXT,
    joining TEXT,
    access TEXT,
    score INTEGER DEFAULT 0,
    activity TEXT,
    log_source TEXT,
    contained INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS alerts(
    id TEXT PRIMARY KEY,
    title TEXT, employee TEXT, employee_id TEXT, severity TEXT,
    desc TEXT, risk_score INTEGER, confidence REAL,
    assessment TEXT, assessment_detail TEXT, timeline TEXT,
    resolved INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS notifications(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT, desc TEXT, time TEXT, read INTEGER DEFAULT 0
);
CREATE TABLE IF NOT EXISTS audit_log(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT, actor_email TEXT, actor_role TEXT, action TEXT, target TEXT, detail TEXT
);
CREATE TABLE IF NOT EXISTS activity_history(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    employee_id TEXT NOT NULL,
    score INTEGER, risk_level TEXT, ts TEXT, source TEXT DEFAULT 'ingest'
);
"""


def get_db():
    os.makedirs(os.path.dirname(DB_PATH) or ".", exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def log_audit(actor, action, target="", detail=""):
    """actor: dict-like with 'email' and 'role' keys (a decoded JWT payload works fine)."""
    conn = get_db()
    conn.execute(
        "INSERT INTO audit_log(ts,actor_email,actor_role,action,target,detail) VALUES (?,?,?,?,?,?)",
        (datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z",
         actor.get("email", "unknown"), actor.get("role", "unknown"), action, target, detail),
    )
    conn.commit()
    conn.close()


def init_db(employee_count=100, reset=False):
    if reset and os.path.exists(DB_PATH):
        os.remove(DB_PATH)

    conn = get_db()
    conn.executescript(SCHEMA)
    conn.commit()

    if conn.execute("SELECT COUNT(*) c FROM employees").fetchone()["c"] == 0:
        all_employees = NAMED_SEED + generate_employees(employee_count)
        for e in all_employees:
            conn.execute(
                "INSERT INTO employees(id,name,email,dept,role,manager,joining,access,score,activity,log_source,contained) "
                "VALUES (?,?,?,?,?,?,?,?,?,?,?,0)",
                (e["id"], e["name"], e["email"], e["dept"], e["role"], "", "", "Standard",
                 e["score"], e["activity"], e["log_source"]),
            )
        conn.commit()

        # staff accounts (the 3 privileged dashboard roles)
        staff = [
            ("USR-ADMIN", "System Admin", "admin@activity.local", "admin123", "Admin"),
            ("USR-MANAGER", "Kavitha Rao", "manager@activity.local", "manager123", "Security Manager"),
            ("USR-ANALYST", "Meera Iyer", "analyst@activity.local", "analyst123", "Analyst"),
        ]
        for uid, name, email, pwd, role in staff:
            conn.execute(
                "INSERT OR IGNORE INTO users(id,name,email,password_hash,role,employee_id) VALUES (?,?,?,?,?,NULL)",
                (uid, name, email, generate_password_hash(pwd), role),
            )
        # every employee also gets a login (shared demo password, same as before)
        for e in all_employees:
            conn.execute(
                "INSERT OR IGNORE INTO users(id,name,email,password_hash,role,employee_id) VALUES (?,?,?,?,?,?)",
                ("USR-" + e["id"], e["name"], e["email"], generate_password_hash("employee123"), "Employee", e["id"]),
            )
        conn.commit()

    if conn.execute("SELECT COUNT(*) c FROM alerts").fetchone()["c"] == 0:
        for a in ALERTS_SEED:
            conn.execute(
                "INSERT INTO alerts(id,title,employee,employee_id,severity,desc,risk_score,confidence,"
                "assessment,assessment_detail,timeline,resolved) VALUES (?,?,?,?,?,?,?,?,?,?,?,0)",
                (a["id"], a["title"], a["employee"], a["employee_id"], a["severity"], a["desc"],
                 a["risk_score"], a["confidence"], a["assessment"], a["assessment_detail"],
                 json.dumps(a["timeline"])),
            )
        conn.commit()

    if conn.execute("SELECT COUNT(*) c FROM notifications").fetchone()["c"] == 0:
        for n in NOTIF_SEED:
            conn.execute("INSERT INTO notifications(title,desc,time,read) VALUES (?,?,?,0)",
                         (n["title"], n["desc"], n["time"]))
        conn.commit()

    if conn.execute("SELECT COUNT(*) c FROM activity_history").fetchone()["c"] == 0:
        shape = [0.70, 0.80, 0.75, 0.90, 1.0]  # 5 baseline points trending toward each employee's seeded score
        all_rows = conn.execute("SELECT id, score FROM employees").fetchall()
        for row in all_rows:
            for i, m in enumerate(shape):
                day_offset = len(shape) - 1 - i
                ts = (datetime.datetime.utcnow() - datetime.timedelta(days=day_offset)).isoformat(timespec="seconds") + "Z"
                pt_score = max(1, min(99, round(row["score"] * m)))
                risk_level = "High Risk" if pt_score >= 80 else "Medium" if pt_score >= 50 else "Low"
                conn.execute(
                    "INSERT INTO activity_history(employee_id,score,risk_level,ts,source) VALUES (?,?,?,?, 'baseline')",
                    (row["id"], pt_score, risk_level, ts),
                )
        conn.commit()

    conn.close()
