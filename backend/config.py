import os

SECRET_KEY = os.getenv("SECRET_KEY", "aegis_insider_threat_secret_key_2026_super_secure")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

ROLES = ["Security Analyst", "SOC Engineer", "Security Manager", "Administrator"]

RISK_WEIGHTS = {
    "behavioral": 0.35,
    "privilege": 0.25,
    "data_access": 0.20,
    "access_pattern": 0.10,
    "historical": 0.10
}

def get_risk_category(score: float) -> str:
    if score >= 86:
        return "Critical"
    elif score >= 61:
        return "High"
    elif score >= 31:
        return "Medium"
    else:
        return "Low"
