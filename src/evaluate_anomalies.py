import pandas as pd
from pathlib import Path

# ============================================================
# ANOMALY ANALYSIS AND MODEL EVALUATION
# CERT R4.2 INSIDER THREAT PROJECT
# ============================================================

ANOMALY_FILE = Path("outputs/anomaly_results.csv")
FEATURE_FILE = Path("outputs/ml_features.csv")
REPORT_FILE = Path("outputs/behavioral_risk_report.csv")

print("=" * 60)
print("ANOMALY ANALYSIS AND MODEL EVALUATION")
print("=" * 60)


# ------------------------------------------------------------
# 1. Load files
# ------------------------------------------------------------

print("\n1. Loading results...")

anomalies = pd.read_csv(ANOMALY_FILE)
features = pd.read_csv(FEATURE_FILE)
risk_report = pd.read_csv(REPORT_FILE)

print("Anomaly results:", len(anomalies))
print("ML features:", len(features))
print("Risk report:", len(risk_report))


# ------------------------------------------------------------
# 2. Select anomalous users
# ------------------------------------------------------------

anomaly_users = anomalies[
    anomalies["status"] == "Anomaly"
].copy()

print("\n2. Anomalous users:", len(anomaly_users))


# ------------------------------------------------------------
# 3. Display anomaly score statistics
# ------------------------------------------------------------

print("\n3. ANOMALY SCORE STATISTICS")
print("-" * 40)

print(
    anomaly_users["anomaly_score"]
    .describe()
    .round(4)
    .to_string()
)


# ------------------------------------------------------------
# 4. Merge features with anomaly results
# ------------------------------------------------------------

analysis = anomaly_users.merge(
    features,
    on="user",
    how="left"
)


# ------------------------------------------------------------
# 5. Calculate activity ratios
# ------------------------------------------------------------

print("\n4. Calculating behavioral ratios...")

analysis["after_hours_login_ratio"] = (
    analysis["after_hours_logins"]
    / analysis["login_count"].replace(0, 1)
)

analysis["weekend_login_ratio"] = (
    analysis["weekend_logins"]
    / analysis["login_count"].replace(0, 1)
)

analysis["after_hours_email_ratio"] = (
    analysis["after_hours_emails"]
    / analysis["email_count"].replace(0, 1)
)

analysis["after_hours_web_ratio"] = (
    analysis["after_hours_web"]
    / analysis["web_activity"].replace(0, 1)
)

analysis["after_hours_file_ratio"] = (
    analysis["after_hours_files"]
    / analysis["file_activity"].replace(0, 1)
)


# ------------------------------------------------------------
# 6. Identify users with strong behavioral signals
# ------------------------------------------------------------

analysis["behavioral_signals"] = (
    (analysis["after_hours_login_ratio"] > 0.30).astype(int)
    + (analysis["weekend_login_ratio"] > 0.05).astype(int)
    + (analysis["usb_connections"] > 0).astype(int)
    + (analysis["after_hours_files"] > 0).astype(int)
    + (analysis["after_hours_emails"] > 0).astype(int)
    + (analysis["after_hours_web_ratio"] > 0.05).astype(int)
)


# ------------------------------------------------------------
# 7. Create final priority score
# ------------------------------------------------------------

print("\n5. Creating behavioral priority score...")

# Lower anomaly score = more unusual
# Normalize anomaly score so that lower values receive
# a higher anomaly component.

score_min = analysis["anomaly_score"].min()
score_max = analysis["anomaly_score"].max()

if score_max != score_min:
    anomaly_component = (
        (score_max - analysis["anomaly_score"])
        / (score_max - score_min)
    )
else:
    anomaly_component = 0

analysis["priority_score"] = (
    anomaly_component * 0.6
    + (analysis["behavioral_signals"] / 6) * 0.4
)


# ------------------------------------------------------------
# 8. Create priority categories
# ------------------------------------------------------------

def priority_category(score):
    if score >= 0.75:
        return "High Priority"
    elif score >= 0.50:
        return "Medium Priority"
    else:
        return "Low Priority"


analysis["priority"] = analysis[
    "priority_score"
].apply(priority_category)


# ------------------------------------------------------------
# 9. Display priority summary
# ------------------------------------------------------------

print("\n6. PRIORITY SUMMARY")
print("-" * 40)

print(
    analysis["priority"]
    .value_counts()
    .to_string()
)


# ------------------------------------------------------------
# 10. Display strongest candidates
# ------------------------------------------------------------

print("\n7. TOP 20 HIGH-PRIORITY ANOMALOUS USERS")
print("-" * 40)

display_columns = [
    "user",
    "anomaly_score",
    "priority_score",
    "priority",
    "behavioral_signals",
    "login_count",
    "after_hours_logins",
    "weekend_logins",
    "usb_connections",
    "file_activity",
    "after_hours_files",
    "email_count",
    "after_hours_emails",
    "web_activity",
    "after_hours_web"
]

print(
    analysis
    .sort_values("priority_score", ascending=False)
    [display_columns]
    .head(20)
    .to_string(index=False)
)


# ------------------------------------------------------------
# 11. Save evaluation report
# ------------------------------------------------------------

output_file = Path(
    "outputs/anomaly_evaluation_report.csv"
)

analysis = analysis.sort_values(
    "priority_score",
    ascending=False
)

analysis.to_csv(
    output_file,
    index=False
)


# ------------------------------------------------------------
# 12. Final message
# ------------------------------------------------------------

print("\n")
print("=" * 60)
print("ANOMALY EVALUATION COMPLETED")
print("=" * 60)

print("\nSaved as:")
print(output_file)

print("\nThis report ranks anomalous users using:")
print("- Isolation Forest anomaly score")
print("- After-hours behavior")
print("- Weekend behavior")
print("- USB activity")
print("- File activity")
print("- Email activity")
print("- Web activity")

print("\nNote:")
print("A high-priority user is NOT automatically malicious.")
print("It indicates unusual behavior requiring further investigation.")