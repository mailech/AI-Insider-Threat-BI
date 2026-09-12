import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Activity Management System"
    PROJECT_VERSION: str = "1.0.0"
    API_PREFIX: str = "/api"
    
    # JWT Auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "ams_super_secret_jwt_key_2026_behavioral_intel")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours
    
    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./ams.db")
    
    # Default Risk Scoring Weights
    DEFAULT_WEIGHTS: dict = {
        "behavioral_anomalies": 0.35,
        "privilege_misuse": 0.25,
        "data_access_violations": 0.20,
        "access_pattern_deviations": 0.10,
        "historical_security_events": 0.10
    }
    
    # Risk Score Tiers
    TIER_LOW_MAX: float = 30.0
    TIER_MEDIUM_MAX: float = 60.0
    TIER_HIGH_MAX: float = 80.0
    TIER_CRITICAL_MAX: float = 100.0

    # MITRE ATT&CK Mapping Lookup (Elevation Feature 3)
    MITRE_MAPPING: dict = {
        "UNUSUAL_LOGIN_TIME": {"id": "T1078", "name": "Valid Accounts", "tactic": "Initial Access"},
        "ABNORMAL_DATA_DOWNLOAD": {"id": "T1048", "name": "Exfiltration Over Alternative Protocol", "tactic": "Exfiltration"},
        "UNAUTHORIZED_ACCESS_ATTEMPT": {"id": "T1098", "name": "Account Manipulation", "tactic": "Privilege Escalation"},
        "EXCESSIVE_FILE_TRANSFER": {"id": "T1048", "name": "Exfiltration Over Alternative Protocol", "tactic": "Exfiltration"},
        "SUSPICIOUS_DEVICE_USAGE": {"id": "T1052", "name": "Exfiltration Over Physical Medium", "tactic": "Exfiltration"},
    }

    # Inspectable Behavioral Anomaly Detection Thresholds (Milestone 2 Round 2)
    ANOMALY_DETECTION_THRESHOLDS: dict = {
        "UNUSUAL_LOGIN_TIME": {
            "category": "UNUSUAL_LOGIN_TIME",
            "name": "Unusual Login Time",
            "condition": "Login timestamp > 3.0h deviation from 30-day median login time, or activity outside 06:00 - 21:00 UTC core envelope.",
            "metrics": {
                "max_median_deviation_hours": 3.0,
                "core_hours_start": "06:00 UTC",
                "core_hours_end": "21:00 UTC"
            },
            "mitre_id": "T1078",
            "mitre_name": "Valid Accounts",
            "cert_taxonomy": "Behavioral Schedule Anomaly"
        },
        "ABNORMAL_DATA_DOWNLOAD": {
            "category": "ABNORMAL_DATA_DOWNLOAD",
            "name": "Abnormal Data Download",
            "condition": "Single payload transfer > 1,500 MB, or 24h transfer > max(500 MB, 2.5x personal baseline / 3.5x peer average).",
            "metrics": {
                "single_event_mb_threshold": 1500.0,
                "personal_baseline_multiplier": 2.5,
                "peer_group_multiplier": 3.5
            },
            "mitre_id": "T1048",
            "mitre_name": "Exfiltration Over Alternative Protocol",
            "cert_taxonomy": "Data Exfiltration Anomaly"
        },
        "UNAUTHORIZED_ACCESS_ATTEMPT": {
            "category": "UNAUTHORIZED_ACCESS_ATTEMPT",
            "name": "Unauthorized Access Attempt",
            "condition": "Execution of unapproved credential enumeration binaries, SUDO escalation bypass, or target level containing ROOT/ADMIN.",
            "metrics": {
                "flagged_privilege_targets": ["ROOT", "CLUSTER_SUPERUSER", "ADMIN"],
                "max_unauthorized_attempts": 1
            },
            "mitre_id": "T1098",
            "mitre_name": "Account Manipulation",
            "cert_taxonomy": "Privilege Abuse Anomaly"
        },
        "EXCESSIVE_FILE_TRANSFER": {
            "category": "EXCESSIVE_FILE_TRANSFER",
            "name": "Excessive File Transfer",
            "condition": "24h outbound external email ratio > 25% (against <5% baseline) or volume surge > 2.0x personal daily event rate.",
            "metrics": {
                "external_email_pct_threshold": 25.0,
                "volume_surge_multiplier": 2.0
            },
            "mitre_id": "T1048",
            "mitre_name": "Exfiltration Over Alternative Protocol",
            "cert_taxonomy": "Volume Exfiltration Anomaly"
        },
        "SUSPICIOUS_DEVICE_USAGE": {
            "category": "SUSPICIOUS_DEVICE_USAGE",
            "name": "Suspicious Device Usage",
            "condition": "Connection of USB mass storage/peripheral with hardware identifier not in employee's assigned assets, or raw socket sniffer execution.",
            "metrics": {
                "require_assigned_asset_match": True,
                "blocked_peripherals": ["USB Mass Storage (Unsigned)", "Raw Packet Sniffer"]
            },
            "mitre_id": "T1052",
            "mitre_name": "Exfiltration Over Physical Medium",
            "cert_taxonomy": "Physical Medium / Device Anomaly"
        }
    }

    # Known Unsanctioned Tools List (Milestone 2 Round 2)
    KNOWN_UNSANCTIONED_TOOLS: list = [
        "Tor Browser",
        "BitTorrent Client",
        "WinSCP",
        "Mimikatz",
        "Wireshark",
    ]

    # Departmental Authorized File Repository Scopes (Milestone 2 Round 3 Feature 2)
    DEPARTMENT_REPOSITORY_SCOPES: dict = {
        "Finance": [
            "/shares/finance",
            "/shares/accounting",
            "/shares/erp_billing",
            "/shares/payroll_reports",
            "/shares/tax_records",
        ],
        "IT Infrastructure": [
            "/shares/it_infra",
            "/shares/sysadmin",
            "/shares/network_configs",
            "/shares/devops_ci",
            "/shares/monitoring",
        ],
        "Research": [
            "/shares/rd_labs",
            "/shares/ai_models",
            "/shares/datasets",
            "/shares/source_repos",
            "/shares/research_papers",
        ],
        "R&D AI Labs": [
            "/shares/rd_labs",
            "/shares/ai_models",
            "/shares/datasets",
            "/shares/source_repos",
            "/shares/research_papers",
        ],
        "Sales": [
            "/shares/sales",
            "/shares/crm_exports",
            "/shares/client_contracts",
            "/shares/pricing",
            "/shares/pipeline",
        ],
        "Enterprise Sales": [
            "/shares/sales",
            "/shares/crm_exports",
            "/shares/client_contracts",
            "/shares/pricing",
            "/shares/pipeline",
        ],
        "Procurement": [
            "/shares/procurement",
            "/shares/vendor_sla",
            "/shares/inventory",
            "/shares/supply_chain",
            "/shares/purchase_orders",
        ],
        "Supply Chain": [
            "/shares/supply_chain",
            "/shares/logistics",
            "/shares/warehouse_ops",
            "/shares/vendor_sla",
            "/shares/inventory",
        ],
        "Human Resources": [
            "/shares/hr",
            "/shares/employee_records",
            "/shares/benefits",
            "/shares/recruiting",
            "/shares/payroll_reports",
        ],
        "Legal": [
            "/shares/legal",
            "/shares/compliance_audits",
            "/shares/regulatory_archive",
            "/shares/contracts",
            "/shares/policy_docs",
        ],
        "Legal & Compliance": [
            "/shares/legal",
            "/shares/compliance_audits",
            "/shares/regulatory_archive",
            "/shares/contracts",
            "/shares/policy_docs",
        ],
        "Marketing": [
            "/shares/marketing",
            "/shares/brand_assets",
            "/shares/campaigns",
            "/shares/social_media",
            "/shares/analytics",
        ],
        "Customer Support": [
            "/shares/support",
            "/shares/ticket_logs",
            "/shares/kb_articles",
            "/shares/customer_feedback",
            "/shares/telemetry",
        ],
        "Operations": [
            "/shares/operations",
            "/shares/facilities",
            "/shares/sop_documentation",
            "/shares/incident_reports",
            "/shares/security_drills",
        ],
        "Cloud Platform": [
            "/shares/cloud_platform",
            "/shares/k8s_manifests",
            "/shares/terraform_state",
            "/shares/devops_ci",
            "/shares/cloud_architecture",
        ],
        "Executive Leadership": [
            "/shares/executive",
            "/shares/board_minutes",
            "/shares/strategic_plans",
            "/shares/mergers_acquisitions",
        ],
    }

    # VPN Gateway Profiles (Milestone 1 & 2 Round 3 Feature 1)
    VPN_GATEWAYS: list = [
        {"name": "WireGuard Enterprise-GW-01 (US-East)", "protocol": "WireGuard UDP/51820", "location": "New York, USA", "ip_range": "198.51.100.0/24"},
        {"name": "WireGuard Corporate-GW-02 (US-West)", "protocol": "WireGuard UDP/51820", "location": "San Francisco, USA", "ip_range": "198.51.101.0/24"},
        {"name": "OpenVPN-SecureTunnel-01 (EU-Central)", "protocol": "OpenVPN TLS/1194", "location": "Frankfurt, Germany", "ip_range": "203.0.113.0/24"},
    ]

    # Standard Business Destination Ports Allow-List (Milestone 1 & 2 Round 4 Feature 2)
    STANDARD_BUSINESS_PORTS: dict = {
        80: "HTTP",
        443: "HTTPS",
        53: "DNS",
        22: "SSH",
        445: "SMB",
        88: "Kerberos",
        123: "NTP",
        389: "LDAP",
        636: "LDAPS",
    }

    # Notification & Alert Delivery Settings (Milestone 4 Module 11)
    SMTP_HOST: str = os.getenv("SMTP_HOST", "")
    SMTP_PORT: int = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USERNAME: str = os.getenv("SMTP_USERNAME", "")
    SMTP_PASSWORD: str = os.getenv("SMTP_PASSWORD", "")
    SMTP_FROM: str = os.getenv("SMTP_FROM", "ams-alerts@enterprise.internal")
    SMTP_USE_TLS: bool = os.getenv("SMTP_USE_TLS", "true").lower() in ("true", "1", "yes")
    SLACK_WEBHOOK_URL: str = os.getenv("SLACK_WEBHOOK_URL", "")
    NOTIFICATION_ALERT_EMAIL: str = os.getenv("NOTIFICATION_ALERT_EMAIL", "soc-team@ams.internal")

    # Live Windows Event Log Listener (Scoped Exception Module - Default OFF)
    ENABLE_LIVE_WINDOWS_LISTENER: bool = os.getenv("ENABLE_LIVE_WINDOWS_LISTENER", "false").lower() in ("true", "1", "yes")
    WINDOWS_LISTENER_POLL_INTERVAL_SECONDS: float = float(os.getenv("WINDOWS_LISTENER_POLL_INTERVAL_SECONDS", "5.0"))
    WINDOWS_LISTENER_CHANNELS: list = ["Security", "System"]
    WINDOWS_EVENT_BOOKMARK_FILE: str = os.getenv("WINDOWS_EVENT_BOOKMARK_FILE", "windows_event_bookmark.json")

    model_config = {"env_file": ".env", "extra": "ignore"}



settings = Settings()


