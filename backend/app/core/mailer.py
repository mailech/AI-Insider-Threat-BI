"""Email escalation for module 11.

Disabled by default. A fresh checkout must never attempt to reach a mail server
-- a demo that hangs for thirty seconds on an SMTP timeout is worse than one
that does not send email at all. With ``SMTP_ENABLED=false`` every message is
logged exactly as it would have been sent, which is enough to demonstrate and
test the escalation path; setting the SMTP variables turns on real delivery
without touching a line of calling code.

Only genuinely urgent mail goes out. ``EMAIL_MIN_SEVERITY`` gates it, defaulting
to ``high``, because an inbox that receives every informational notification is
an inbox nobody reads.
"""
from __future__ import annotations

import logging
import smtplib
from email.message import EmailMessage
from typing import Dict, Iterable, List, Optional

from app.core.config import settings

logger = logging.getLogger("itbis.mailer")

# Ordered least to most urgent, so a threshold comparison is an index compare.
SEVERITY_ORDER: List[str] = ["informational", "low", "medium", "high", "critical"]


def meets_threshold(severity: str) -> bool:
    """True when a severity is at or above the configured email threshold."""
    try:
        level = SEVERITY_ORDER.index((severity or "").lower())
    except ValueError:
        return False
    try:
        floor = SEVERITY_ORDER.index((settings.EMAIL_MIN_SEVERITY or "high").lower())
    except ValueError:
        floor = SEVERITY_ORDER.index("high")
    return level >= floor


def _render(title: str, body: Optional[str], severity: str, link: Optional[str]) -> str:
    lines = [
        f"Severity : {severity.upper()}",
        f"Event    : {title}",
        "",
        body or "(no further detail)",
    ]
    if link:
        lines += ["", f"Open in the console: {settings.FRONTEND_URL.rstrip('/')}{link}"]
    lines += ["", "-- Insider Threat Behavioral Intelligence System"]
    return "\n".join(lines)


def send(
    recipients: Iterable[str],
    subject: str,
    body: Optional[str] = None,
    *,
    severity: str = "high",
    link: Optional[str] = None,
) -> Dict[str, object]:
    """Send one message, or log it when SMTP is disabled.

    Returns a delivery record. Never raises: a mail server that is down must not
    fail the alert that triggered the email.
    """
    to = [r for r in recipients if r]
    record: Dict[str, object] = {
        "to": to,
        "subject": subject,
        "severity": severity,
        "delivered": False,
        "mode": "disabled",
        "error": None,
    }
    if not to:
        return record

    content = _render(subject, body, severity, link)

    if not settings.SMTP_ENABLED:
        record["mode"] = "logged"
        logger.info(
            "[email disabled] would send to %s | %s | severity=%s", ", ".join(to), subject, severity
        )
        return record

    message = EmailMessage()
    message["From"] = settings.SMTP_FROM
    message["To"] = ", ".join(to)
    message["Subject"] = f"[{severity.upper()}] {subject}"
    message.set_content(content)

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as smtp:
            if settings.SMTP_USE_TLS:
                smtp.starttls()
            if settings.SMTP_USERNAME:
                smtp.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            smtp.send_message(message)
        record["delivered"] = True
        record["mode"] = "smtp"
        logger.info("Escalation email sent to %s: %s", ", ".join(to), subject)
    except Exception as exc:
        record["mode"] = "smtp"
        record["error"] = str(exc)
        logger.warning("SMTP delivery to %s failed: %s", ", ".join(to), exc)
    return record
