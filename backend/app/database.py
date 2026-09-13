import sqlite3
from pathlib import Path

DATABASE_PATH = Path(__file__).resolve().parent.parent / "itbis.db"


def get_connection():
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    return connection


def initialize_database():
    connection = get_connection()

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS employees (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            email TEXT,
            department TEXT,
            role TEXT,
            status TEXT,
            risk_score INTEGER,
            risk_level TEXT
        )
        """
    )

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS activities (
            id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL,
            employee TEXT NOT NULL,
            department TEXT,
            type TEXT,
            description TEXT,
            source TEXT,
            device TEXT,
            location TEXT,
            timestamp TEXT,
            severity TEXT,
            status TEXT,
            risk INTEGER
        )
        """
    )

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS alerts (
            id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL,
            employee TEXT NOT NULL,
            activity TEXT,
            risk TEXT,
            score INTEGER,
            status TEXT,
            time TEXT
        )
        """
    )

    connection.execute(
        """
        CREATE TABLE IF NOT EXISTS investigations (
            id TEXT PRIMARY KEY,
            employee_id TEXT NOT NULL,
            employee TEXT NOT NULL,
            title TEXT,
            severity TEXT,
            status TEXT,
            assigned_to TEXT,
            created TEXT
        )
        """
    )

    employees = [
        (
            "EMP-001",
            "Rahul Sharma",
            "rahul.sharma@company.com",
            "Sales",
            "Sales Executive",
            "Active",
            87,
            "Critical",
        ),
        (
            "EMP-002",
            "Priya Reddy",
            "priya.reddy@company.com",
            "Finance",
            "Financial Analyst",
            "Active",
            64,
            "High",
        ),
        (
            "EMP-003",
            "Arjun Kumar",
            "arjun.kumar@company.com",
            "Engineering",
            "Software Engineer",
            "Active",
            18,
            "Low",
        ),
        (
            "EMP-004",
            "Sneha Rao",
            "sneha.rao@company.com",
            "IT",
            "System Administrator",
            "Active",
            42,
            "Medium",
        ),
    ]

    connection.executemany(
        """
        INSERT OR REPLACE INTO employees
        (id, name, email, department, role, status, risk_score, risk_level)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        employees,
    )

    activities = [
        (
            "EVT-1001",
            "EMP-001",
            "Rahul Sharma",
            "Sales",
            "Data Transfer",
            "Large outbound transfer to an external destination",
            "Endpoint",
            "LAP-SAL-021",
            "Chennai",
            "2026-09-11 18:42",
            "Critical",
            "Flagged",
            87,
        ),
        (
            "EVT-1002",
            "EMP-001",
            "Rahul Sharma",
            "Sales",
            "File Download",
            "Multiple confidential files downloaded",
            "Endpoint",
            "LAP-SAL-021",
            "Chennai",
            "2026-09-11 17:55",
            "High",
            "Flagged",
            84,
        ),
        (
            "EVT-1003",
            "EMP-002",
            "Priya Reddy",
            "Finance",
            "Login",
            "Login detected outside normal working hours",
            "Active Directory",
            "LAP-FIN-009",
            "Hyderabad",
            "2026-09-11 22:16",
            "High",
            "Review",
            64,
        ),
        (
            "EVT-1004",
            "EMP-002",
            "Priya Reddy",
            "Finance",
            "Remote Access",
            "Remote session initiated from an unusual time",
            "VPN",
            "LAP-FIN-009",
            "Hyderabad",
            "2026-09-11 21:48",
            "Medium",
            "Review",
            61,
        ),
        (
            "EVT-1005",
            "EMP-003",
            "Arjun Kumar",
            "Engineering",
            "Application Usage",
            "Normal development application usage",
            "Endpoint",
            "LAP-ENG-014",
            "Bengaluru",
            "2026-09-11 14:20",
            "Low",
            "Normal",
            18,
        ),
        (
            "EVT-1006",
            "EMP-004",
            "Sneha Rao",
            "IT",
            "File Access",
            "Sensitive files accessed outside normal pattern",
            "File Server",
            "LAP-IT-006",
            "Hyderabad",
            "2026-09-11 20:05",
            "Medium",
            "Review",
            42,
        ),
    ]

    connection.executemany(
        """
        INSERT OR REPLACE INTO activities
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        activities,
    )

    alerts = [
        (
            "ALT-001",
            "EMP-001",
            "Rahul Sharma",
            "Excessive Data Transfer",
            "Critical",
            87,
            "Open",
            "10 min ago",
        ),
        (
            "ALT-002",
            "EMP-002",
            "Priya Reddy",
            "Unusual Login Pattern",
            "High",
            64,
            "Investigating",
            "32 min ago",
        ),
        (
            "ALT-003",
            "EMP-004",
            "Sneha Rao",
            "Abnormal File Access",
            "Medium",
            42,
            "Open",
            "1 hour ago",
        ),
    ]

    connection.executemany(
        """
        INSERT OR REPLACE INTO alerts
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        alerts,
    )

    investigations = [
        (
            "INV-001",
            "EMP-001",
            "Rahul Sharma",
            "Excessive Data Transfer Investigation",
            "Critical",
            "Open",
            "Security Analyst",
            "2026-09-11",
        ),
        (
            "INV-002",
            "EMP-002",
            "Priya Reddy",
            "Unusual Login Investigation",
            "High",
            "Investigating",
            "SOC Engineer",
            "2026-09-11",
        ),
    ]

    connection.executemany(
        """
        INSERT OR REPLACE INTO investigations
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """,
        investigations,
    )

    connection.commit()
    connection.close()