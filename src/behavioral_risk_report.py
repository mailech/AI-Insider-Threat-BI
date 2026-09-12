import pandas as pd
from pathlib import Path

# ============================================================
# BEHAVIORAL RISK REPORT
# CERT R4.2 INSIDER THREAT PROJECT
# ============================================================

ANOMALY_FILE = Path("outputs/anomaly_results.csv")
FEATURE_FILE = Path("outputs/ml_features.csv")
OUTPUT_FILE = Path("outputs/behavioral_risk_report.csv")

print("=" * 60)
print("BEHAVIORAL RISK REPORT")
print("=" * 60)

# ------------------------------------------------------------
# 1. Load anomaly results and ML features
# ------------------------------------------------------------

print("\n1. Loading model results...")

anomalies = pd.read_csv(ANOMALY_FILE)
features = pd.read_csv(FEATURE_FILE)

print("Anomaly records:", len(anomalies))
print("Feature records:", len(features))


# ------------------------------------------------------------
# 2. Keep only users detected as anomalies
# ------------------------------------------------------------

print("\n2. Selecting anomalous users...")

anomaly_users = anomalies[
    anomalies["status"] == "Anomaly"
].copy()

print("Anomalous users:", len(anomaly_users))


# ------------------------------------------------------------
# 3. Merge anomaly scores with behavioral features
# ------------------------------------------------------------

print("\n3. Combining anomaly scores with behavior...")

report = anomaly_users.merge(
    features,
    on="user",
    how="left"
)


# ------------------------------------------------------------
# 4. Calculate behavioral indicators
# ------------------------------------------------------------

print("\n4. Calculating behavioral indicators...")

# After-hours activity
report["after_hours_total"] = (
    report["after_hours_logins"]
    + report["after_hours_usb"]
    + report["after_hours_files"]
    + report["after_hours_emails"]
    + report["after_hours_web"]
)

# Weekend activity
report["weekend_total"] = (
    report["weekend_logins"]
    + report["weekend_usb"]
    + report["weekend_files"]
    + report["weekend_emails"]
    + report["weekend_web"]
)

# Overall activity
report["total_behavior_activity"] = (
    report["login_count"]
    + report["device_activity"]
    + report["file_activity"]
    + report["email_count"]
    + report["web_activity"]
)


# ------------------------------------------------------------
# 5. Create simple behavioral risk indicators
# ------------------------------------------------------------

report["after_hours_flag"] = (
    report["after_hours_total"] > 0
).astype(int)

report["weekend_flag"] = (
    report["weekend_total"] > 0
).astype(int)

report["usb_flag"] = (
    report["usb_connections"] > 0
).astype(int)

report["file_flag"] = (
    report["file_activity"] > 0
).astype(int)

report["attachment_flag"] = (
    report["attachment_count"] > 0
).astype(int)


# ------------------------------------------------------------
# 6. Create a behavioral risk indicator score
# ------------------------------------------------------------

print("\n5. Calculating behavioral risk indicator...")

report["risk_indicator"] = (
    report["after_hours_flag"]
    + report["weekend_flag"]
    + report["usb_flag"]
    + report["file_flag"]
    + report["attachment_flag"]
)


# ------------------------------------------------------------
# 7. Categorize risk
# ------------------------------------------------------------

def risk_category(score):
    if score >= 4:
        return "High"
    elif score >= 2:
        return "Medium"
    else:
        return "Low"


report["risk_category"] = report[
    "risk_indicator"
].apply(risk_category)


# ------------------------------------------------------------
# 8. Sort by anomaly score
# ------------------------------------------------------------

report = report.sort_values(
    "anomaly_score"
).reset_index(drop=True)


# ------------------------------------------------------------
# 9. Display summary
# ------------------------------------------------------------

print("\n6. RISK SUMMARY")
print("-" * 40)

print(
    report["risk_category"]
    .value_counts()
    .to_string()
)


# ------------------------------------------------------------
# 10. Display top 20 users
# ------------------------------------------------------------

print("\n7. TOP 20 ANOMALOUS USERS")
print("-" * 40)

display_columns = [
    "user",
    "anomaly_score",
    "risk_category",
    "risk_indicator",
    "after_hours_total",
    "weekend_total",
    "usb_connections",
    "file_activity",
    "email_count",
    "web_activity"
]

print(
    report[display_columns]
    .head(20)
    .to_string(index=False)
)


# ------------------------------------------------------------
# 11. Save report
# ------------------------------------------------------------

report.to_csv(
    OUTPUT_FILE,
    index=False
)

print("\n")
print("=" * 60)
print("BEHAVIORAL RISK REPORT CREATED SUCCESSFULLY")
print("=" * 60)

print("\nSaved as:")
print(OUTPUT_FILE)

print("\nThis report explains the behavioral signals")
print("associated with each detected anomaly.")