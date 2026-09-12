import datetime
from typing import List, Dict, Tuple, Any
from sqlalchemy.orm import Session
from app.models import Employee, TelemetryLog, SystemSetting
from app.config import settings

def parse_lookback_window(lookback: str) -> datetime.timedelta:
    """Parses lookback string (6h, 12h, 24h, 48h, 7d) into timedelta."""
    mapping = {
        "6h": datetime.timedelta(hours=6),
        "12h": datetime.timedelta(hours=12),
        "24h": datetime.timedelta(hours=24),
        "48h": datetime.timedelta(hours=48),
        "7d": datetime.timedelta(days=7),
    }
    return mapping.get(lookback.lower(), datetime.timedelta(hours=24))

def get_current_weights(db: Session) -> Dict[str, float]:
    """Retrieves current threat scoring weights from system settings or defaults."""
    setting = db.query(SystemSetting).filter(SystemSetting.key == "threat_scoring_weights").first()
    if setting and isinstance(setting.value, dict):
        return {
            "behavioral_anomalies": float(setting.value.get("behavioral_anomalies", 0.35)),
            "privilege_misuse": float(setting.value.get("privilege_misuse", 0.25)),
            "data_access_violations": float(setting.value.get("data_access_violations", 0.20)),
            "access_pattern_deviations": float(setting.value.get("access_pattern_deviations", 0.10)),
            "historical_security_events": float(setting.value.get("historical_security_events", 0.10)),
        }
    return settings.DEFAULT_WEIGHTS

def get_risk_tier(score: float) -> str:
    """Classifies risk score into tier: Low, Medium, High, Critical."""
    if score >= settings.TIER_HIGH_MAX:
        return "Critical"
    elif score >= settings.TIER_MEDIUM_MAX:
        return "High"
    elif score >= settings.TIER_LOW_MAX:
        return "Medium"
    return "Low"

def compute_employee_risk(
    employee: Employee,
    lookback_window: str,
    db: Session
) -> Tuple[float, str, List[Dict[str, Any]], int]:
    """
    Computes a rule-based insider threat risk score for an employee based on their telemetry
    within the lookback window.
    
    Formula:
    Insider Risk Score =
        Behavioral Anomalies        × 35%
      + Privilege Misuse Indicators × 25%
      + Data Access Violations      × 20%
      + Access Pattern Deviations   × 10%
      + Historical Security Events  × 10%
    """
    weights = get_current_weights(db)
    window_delta = parse_lookback_window(lookback_window)
    cutoff_time = datetime.datetime.utcnow() - window_delta

    # Fetch logs within window (fallback to all recent logs if window has low density)
    window_logs = db.query(TelemetryLog).filter(
        TelemetryLog.employee_id == employee.id,
        TelemetryLog.timestamp >= cutoff_time
    ).all()

    total_events = len(window_logs)
    all_logs = db.query(TelemetryLog).filter(TelemetryLog.employee_id == employee.id).all()

    # 1. Behavioral Anomalies (Weight: 35%)
    # Evaluates abnormal activity volume, anomalous event severities, and off-hour actions
    crit_count = sum(1 for l in window_logs if l.severity == "CRITICAL")
    high_count = sum(1 for l in window_logs if l.severity == "HIGH")
    med_count = sum(1 for l in window_logs if l.severity == "MEDIUM")
    
    behavioral_raw = min(100.0, (crit_count * 30.0) + (high_count * 18.0) + (med_count * 8.0) + (len(window_logs) * 2.5))
    if len(window_logs) == 0 and employee.threat_score > 50:
        # Carry forward proportional baseline if no new events in narrow window
        behavioral_raw = min(100.0, employee.threat_score * 0.9)

    # 2. Privilege Misuse Indicators (Weight: 25%)
    # Evaluates PRIVILEGE_CHANGE events, APPLICATION_USAGE, sudo escalations, admin access modifications
    priv_events = [l for l in window_logs if l.event_type in ["PRIVILEGE_CHANGE", "APPLICATION_USAGE"]]
    priv_raw = 0.0
    for p in priv_events:
        payload = p.payload or {}
        to_level = str(payload.get("to_level", "")).upper()
        if "ADMIN" in to_level or "ROOT" in to_level:
            priv_raw += 50.0
        elif p.severity in ["HIGH", "CRITICAL"]:
            priv_raw += 30.0
        else:
            priv_raw += 15.0
    if not priv_events and any(l.event_type in ["PRIVILEGE_CHANGE", "APPLICATION_USAGE"] for l in all_logs[:5]):
        priv_raw += 20.0
    priv_raw = min(100.0, priv_raw)

    # 3. Data Access Violations (Weight: 20%)
    # Evaluates DATA_TRANSFER, FILE_DOWNLOAD, FILE_UPLOAD, USB_DEVICE volume & unapproved exfiltration
    data_events = [l for l in window_logs if l.event_type in ["DATA_TRANSFER", "FILE_DOWNLOAD", "FILE_UPLOAD", "USB_DEVICE"]]
    data_raw = 0.0
    for d in data_events:
        if d.severity == "CRITICAL":
            data_raw += 40.0
        elif d.severity == "HIGH":
            data_raw += 25.0
        elif d.severity == "MEDIUM":
            data_raw += 12.0
        else:
            data_raw += 5.0
    if not data_events and any(l.event_type in ["DATA_TRANSFER", "USB_DEVICE"] for l in all_logs[:5]):
        data_raw += 15.0
    data_raw = min(100.0, data_raw)

    # 4. Access Pattern Deviations (Weight: 10%)
    # Evaluates REMOTE_ACCESS, LOGIN, NETWORK_ACTIVITY, unusual source IPs, external connections
    remote_events = [l for l in window_logs if l.event_type in ["REMOTE_ACCESS", "LOGIN", "NETWORK_ACTIVITY"]]
    access_raw = 0.0
    for r in remote_events:
        if r.severity in ["HIGH", "CRITICAL"]:
            access_raw += 35.0
        elif not r.source_ip.startswith("10.") and not r.source_ip.startswith("192.168."):
            access_raw += 20.0  # External or unknown IP
        else:
            access_raw += 5.0
    access_raw = min(100.0, access_raw)


    # 5. Historical Security Events (Weight: 10%)
    # Evaluates employee's historical severity profile across all recorded telemetry
    all_crit = sum(1 for l in all_logs if l.severity == "CRITICAL")
    all_high = sum(1 for l in all_logs if l.severity == "HIGH")
    historical_raw = min(100.0, (all_crit * 20.0) + (all_high * 10.0) + (len(all_logs) * 1.0))

    # Calculate weighted total
    w_behav = weights["behavioral_anomalies"]
    w_priv = weights["privilege_misuse"]
    w_data = weights["data_access_violations"]
    w_access = weights["access_pattern_deviations"]
    w_hist = weights["historical_security_events"]

    weighted_total = (
        (behavioral_raw * w_behav) +
        (priv_raw * w_priv) +
        (data_raw * w_data) +
        (access_raw * w_access) +
        (historical_raw * w_hist)
    )

    final_score = round(min(100.0, max(0.0, weighted_total)), 1)
    new_tier = get_risk_tier(final_score)

    components = [
        {
            "name": "Behavioral Anomalies",
            "raw_score": round(behavioral_raw, 1),
            "weight": round(w_behav, 2),
            "weighted_score": round(behavioral_raw * w_behav, 1),
            "description": f"Analyzed {len(window_logs)} events ({crit_count} Critical, {high_count} High) within {lookback_window} window."
        },
        {
            "name": "Privilege Misuse Indicators",
            "raw_score": round(priv_raw, 1),
            "weight": round(w_priv, 2),
            "weighted_score": round(priv_raw * w_priv, 1),
            "description": f"Identified {len(priv_events)} privilege escalation and role-switching attempts."
        },
        {
            "name": "Data Access Violations",
            "raw_score": round(data_raw, 1),
            "weight": round(w_data, 2),
            "weighted_score": round(data_raw * w_data, 1),
            "description": f"Audited {len(data_events)} data transfer, file upload, and download telemetry streams."
        },
        {
            "name": "Access Pattern Deviations",
            "raw_score": round(access_raw, 1),
            "weight": round(w_access, 2),
            "weighted_score": round(access_raw * w_access, 1),
            "description": f"Evaluated {len(remote_events)} authentication, remote session, and IP routing signatures."
        },
        {
            "name": "Historical Security Events",
            "raw_score": round(historical_raw, 1),
            "weight": round(w_hist, 2),
            "weighted_score": round(historical_raw * w_hist, 1),
            "description": f"Cumulative baseline across {len(all_logs)} historical security audit events."
        }
    ]

    return final_score, new_tier, components, len(window_logs)
