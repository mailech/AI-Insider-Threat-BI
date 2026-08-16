import os
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DATA_DIR = Path(os.getenv("ITBI_DATA_DIR", str(PROJECT_ROOT / "data")))
DATABASE_PATH = Path(os.getenv("ITBI_DATABASE_PATH", str(DATA_DIR / "insider_threat.db")))
STATIC_DIR = PROJECT_ROOT / "frontend"

SECRET_KEY = os.getenv("ITBI_SECRET_KEY", "change-this-dev-secret-for-production")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ITBI_TOKEN_EXPIRE_MINUTES", "480"))

ROLE_LABELS = {
    "security_analyst": "Security Analyst",
    "soc_engineer": "SOC Engineer",
    "security_manager": "Security Manager",
    "administrator": "Administrator",
}

ROLE_ORDER = ("security_analyst", "soc_engineer", "security_manager", "administrator")
RISK_LEVELS = ("Low", "Medium", "High", "Critical")
SEVERITY_LEVELS = ("Informational", "Low", "Medium", "High", "Critical")


def normalize_role(role: str) -> str:
    value = role.strip().lower().replace("-", "_").replace(" ", "_")
    if value not in ROLE_LABELS:
        valid = ", ".join(ROLE_LABELS.values())
        raise ValueError(f"Invalid role. Use one of: {valid}.")
    return value


def role_label(role: str) -> str:
    return ROLE_LABELS.get(role, role)


def normalize_named_level(value: str, allowed: tuple[str, ...], field_name: str) -> str:
    cleaned = value.strip().replace("_", " ").replace("-", " ").title()
    normalized = {
        "Info": "Informational",
        "Information": "Informational",
    }.get(cleaned, cleaned)
    if normalized not in allowed:
        valid = ", ".join(allowed)
        raise ValueError(f"Invalid {field_name}. Use one of: {valid}.")
    return normalized


def risk_level_for_score(score: int) -> str:
    if score >= 85:
        return "Critical"
    if score >= 70:
        return "High"
    if score >= 40:
        return "Medium"
    return "Low"
