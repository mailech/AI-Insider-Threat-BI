import json
import csv
from datetime import datetime
from pathlib import Path
from typing import Any

from backend.app.config import DATASET_DIR, MODEL_PATH, risk_level_for_score
from backend.app.database import get_connection, row_to_dict

SEVERITY_WEIGHT = {"Informational": 0, "Low": 1, "Medium": 3, "High": 7, "Critical": 12}
MODEL_VERSION = "heuristic-v1"


def import_cert_dataset(root: Path) -> dict[str, Any]:
    answers = root / "answers"
    label_file = answers / "insiders.csv"
    activity_files = sorted(path for path in answers.rglob("*.csv") if path.name != "insiders.csv")
    if not activity_files or not label_file.exists():
        raise ValueError("CERT archive must contain answers/insiders.csv and activity CSV files")

    labels: dict[str, list[str]] = {}
    with label_file.open(newline="", encoding="utf-8-sig") as handle:
        for row in csv.DictReader(handle):
            labels.setdefault(row["user"].strip(), []).append(f"scenario-{row['scenario']}")

    imported_events = 0
    imported_users: set[str] = set()
    with get_connection() as connection:
        existing = connection.execute("SELECT COUNT(*) AS total FROM ingestion_batches WHERE source = 'CERT Insider Threat Dataset'").fetchone()["total"]
        if existing:
            return {"status": "already_imported", "users": connection.execute("SELECT COUNT(*) AS total FROM employees WHERE employee_id LIKE 'CERT-%'").fetchone()["total"], "events": connection.execute("SELECT COUNT(*) AS total FROM activity_logs WHERE source = 'CERT Dataset'").fetchone()["total"]}
        admin = connection.execute("SELECT id FROM users ORDER BY id LIMIT 1").fetchone()
        batch = connection.execute("INSERT INTO ingestion_batches (source, received_count, submitted_by) VALUES ('CERT Insider Threat Dataset', 0, ?)", (admin["id"],))
        batch_id = batch.lastrowid
        for path in activity_files:
            with path.open(newline="", encoding="utf-8-sig", errors="replace") as handle:
                for row in csv.reader(handle):
                    if len(row) < 7:
                        continue
                    event_kind, event_id, event_time, user, device, detail = row[0], row[1], row[2], row[3], row[4], ",".join(row[5:])
                    user = user.strip()
                    if not user:
                        continue
                    imported_users.add(user)
                    employee_ref = f"CERT-{user}"
                    employee = connection.execute("SELECT id FROM employees WHERE employee_id = ?", (employee_ref,)).fetchone()
                    if employee is None:
                        is_insider = user in labels
                        connection.execute(
                            """INSERT INTO employees (employee_id, full_name, department, designation, manager, device_info, access_privileges, risk_score, risk_level, status)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                            (employee_ref, user, "CERT Dataset", "Dataset User", "CERT Ground Truth", device, "Dataset activity", 55 if is_insider else 15, risk_level_for_score(55 if is_insider else 15), "under_review" if is_insider else "active"),
                        )
                        employee = connection.execute("SELECT id FROM employees WHERE employee_id = ?", (employee_ref,)).fetchone()
                    event_map = {"logon": "Login Event", "device": "USB Device", "http": "Network Activity", "file": "File Access", "email": "Email Activity"}
                    event_type = event_map.get(event_kind.lower(), "Application Usage")
                    severity = "High" if user in labels else "Low"
                    metadata = {"cert_event_id": event_id, "cert_file": path.name, "ground_truth_insider": user in labels, "scenarios": labels.get(user, [])}
                    connection.execute(
                        """INSERT INTO activity_logs (employee_id, event_type, source, description, severity, asset, actor, event_time, ingested_by, batch_id, metadata)
                           VALUES (?, ?, 'CERT Dataset', ?, ?, ?, ?, ?, ?, ?, ?)""",
                        (employee["id"], event_type, detail[:300] or event_kind, severity, device, user, event_time, admin["id"], batch_id, json.dumps(metadata, separators=(",", ":"))),
                    )
                    imported_events += 1
        connection.execute("UPDATE ingestion_batches SET received_count = ?, accepted_count = ? WHERE id = ?", (imported_events, imported_events, batch_id))
        connection.commit()
    return {"status": "imported", "users": len(imported_users), "events": imported_events, "labeled_insiders": len(labels), "files": len(activity_files)}


def _feature_rows(connection) -> list[dict[str, Any]]:
    rows = connection.execute(
        """
        SELECT e.id, e.employee_id, e.full_name, e.department,
               COUNT(a.id) AS event_count,
               COALESCE(SUM(CASE WHEN a.event_type = 'Login Event' THEN 1 ELSE 0 END), 0) AS logon_count,
               COALESCE(SUM(CASE WHEN a.severity IN ('High', 'Critical') THEN 1 ELSE 0 END), 0) AS elevated_events,
               COALESCE(SUM(CASE WHEN a.event_type IN ('File Download', 'File Upload', 'Data Transfer', 'USB Device') THEN 1 ELSE 0 END), 0) AS transfer_events,
               COALESCE(SUM(CASE WHEN a.event_type = 'USB Device' THEN 1 ELSE 0 END), 0) AS usb_connect_count,
               COALESCE(SUM(CASE WHEN a.event_type IN ('File Download', 'File Upload', 'Data Transfer') THEN 1 ELSE 0 END), 0) AS file_copy_count,
               COALESCE(SUM(CASE WHEN a.event_type = 'Email Activity' THEN 1 ELSE 0 END), 0) AS email_count,
            COALESCE(SUM(CASE WHEN a.event_type = 'Login Event'
                               AND (CAST(strftime('%H', a.event_time) AS INTEGER) < 7
                                   OR CAST(strftime('%H', a.event_time) AS INTEGER) >= 21)
                           THEN 1 ELSE 0 END), 0) AS after_hours_logon_count,
               COALESCE(SUM(CASE WHEN CAST(strftime('%H', a.event_time) AS INTEGER) < 7
                                      OR CAST(strftime('%H', a.event_time) AS INTEGER) >= 21 THEN 1 ELSE 0 END), 0) AS after_hours_events,
               COUNT(DISTINCT a.asset) AS unique_assets,
               COALESCE(SUM(CASE a.severity WHEN 'Critical' THEN 12 WHEN 'High' THEN 7 WHEN 'Medium' THEN 3 WHEN 'Low' THEN 1 ELSE 0 END), 0) AS severity_points
        FROM employees e
        LEFT JOIN activity_logs a ON a.employee_id = e.id
        GROUP BY e.id
        ORDER BY e.id
        """
    ).fetchall()
    return [dict(row) for row in rows]


def _load_bundle() -> tuple[Any, list[str], Any, str]:
    if not MODEL_PATH.exists():
        return None, [], None, MODEL_VERSION
    try:
        import joblib
        bundle = joblib.load(MODEL_PATH)
        model = bundle["model"]
        feature_cols = list(bundle["feature_cols"])
        scaler = bundle.get("scaler")
        if not feature_cols or not hasattr(model, "n_features_in_"):
            raise ValueError("Model bundle is missing feature metadata")
        if int(model.n_features_in_) != len(feature_cols):
            raise ValueError("Model feature count does not match feature_cols")
        return model, feature_cols, scaler, bundle.get("model_version", "supplied-model")
    except Exception:
        return None, [], None, MODEL_VERSION


def _vectors(rows: list[dict[str, Any]], feature_cols: list[str]) -> list[list[float]]:
    aliases = {
        "logons": "logon_count", "logon": "logon_count",
        "after_hours_logons": "after_hours_logon_count", "after_hours_login_count": "after_hours_logon_count",
        "usb_connections": "usb_connect_count", "usb_count": "usb_connect_count",
        "file_copies": "file_copy_count", "file_transfers": "file_copy_count",
        "emails": "email_count",
        "events": "event_count", "event_frequency": "event_count", "high_risk_events": "elevated_events",
        "data_transfers": "transfer_events", "off_hours": "after_hours_events", "off_hours_events": "after_hours_events",
        "assets": "unique_assets", "severity": "severity_points", "severity_score": "severity_points",
    }
    return [[float(row.get(aliases.get(name, name), 0) or 0) for name in feature_cols] for row in rows]


def _score_rows(rows: list[dict[str, Any]]) -> tuple[list[float], str]:
    model, feature_cols, scaler, version = _load_bundle()
    if model is None:
        scores = [min(100.0, row["severity_points"] * 4 + row["after_hours_events"] * 12 + row["transfer_events"] * 10) for row in rows]
        return scores, version
    try:
        values = _vectors(rows, feature_cols)
        transformed = scaler.transform(values) if scaler is not None else values
        predictions = model.decision_function(transformed)
        minimum, maximum = min(predictions), max(predictions)
        spread = maximum - minimum or 1.0
        return [round((maximum - value) / spread * 100, 2) for value in predictions], version
    except Exception:
        return [min(100.0, row["severity_points"] * 4 + row["after_hours_events"] * 12 + row["transfer_events"] * 10) for row in rows], MODEL_VERSION


def run_analytics() -> dict[str, Any]:
    with get_connection() as connection:
        rows = _feature_rows(connection)
        scores, model_version = _score_rows(rows)
        connection.execute("DELETE FROM anomalies WHERE status = 'open'")
        anomaly_count = 0
        for row, score in zip(rows, scores):
            risk_score = round(min(100, score * 0.65 + row["severity_points"] * 2.0 + row["after_hours_events"] * 3.0))
            category = "Behavioral deviation"
            if row["transfer_events"]:
                category = "Potential data exfiltration"
            elif row["after_hours_events"]:
                category = "Unusual login or access time"
            severity = "Critical" if risk_score >= 85 else "High" if risk_score >= 70 else "Medium" if risk_score >= 40 else "Low"
            explanation = f"{row['event_count']} events, {row['elevated_events']} elevated, {row['transfer_events']} transfer-related, {row['after_hours_events']} after-hours."
            connection.execute(
                """
                INSERT INTO behavioral_profiles (employee_id, feature_values, baseline_summary, model_version)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(employee_id) DO UPDATE SET feature_values=excluded.feature_values,
                  baseline_summary=excluded.baseline_summary, model_version=excluded.model_version,
                  updated_at=CURRENT_TIMESTAMP
                """,
                (row["id"], json.dumps(row), json.dumps({"peer_group": row["department"], "event_count": row["event_count"]}), model_version),
            )
            connection.execute(
                "UPDATE employees SET risk_score = ?, risk_level = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (risk_score, risk_level_for_score(risk_score), row["id"]),
            )
            if risk_score >= 40:
                connection.execute(
                    "INSERT INTO anomalies (employee_id, anomaly_score, category, severity, explanation) VALUES (?, ?, ?, ?, ?)",
                    (row["id"], round(score, 2), category, severity, explanation),
                )
                anomaly_count += 1
        connection.commit()
    return {"employees_analyzed": len(rows), "anomalies_created": anomaly_count, "model_version": model_version, "ran_at": datetime.utcnow().isoformat()}


def train_model(dataset_path: Path, target_column: str | None = None) -> dict[str, Any]:
    import joblib
    import pandas as pd
    from sklearn.ensemble import IsolationForest
    from sklearn.preprocessing import StandardScaler

    frame = pd.read_csv(dataset_path)
    numeric = frame.select_dtypes(include="number")
    if target_column and target_column in numeric:
        numeric = numeric.drop(columns=[target_column])
    if numeric.shape[1] == 0 or len(numeric) < 2:
        raise ValueError("Dataset needs at least two rows and one numeric feature column")
    feature_cols = list(numeric.columns)
    scaler = StandardScaler()
    values = scaler.fit_transform(numeric.fillna(0))
    model = IsolationForest(n_estimators=150, contamination="auto", random_state=42)
    model.fit(values)
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump({"model": model, "feature_cols": feature_cols, "scaler": scaler, "model_version": "trained-isolation-forest-v1"}, MODEL_PATH)
    return {"model_path": str(MODEL_PATH), "rows": len(frame), "feature_cols": feature_cols, "model_version": "trained-isolation-forest-v1"}


def list_rows(table: str, limit: int = 100) -> list[dict]:
    allowed = {"behavioral_profiles", "anomalies", "investigations", "datasets"}
    if table not in allowed:
        raise ValueError("Unsupported analytics table")
    with get_connection() as connection:
        rows = connection.execute(f"SELECT * FROM {table} ORDER BY id DESC LIMIT ?", (limit,)).fetchall()
    return [row_to_dict(row) for row in rows]
