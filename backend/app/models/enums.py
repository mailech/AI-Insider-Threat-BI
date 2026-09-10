"""Domain enumerations shared across models, schemas and services."""
from __future__ import annotations

from enum import Enum


class Role(str, Enum):
    """Roles defined by the specification (module 1)."""
    SECURITY_ANALYST = "security_analyst"
    SOC_ENGINEER = "soc_engineer"
    SECURITY_MANAGER = "security_manager"
    ADMINISTRATOR = "administrator"


class ActivityType(str, Enum):
    """Monitored activities (module 3)."""
    LOGIN = "login"
    LOGOUT = "logout"
    FAILED_LOGIN = "failed_login"
    FILE_DOWNLOAD = "file_download"
    FILE_UPLOAD = "file_upload"
    FILE_ACCESS = "file_access"
    FILE_DELETE = "file_delete"
    DATA_TRANSFER = "data_transfer"
    EMAIL_SENT = "email_sent"
    EMAIL_EXTERNAL = "email_external"
    PRIVILEGE_CHANGE = "privilege_change"
    REMOTE_ACCESS = "remote_access"
    USB_CONNECT = "usb_connect"
    USB_FILE_COPY = "usb_file_copy"
    APP_USAGE = "app_usage"
    NETWORK_CONNECTION = "network_connection"
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    VPN_SESSION = "vpn_session"


class LogSource(str, Enum):
    """Security log sources (tech-stack section)."""
    ACTIVE_DIRECTORY = "active_directory"
    WINDOWS_EVENT = "windows_event"
    LINUX_AUDIT = "linux_audit"
    VPN = "vpn"
    FIREWALL = "firewall"
    EMAIL_SECURITY = "email_security"
    ENDPOINT_SECURITY = "endpoint_security"
    DLP = "dlp"
    PROXY = "proxy"
    MANUAL = "manual"


class AnomalyCategory(str, Enum):
    """Anomaly categories (module 5)."""
    UNUSUAL_LOGIN_TIME = "unusual_login_time"
    ABNORMAL_DATA_DOWNLOAD = "abnormal_data_download"
    UNAUTHORIZED_ACCESS_ATTEMPT = "unauthorized_access_attempt"
    EXCESSIVE_FILE_TRANSFER = "excessive_file_transfer"
    SUSPICIOUS_DEVICE_USAGE = "suspicious_device_usage"
    INSIDER_RISK_INDICATOR = "insider_risk_indicator"
    DATA_EXFILTRATION = "data_exfiltration"
    PRIVILEGE_ABUSE = "privilege_abuse"
    ACCESS_PATTERN_DEVIATION = "access_pattern_deviation"
    BEHAVIORAL_DEVIATION = "behavioral_deviation"
    PEER_GROUP_OUTLIER = "peer_group_outlier"


class DetectionMethod(str, Enum):
    RULE = "rule"
    ISOLATION_FOREST = "isolation_forest"
    STATISTICAL_ZSCORE = "statistical_zscore"
    PEER_GROUP = "peer_group"
    ML_CLASSIFIER = "ml_classifier"


class Severity(str, Enum):
    """Alert severity levels (module 9)."""
    INFORMATIONAL = "informational"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RiskCategory(str, Enum):
    """Risk categories (module 6)."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, Enum):
    OPEN = "open"
    INVESTIGATING = "investigating"
    ESCALATED = "escalated"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    CLOSED = "closed"
    FALSE_POSITIVE = "false_positive"


class AlertStatus(str, Enum):
    NEW = "new"
    ACKNOWLEDGED = "acknowledged"
    IN_REVIEW = "in_review"
    ESCALATED = "escalated"
    CLOSED = "closed"
    DISMISSED = "dismissed"


class EmploymentStatus(str, Enum):
    ACTIVE = "active"
    ON_LEAVE = "on_leave"
    NOTICE_PERIOD = "notice_period"
    TERMINATED = "terminated"
    CONTRACTOR = "contractor"


class NotificationType(str, Enum):
    INSIDER_THREAT_ALERT = "insider_threat_alert"
    INVESTIGATION = "investigation"
    ESCALATION = "escalation"
    COMPLIANCE = "compliance"
    SECURITY_EVENT = "security_event"
    SYSTEM = "system"
