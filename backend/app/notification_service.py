"""
Activity Management System (AMS) — Notification & Escalation Service
-------------------------------------------------------------------
Module 11: Automated Security Notification & Escalation Pipelines.
Handles real SMTP email and Slack webhook alert delivery with:
  1. Configurable delivery via environment variables (inert when unconfigured).
  2. Complete audit logging (NOTIFICATION_SENT, NOTIFICATION_FAILED, NOTIFICATION_SKIPPED).
  3. Failure isolation (never crashes the calling anomaly/incident workflow).
  4. Scheduled / on-demand Daily Security Digest generator.
"""

import os
import smtplib
import ssl
import json
import datetime
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional, Dict, Any, List
import urllib.request
import urllib.error
from sqlalchemy.orm import Session

from app.config import settings
from app.models import SystemSetting, AuditLog, Employee, Incident, TelemetryLog, User
from app.audit_service import log_audit_event


def is_email_configured() -> bool:
    """Returns True only if SMTP server host is configured via environment."""
    return bool(settings.SMTP_HOST and settings.SMTP_HOST.strip())


def is_slack_configured() -> bool:
    """Returns True only if a valid Slack incoming webhook URL is configured."""
    url = settings.SLACK_WEBHOOK_URL.strip() if settings.SLACK_WEBHOOK_URL else ""
    return bool(url and url.startswith("https://hooks.slack.com/"))


def get_delivery_channel_status() -> Dict[str, Any]:
    """Returns the live configuration state of alert delivery channels."""
    email_ok = is_email_configured()
    slack_ok = is_slack_configured()

    channels = []
    if email_ok:
        channels.append("SMTP Email")
    if slack_ok:
        channels.append("Slack Webhook")

    summary_parts = []
    if email_ok:
        summary_parts.append(f"Email Active ({settings.SMTP_HOST}:{settings.SMTP_PORT})")
    else:
        summary_parts.append("Email Not Configured (Set SMTP_HOST)")

    if slack_ok:
        summary_parts.append("Slack Active (Webhook configured)")
    else:
        summary_parts.append("Slack Not Configured (Set SLACK_WEBHOOK_URL)")

    return {
        "email_configured": email_ok,
        "email_host": settings.SMTP_HOST if email_ok else "Not Configured",
        "email_recipient": settings.NOTIFICATION_ALERT_EMAIL,
        "slack_configured": slack_ok,
        "status_summary": " | ".join(summary_parts),
        "active_channels": channels,
        "delivery_mode": "live" if (email_ok or slack_ok) else "inert_safeguard",
    }


def send_email_alert(
    subject: str,
    text_content: str,
    html_content: Optional[str] = None,
    recipient: Optional[str] = None,
    timeout_sec: int = 8,
) -> Dict[str, Any]:
    """
    Delivers a real security alert email via SMTP if credentials are configured.
    Never raises an unhandled exception; returns a status dictionary.
    """
    if not is_email_configured():
        return {
            "success": False,
            "channel": "Email",
            "error": "Email delivery is not configured (SMTP_HOST environment variable not set).",
            "skipped": True,
        }

    to_addr = recipient or settings.NOTIFICATION_ALERT_EMAIL
    from_addr = settings.SMTP_FROM or "ams-alerts@enterprise.internal"

    msg = MIMEMultipart("alternative")
    msg["Subject"] = f"[AMS Security Alert] {subject}"
    msg["From"] = from_addr
    msg["To"] = to_addr
    msg["X-Priority"] = "1"

    # Plain text version
    msg.attach(MIMEText(text_content, "plain"))

    # Rich HTML version if provided
    if html_content:
        msg.attach(MIMEText(html_content, "html"))

    try:
        if settings.SMTP_USE_TLS:
            context = ssl.create_default_context()
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout_sec) as server:
                server.ehlo()
                server.starttls(context=context)
                server.ehlo()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, [to_addr], msg.as_string())
        else:
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=timeout_sec) as server:
                server.ehlo()
                if settings.SMTP_USERNAME and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
                server.sendmail(from_addr, [to_addr], msg.as_string())

        return {
            "success": True,
            "channel": "Email",
            "recipient": to_addr,
            "timestamp": datetime.datetime.utcnow().isoformat(),
        }
    except Exception as e:
        return {
            "success": False,
            "channel": "Email",
            "recipient": to_addr,
            "error": f"SMTP Delivery Failure: {str(e)}",
            "skipped": False,
        }


def send_slack_alert(
    title: str,
    message: str,
    severity: str = "HIGH",
    fields: Optional[Dict[str, Any]] = None,
    timeout_sec: int = 5,
) -> Dict[str, Any]:
    """
    Delivers a real JSON payload to Slack Incoming Webhook if configured.
    Never raises an unhandled exception; returns a status dictionary.
    """
    if not is_slack_configured():
        return {
            "success": False,
            "channel": "Slack",
            "error": "Slack delivery is not configured (SLACK_WEBHOOK_URL environment variable not set).",
            "skipped": True,
        }

    webhook_url = settings.SLACK_WEBHOOK_URL.strip()
    color = "#F43F5E" if severity.upper() == "CRITICAL" else "#F59E0B" if severity.upper() == "HIGH" else "#3B82F6"

    # Build Slack Block Kit payload
    payload: Dict[str, Any] = {
        "text": f"🚨 *[AMS {severity.upper()} Alert]* {title}\n{message}",
        "attachments": [
            {
                "color": color,
                "title": title,
                "text": message,
                "fields": [
                    {"title": k, "value": str(v), "short": True}
                    for k, v in (fields or {}).items()
                ],
                "footer": "AMS Insider Threat Behavioral Intelligence Platform",
                "ts": int(datetime.datetime.utcnow().timestamp()),
            }
        ],
    }

    try:
        req_data = json.dumps(payload).encode("utf-8")
        req = urllib.request.Request(
            webhook_url,
            data=req_data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=timeout_sec) as response:
            resp_body = response.read().decode("utf-8")
            return {
                "success": True,
                "channel": "Slack",
                "response": resp_body,
                "timestamp": datetime.datetime.utcnow().isoformat(),
            }
    except Exception as e:
        return {
            "success": False,
            "channel": "Slack",
            "error": f"Slack Webhook Delivery Failure: {str(e)}",
            "skipped": False,
        }


def dispatch_security_alert(
    db: Session,
    alert_type: str,
    severity: str,
    title: str,
    details: Dict[str, Any],
    actor_user: Optional[User] = None,
) -> Dict[str, Any]:
    """
    Coordinates security alert dispatching based on configured policy toggles:
      - Validates user toggles (high_severity_alerts, critical_severity_urgent)
      - Dispatches to Email and Slack
      - Persists an immutable audit log entry for every attempt
      - Returns comprehensive status without crashing the caller
    """
    # 1. Fetch live notification toggles from database
    setting_row = db.query(SystemSetting).filter(SystemSetting.key == "notification_settings").first()
    toggles = setting_row.value if setting_row and isinstance(setting_row.value, dict) else {
        "high_severity_alerts": True,
        "critical_severity_urgent": True,
        "daily_security_digest": True,
        "alert_delivery_email": settings.NOTIFICATION_ALERT_EMAIL,
    }

    is_critical = severity.upper() == "CRITICAL"
    is_high = severity.upper() == "HIGH"

    # Check if policy permits delivery
    if is_critical and not toggles.get("critical_severity_urgent", True):
        log_audit_event(
            db=db,
            user=actor_user,
            action="NOTIFICATION_SKIPPED",
            target_resource=f"Alert:{alert_type}",
            details={"reason": "Critical severity urgent alerts toggle disabled in settings", "severity": severity},
        )
        return {"delivered": False, "reason": "Critical severity alerts toggle disabled"}

    if is_high and not is_critical and not toggles.get("high_severity_alerts", True):
        log_audit_event(
            db=db,
            user=actor_user,
            action="NOTIFICATION_SKIPPED",
            target_resource=f"Alert:{alert_type}",
            details={"reason": "High severity alerts toggle disabled in settings", "severity": severity},
        )
        return {"delivered": False, "reason": "High severity alerts toggle disabled"}

    # 2. Format alert content
    recipient_email = toggles.get("alert_delivery_email") or settings.NOTIFICATION_ALERT_EMAIL
    plain_text = (
        f"ACTIVITY MANAGEMENT SYSTEM — AUTOMATED THREAT ALERT\n"
        f"====================================================\n"
        f"Alert Type:   {alert_type}\n"
        f"Severity:     {severity.upper()}\n"
        f"Title:        {title}\n"
        f"Timestamp:    {datetime.datetime.utcnow().strftime('%Y-%m-%d %H:%M:%S UTC')}\n\n"
        f"Details:\n"
        + "\n".join(f"  • {k}: {v}" for k, v in details.items())
        + "\n\nImmediate SOC review required via AMS Dashboard: http://localhost:4000/incidents"
    )

    results: Dict[str, Any] = {"alert_type": alert_type, "severity": severity, "channels": {}}

    # 3. Deliver via Email
    email_result = send_email_alert(
        subject=f"{severity.upper()} Priority: {title}",
        text_content=plain_text,
        recipient=recipient_email,
    )
    results["channels"]["email"] = email_result

    # 4. Deliver via Slack
    slack_result = send_slack_alert(
        title=f"[{severity.upper()}] {title}",
        message=f"Threat detected for employee {details.get('employee_id', 'Unknown')}: {details.get('description', '')}",
        severity=severity,
        fields=details,
    )
    results["channels"]["slack"] = slack_result

    # 5. Record Audit Log for the notification event
    email_success = email_result.get("success", False) if isinstance(email_result, dict) else bool(email_result)
    slack_success = slack_result.get("success", False) if isinstance(slack_result, dict) else bool(slack_result)
    delivery_success = email_success or slack_success

    email_skipped = email_result.get("skipped", False) if isinstance(email_result, dict) else False
    slack_skipped = slack_result.get("skipped", False) if isinstance(slack_result, dict) else False
    both_unconfigured = email_skipped and slack_skipped

    action_label = (
        "NOTIFICATION_SENT" if delivery_success
        else "NOTIFICATION_SKIPPED" if both_unconfigured
        else "NOTIFICATION_FAILED"
    )

    log_audit_event(
        db=db,
        user=actor_user,
        action=action_label,
        target_resource=f"Notification:{alert_type}:{severity}",
        details={
            "title": title,
            "email_status": email_result,
            "slack_status": slack_result,
            "recipient": recipient_email,
            "alert_details": details,
        },
    )

    return results


def send_daily_digest(db: Session, triggered_by_user: Optional[User] = None) -> Dict[str, Any]:
    """
    Synthesizes a 24-hour executive summary of the fleet's threat posture and dispatches it
    via configured channels (or reports unconfigured status clearly).
    """
    now = datetime.datetime.utcnow()
    one_day_ago = now - datetime.timedelta(days=1)

    # 1. Aggregate fleet posture data
    employees = db.query(Employee).all()
    total_employees = len(employees)
    critical_users = sum(1 for e in employees if e.risk_category == "CRITICAL")
    high_risk_users = sum(1 for e in employees if e.risk_category == "HIGH")
    medium_risk_users = sum(1 for e in employees if e.risk_category == "MEDIUM")
    avg_threat = round(sum(e.threat_score for e in employees) / max(total_employees, 1), 1)

    # Incidents in last 24h
    incidents_24h = db.query(Incident).filter(Incident.created_at >= one_day_ago).all()
    open_incidents = sum(1 for inc in incidents_24h if inc.status == "Open")
    escalated_incidents = sum(1 for inc in incidents_24h if inc.status == "Escalated")

    # Telemetry volume in last 24h
    logs_24h_count = db.query(TelemetryLog).filter(TelemetryLog.timestamp >= one_day_ago).count()

    digest_summary = {
        "report_date": now.strftime("%Y-%m-%d"),
        "fleet_threat_score": avg_threat,
        "total_monitored_identities": total_employees,
        "critical_risk_identities": critical_users,
        "high_risk_identities": high_risk_users,
        "medium_risk_identities": medium_risk_users,
        "incidents_24h_new": len(incidents_24h),
        "open_unresolved_incidents": open_incidents,
        "escalated_incidents": escalated_incidents,
        "telemetry_events_ingested": logs_24h_count,
    }

    # Format message
    plain_text = (
        f"ACTIVITY MANAGEMENT SYSTEM (AMS) — DAILY SECURITY DIGEST\n"
        f"Report Generated: {now.strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
        f"-------------------------------------------------------------------\n"
        f"Fleet Posture Summary:\n"
        f"  • Fleet Average Threat Score:   {avg_threat}/100\n"
        f"  • Monitored Workforce Fleet:     {total_employees} Identities\n"
        f"  • Critical Severity Outliers:    {critical_users}\n"
        f"  • High Risk Active Entities:     {high_risk_users}\n"
        f"  • Moderate Risk Tracked:         {medium_risk_users}\n\n"
        f"Operational Incident Velocity (Past 24h):\n"
        f"  • New Incidents Opened:          {len(incidents_24h)}\n"
        f"  • Active Escalated Cases:        {escalated_incidents}\n"
        f"  • Total Telemetry Logs Audited:  {logs_24h_count}\n\n"
        f"Review executive posture at: http://localhost:4000/executive\n"
    )

    # Dispatch to channels
    email_res = send_email_alert(
        subject=f"Daily Security Digest ({now.strftime('%Y-%m-%d')}) — Fleet Index: {avg_threat}/100",
        text_content=plain_text,
    )
    slack_res = send_slack_alert(
        title=f"📊 Daily Security Digest ({now.strftime('%Y-%m-%d')})",
        message=f"Fleet Threat Index: {avg_threat}/100 | Critical Identities: {critical_users} | Open Cases: {open_incidents}",
        severity="INFO",
        fields=digest_summary,
    )

    # Update last digest timestamp in SystemSetting
    setting = db.query(SystemSetting).filter(SystemSetting.key == "notification_settings").first()
    if setting and isinstance(setting.value, dict):
        setting.value["last_digest_sent_at"] = now.isoformat()
        db.commit()

    # Log audit event
    email_success = email_res.get("success", False) if isinstance(email_res, dict) else bool(email_res)
    slack_success = slack_res.get("success", False) if isinstance(slack_res, dict) else bool(slack_res)
    delivery_success = email_success or slack_success
    action_label = "NOTIFICATION_SENT" if delivery_success else "NOTIFICATION_SKIPPED"

    log_audit_event(
        db=db,
        user=triggered_by_user,
        action=action_label,
        target_resource="DailySecurityDigest",
        details={
            "digest_summary": digest_summary,
            "email_status": email_res,
            "slack_status": slack_res,
            "triggered_manually": triggered_by_user is not None,
        },
    )

    return {
        "status": "completed",
        "timestamp": now,
        "digest_summary": digest_summary,
        "channels_attempted": ["Email", "Slack"],
        "delivery_status": {
            "email": email_res.get("error") or ("Delivered" if email_res.get("success") else "Skipped"),
            "slack": slack_res.get("error") or ("Delivered" if slack_res.get("success") else "Skipped"),
        },
        "audit_logged": True,
    }
