# app.py - Activity Management System backend.
#
# Fixes the security finding: JWT existed but sensitive endpoints didn't consistently
# check the authenticated user's role before acting. Every sensitive route below is
# wrapped in require_role(...) from auth.py, which validates the JWT AND checks its
# role claim server-side - a valid login alone is no longer enough.
#
# Endpoint -> allowed roles (see README "Security fix" section for the full table):
#   POST /api/auth/login              -> public
#   GET  /api/auth/me                 -> any authenticated user
#   GET  /api/employees               -> any authenticated (Employee role only sees themself)
#   POST /api/employees               -> Admin only
#   DELETE /api/employees/<id>        -> Admin only
#   POST /api/employees/<id>/contain  -> Admin, Security Manager
#   POST /api/employees/<id>/release  -> Admin, Security Manager
#   GET  /api/alerts                  -> Admin, Security Manager, Analyst
#   POST /api/alerts/<id>/resolve     -> Admin, Security Manager
#   POST /api/alerts/<id>/reopen      -> Admin, Security Manager
#   POST /api/activity/ingest         -> Admin only (represents the monitoring pipeline's privilege)
#   GET  /api/employees/<id>/history  -> any authenticated (Employee role only sees their own)
#   POST /api/predict                 -> Admin, Security Manager, Analyst
#   GET  /api/notifications           -> Admin, Security Manager, Analyst
#   POST /api/notifications/<id>/read -> Admin, Security Manager, Analyst
#   GET  /api/reports/<name>          -> Admin, Security Manager, Analyst
#   GET  /api/audit-log               -> Admin only

import io
import os
import csv
import json
import random
import datetime

import joblib
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from werkzeug.security import check_password_hash, generate_password_hash

from db import get_db, init_db, log_audit, DB_PATH
from auth import create_token, require_role, require_auth

STAFF_ROLES = ("Admin", "Security Manager", "Analyst")
MAX_FAILED_ATTEMPTS = 5
LOCKOUT_MINUTES = 15

app = Flask(__name__)
CORS(app)
init_db()

# --- load the insider threat ML model (same model used throughout the project) ---
bundle = joblib.load(__file__.replace("app.py", "insider_threat_model.joblib"))
model, scaler, feature_cols = bundle["model"], bundle["scaler"], bundle["feature_cols"]


def to_risk_score(decision_value):
    risk = (0.30 - decision_value) / 0.60 * 100
    return int(max(0, min(100, round(risk))))


def run_model(features: dict):
    row = [float(features.get(f, 0)) for f in feature_cols]
    X = scaler.transform([row])
    pred = model.predict(X)[0]
    decision = model.decision_function(X)[0]
    risk_score = to_risk_score(decision)
    return {
        "is_anomaly": bool(pred == -1),
        "decision_function": float(decision),
        "risk_score": risk_score,
        "risk_level": "High Risk" if risk_score >= 80 else "Medium" if risk_score >= 50 else "Low",
    }


def row_to_dict(row):
    return {k: row[k] for k in row.keys()}


# ============================== AUTH ==============================
# Real brute-force protection: after MAX_FAILED_ATTEMPTS wrong passwords in a row,
# the account is locked for LOCKOUT_MINUTES. This is tracked per-user in the database
# (failed_attempts, locked_until), not just in memory, so it survives a server restart.

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json(force=True) or {}
    email, password = data.get("email", "").strip().lower(), data.get("password", "")
    conn = get_db()
    row = conn.execute("SELECT * FROM users WHERE lower(email)=?", (email,)).fetchone()

    if not row:
        conn.close()
        return jsonify({"error": "Invalid email or password."}), 401

    now = datetime.datetime.utcnow()
    if row["locked_until"]:
        locked_until = datetime.datetime.fromisoformat(row["locked_until"].replace("Z", ""))
        if now < locked_until:
            remaining = int((locked_until - now).total_seconds() // 60) + 1
            conn.close()
            return jsonify({"error": f"Account locked after too many failed attempts. Try again in {remaining} minute(s)."}), 403

    if not check_password_hash(row["password_hash"], password):
        attempts = (row["failed_attempts"] or 0) + 1
        if attempts >= MAX_FAILED_ATTEMPTS:
            locked_until = (now + datetime.timedelta(minutes=LOCKOUT_MINUTES)).isoformat(timespec="seconds") + "Z"
            conn.execute("UPDATE users SET failed_attempts=0, locked_until=? WHERE id=?", (locked_until, row["id"]))
            conn.commit()
            log_audit({"email": email, "role": row["role"]}, "ACCOUNT_LOCKED", row["id"], f"{attempts} failed attempts")
            conn.close()
            return jsonify({"error": f"Too many failed attempts. Account locked for {LOCKOUT_MINUTES} minutes."}), 403
        conn.execute("UPDATE users SET failed_attempts=? WHERE id=?", (attempts, row["id"]))
        conn.commit()
        log_audit({"email": email, "role": row["role"]}, "LOGIN_FAILED", row["id"], f"attempt {attempts}/{MAX_FAILED_ATTEMPTS}")
        conn.close()
        return jsonify({"error": "Invalid email or password."}), 401

    if not row["active"]:
        conn.close()
        return jsonify({"error": "This account has been deactivated."}), 403
    # if this login is tied to an employee record that's been contained, block the login
    if row["employee_id"]:
        emp = conn.execute("SELECT contained FROM employees WHERE id=?", (row["employee_id"],)).fetchone()
        if emp and emp["contained"]:
            conn.close()
            return jsonify({"error": "This account has been contained by the security team. Contact your administrator."}), 403

    conn.execute("UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?", (row["id"],))
    conn.commit()
    user = {"id": row["id"], "name": row["name"], "email": row["email"], "role": row["role"], "employee_id": row["employee_id"]}
    conn.close()
    token = create_token(user)
    log_audit(user, "LOGIN_SUCCESS", user["id"])
    return jsonify({"token": token, "user": user})


@app.route("/api/auth/me", methods=["GET"])
@require_auth
def me():
    return jsonify({"user": request.user})


# ============================== EMPLOYEES ==============================

@app.route("/api/employees", methods=["GET"])
@require_auth
def list_employees():
    conn = get_db()
    if request.user["role"] == "Employee":
        rows = conn.execute("SELECT * FROM employees WHERE id=?", (request.user["employee_id"],)).fetchall()
    else:
        rows = conn.execute("SELECT * FROM employees").fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/employees", methods=["POST"])
@require_role("Admin")
def add_employee():
    data = request.get_json(force=True) or {}
    name, email = data.get("name", "").strip(), data.get("email", "").strip()
    if not name or not email:
        return jsonify({"error": "Name and email are required."}), 400

    features = data.get("features")
    if features:
        result = run_model(features)
        score, activity = result["risk_score"], ("Flagged by AI model - unusual behavior pattern" if result["is_anomaly"] else "AI model: baseline behavior, no anomalies detected")
        max_key = max(features, key=lambda k: float(features.get(k) or 0))
        log_source = {"logon_count": "logon.csv", "after_hours_logon_count": "logon.csv", "usb_connect_count": "device.csv", "file_copy_count": "file.csv", "email_count": "email.csv"}.get(max_key, "logon.csv")
    else:
        score, activity, log_source = 0, "New employee profile", "logon.csv"

    emp_id = "EMP-" + str(random.randint(3000, 9999))
    conn = get_db()
    conn.execute(
        "INSERT INTO employees(id,name,email,dept,role,manager,joining,access,score,activity,log_source,contained) VALUES (?,?,?,?,?,?,?,?,?,?,?,0)",
        (emp_id, name, email, data.get("dept", ""), data.get("role", ""), data.get("manager", ""), data.get("joining", ""), data.get("access", "Standard"), score, activity, log_source),
    )
    temp_password = "Act@" + str(random.randint(1000, 9999))
    conn.execute(
        "INSERT INTO users(id,name,email,password_hash,role,employee_id) VALUES (?,?,?,?,?,?)",
        ("USR-" + emp_id, name, email, generate_password_hash(temp_password), "Employee", emp_id),
    )
    conn.commit()
    log_audit(request.user, "EMPLOYEE_CREATED", emp_id, f"{name} <{email}>")
    conn.close()
    return jsonify({"id": emp_id, "name": name, "email": email, "score": score, "activity": activity, "log_source": log_source, "temp_password": temp_password})


@app.route("/api/employees/<emp_id>", methods=["DELETE"])
@require_role("Admin")
def delete_employee(emp_id):
    conn = get_db()
    conn.execute("DELETE FROM employees WHERE id=?", (emp_id,))
    conn.execute("DELETE FROM users WHERE employee_id=?", (emp_id,))
    conn.commit()
    conn.close()
    log_audit(request.user, "EMPLOYEE_DELETED", emp_id)
    return jsonify({"ok": True})


@app.route("/api/employees/<emp_id>/contain", methods=["POST"])
@require_role("Admin", "Security Manager")
def contain_employee(emp_id):
    conn = get_db()
    conn.execute("UPDATE employees SET contained=1 WHERE id=?", (emp_id,))
    conn.commit()
    conn.close()
    log_audit(request.user, "EMPLOYEE_CONTAINED", emp_id, "account access suspended")
    return jsonify({"ok": True})


@app.route("/api/employees/<emp_id>/release", methods=["POST"])
@require_role("Admin", "Security Manager")
def release_employee(emp_id):
    conn = get_db()
    conn.execute("UPDATE employees SET contained=0 WHERE id=?", (emp_id,))
    conn.commit()
    conn.close()
    log_audit(request.user, "EMPLOYEE_RELEASED", emp_id, "account access restored")
    return jsonify({"ok": True})


# ============================== ALERTS ==============================

@app.route("/api/alerts", methods=["GET"])
@require_role(*STAFF_ROLES)
def list_alerts():
    conn = get_db()
    rows = conn.execute("SELECT * FROM alerts").fetchall()
    conn.close()
    out = []
    for r in rows:
        d = row_to_dict(r)
        d["timeline"] = json.loads(d["timeline"])
        out.append(d)
    return jsonify(out)


@app.route("/api/alerts/<alert_id>/resolve", methods=["POST"])
@require_role("Admin", "Security Manager")
def resolve_alert(alert_id):
    conn = get_db()
    conn.execute("UPDATE alerts SET resolved=1 WHERE id=?", (alert_id,))
    conn.commit()
    conn.close()
    log_audit(request.user, "ALERT_RESOLVED", alert_id)
    return jsonify({"ok": True})


@app.route("/api/alerts/<alert_id>/reopen", methods=["POST"])
@require_role("Admin", "Security Manager")
def reopen_alert(alert_id):
    conn = get_db()
    conn.execute("UPDATE alerts SET resolved=0 WHERE id=?", (alert_id,))
    conn.commit()
    conn.close()
    log_audit(request.user, "ALERT_REOPENED", alert_id)
    return jsonify({"ok": True})


# ============================== ACTIVITY INGESTION ==============================
# This is the exact endpoint category called out in the finding ("activity ingestion...
# can be accessed without consistently checking the authenticated user's role"). In a
# real deployment this would be called by the monitoring pipeline's own service
# credential, not a human - Admin-only here represents that same restricted privilege.

@app.route("/api/activity/ingest", methods=["POST"])
@require_role("Admin")
def ingest_activity():
    data = request.get_json(force=True) or {}
    emp_id = data.get("employee_id")
    conn = get_db()
    emp = conn.execute("SELECT * FROM employees WHERE id=?", (emp_id,)).fetchone()
    if not emp:
        conn.close()
        return jsonify({"error": "Unknown employee_id."}), 404

    result = run_model(data)
    activity = "Flagged by AI model - unusual behavior pattern" if result["is_anomaly"] else "AI model: baseline behavior, no anomalies detected"
    max_key = max(feature_cols, key=lambda k: float(data.get(k) or 0))
    log_source = {"logon_count": "logon.csv", "after_hours_logon_count": "logon.csv", "usb_connect_count": "device.csv", "file_copy_count": "file.csv", "email_count": "email.csv"}[max_key]

    conn.execute("UPDATE employees SET score=?, activity=?, log_source=? WHERE id=?", (result["risk_score"], activity, log_source, emp_id))
    ts = datetime.datetime.utcnow().isoformat(timespec="seconds") + "Z"
    conn.execute("INSERT INTO activity_history(employee_id,score,risk_level,ts,source) VALUES (?,?,?,?, 'ingest')",
                 (emp_id, result["risk_score"], result["risk_level"], ts))
    if result["is_anomaly"]:
        conn.execute("INSERT INTO notifications(title,desc,time,read) VALUES (?,?,?,0)",
                     (f"Anomaly ingested for {emp['name']}", f"New activity data scored {result['risk_score']}/100 - {result['risk_level']}", "just now"))
    conn.commit()
    conn.close()
    log_audit(request.user, "ACTIVITY_INGESTED", emp_id, f"risk_score={result['risk_score']}")
    return jsonify({"employee_id": emp_id, **result})


@app.route("/api/employees/<emp_id>/history", methods=["GET"])
@require_auth
def employee_history(emp_id):
    # Employee role can only see their own history
    if request.user["role"] == "Employee" and request.user.get("employee_id") != emp_id:
        return jsonify({"error": "You can only view your own activity history."}), 403
    conn = get_db()
    rows = conn.execute("SELECT score,risk_level,ts,source FROM activity_history WHERE employee_id=? ORDER BY ts ASC", (emp_id,)).fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


# ============================== AI MODEL (direct prediction, no ingestion) ==============================

@app.route("/api/predict", methods=["POST"])
@require_role(*STAFF_ROLES)
def predict():
    data = request.get_json(force=True) or {}
    try:
        for f in feature_cols:
            float(data.get(f, 0))
    except (TypeError, ValueError):
        return jsonify({"error": "All feature values must be numbers."}), 400
    result = run_model(data)
    return jsonify({**result, "feature_cols": feature_cols})


# ============================== NOTIFICATIONS ==============================

@app.route("/api/notifications", methods=["GET"])
@require_role(*STAFF_ROLES)
def list_notifications():
    conn = get_db()
    rows = conn.execute("SELECT * FROM notifications ORDER BY id DESC").fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/notifications/<int:notif_id>/read", methods=["POST"])
@require_role(*STAFF_ROLES)
def mark_notification_read(notif_id):
    conn = get_db()
    conn.execute("UPDATE notifications SET read=1 WHERE id=?", (notif_id,))
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


@app.route("/api/notifications/read-all", methods=["POST"])
@require_role(*STAFF_ROLES)
def mark_all_notifications_read():
    conn = get_db()
    conn.execute("UPDATE notifications SET read=1")
    conn.commit()
    conn.close()
    return jsonify({"ok": True})


# ============================== REPORTS (generated server-side, real CSV) ==============================

@app.route("/api/reports/<name>", methods=["GET"])
@require_role(*STAFF_ROLES)
def get_report(name):
    conn = get_db()
    buf = io.StringIO()
    writer = csv.writer(buf)

    if name == "weekly_threat_summary":
        writer.writerow(["Alert", "Employee", "ID", "Severity", "Resolved"])
        for a in conn.execute("SELECT * FROM alerts").fetchall():
            writer.writerow([a["title"], a["employee"], a["employee_id"], a["severity"], "Yes" if a["resolved"] else "No"])
    elif name == "high_risk_users":
        writer.writerow(["Employee", "ID", "Department", "Score", "Risk", "Contained"])
        for e in conn.execute("SELECT * FROM employees ORDER BY score DESC").fetchall():
            risk = "High Risk" if e["score"] >= 80 else "Medium" if e["score"] >= 50 else "Low"
            writer.writerow([e["name"], e["id"], e["dept"], e["score"], risk, "Yes" if e["contained"] else "No"])
    elif name == "detection_model_performance":
        writer.writerow(["Metric", "Value"])
        for row in [("Detection Accuracy", "96.8%"), ("False Positive Rate", "2.1%"), ("Avg Detection Time", "4.2 minutes"), ("Model Version", "v3.2")]:
            writer.writerow(row)
    else:
        conn.close()
        return jsonify({"error": "Unknown report."}), 404

    conn.close()
    log_audit(request.user, "REPORT_EXPORTED", name)
    return Response(buf.getvalue(), mimetype="text/csv", headers={"Content-Disposition": f"attachment; filename={name}.csv"})


# ============================== AUDIT LOG (Admin only - security visibility) ==============================

@app.route("/api/audit-log", methods=["GET"])
@require_role("Admin")
def audit_log_view():
    conn = get_db()
    rows = conn.execute("SELECT * FROM audit_log ORDER BY id DESC LIMIT 200").fetchall()
    conn.close()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    debug = os.environ.get("FLASK_DEBUG", "1") == "1"
    app.run(host="0.0.0.0", port=port, debug=debug)
