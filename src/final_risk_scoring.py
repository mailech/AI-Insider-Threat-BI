import pandas as pd
import numpy as np
from pathlib import Path

# ---------------------------------------------------------
# 1. Project paths
# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent.parent
OUTPUT_DIR = BASE_DIR / "outputs"

ML_FILE = OUTPUT_DIR / "ml_features.csv"
ANOMALY_FILE = OUTPUT_DIR / "anomaly_results.csv"

FINAL_FILE = OUTPUT_DIR / "final_insider_threat_report.csv"


# ---------------------------------------------------------
# 2. Load data
# ---------------------------------------------------------

print("Loading ML features...")
features = pd.read_csv(ML_FILE)

print("Loading anomaly results...")
anomalies = pd.read_csv(ANOMALY_FILE)

print("Data loaded successfully.")
print(f"Total users: {len(features)}")


# ---------------------------------------------------------
# 3. Check anomaly status values
# ---------------------------------------------------------

print("\nAnomaly status values:")
print(anomalies["status"].value_counts())


# ---------------------------------------------------------
# 4. Select anomalous users
# ---------------------------------------------------------

# The anomaly_results.csv file uses status values
# such as "Anomaly" and "Normal".

anomalous_users = anomalies[
    anomalies["status"].astype(str).str.lower() == "anomaly"
].copy()

print(f"\nAnomalous users found: {len(anomalous_users)}")


# ---------------------------------------------------------
# 5. Merge anomaly results with behavioral features
# ---------------------------------------------------------

df = features.merge(
    anomalous_users[["user", "anomaly_score", "status"]],
    on="user",
    how="inner"
)

print(f"Users successfully merged: {len(df)}")


# ---------------------------------------------------------
# 6. Safety check
# ---------------------------------------------------------

if len(df) == 0:
    print("\nERROR: No anomalous users were found after merging.")
    print("Please check the user IDs in the two CSV files.")
    raise SystemExit


# ---------------------------------------------------------
# 7. Calculate behavioral ratios
# ---------------------------------------------------------

df["after_hours_login_ratio"] = (
    df["after_hours_logins"] /
    df["login_count"].replace(0, np.nan)
).fillna(0)

df["weekend_login_ratio"] = (
    df["weekend_logins"] /
    df["login_count"].replace(0, np.nan)
).fillna(0)

df["after_hours_email_ratio"] = (
    df["after_hours_emails"] /
    df["email_count"].replace(0, np.nan)
).fillna(0)

df["after_hours_web_ratio"] = (
    df["after_hours_web"] /
    df["web_activity"].replace(0, np.nan)
).fillna(0)

df["after_hours_file_ratio"] = (
    df["after_hours_files"] /
    df["file_activity"].replace(0, np.nan)
).fillna(0)


# ---------------------------------------------------------
# 8. Calculate behavioral percentiles
# ---------------------------------------------------------

all_features = features.copy()


def percentile_score(column):

    ranks = all_features[column].rank(pct=True)

    mapping = dict(
        zip(
            all_features["user"],
            ranks
        )
    )

    return df["user"].map(mapping).fillna(0)


df["usb_percentile"] = percentile_score("usb_connections")
df["file_percentile"] = percentile_score("file_activity")
df["email_percentile"] = percentile_score("email_count")
df["web_percentile"] = percentile_score("web_activity")
df["computer_percentile"] = percentile_score("unique_computers")


# ---------------------------------------------------------
# 9. Convert anomaly score into 0-1 risk component
# ---------------------------------------------------------

min_score = anomalies["anomaly_score"].min()
max_score = anomalies["anomaly_score"].max()

if max_score != min_score:

    df["anomaly_component"] = (
        (max_score - df["anomaly_score"]) /
        (max_score - min_score)
    )

else:

    df["anomaly_component"] = 0.5


# ---------------------------------------------------------
# 10. Behavioral component
# ---------------------------------------------------------

behavior_columns = [
    "usb_percentile",
    "file_percentile",
    "email_percentile",
    "web_percentile",
    "computer_percentile"
]

df["behavior_component"] = (
    df[behavior_columns].mean(axis=1)
)


# ---------------------------------------------------------
# 11. Final risk score
# ---------------------------------------------------------

# 60% machine-learning anomaly score
# 40% unusual behavioral activity

df["risk_score"] = (
    df["anomaly_component"] * 60
    + df["behavior_component"] * 40
)

df["risk_score"] = df["risk_score"].clip(0, 100)


# ---------------------------------------------------------
# 12. Generate explanations
# ---------------------------------------------------------

def generate_reasons(row):

    reasons = []

    if row["after_hours_login_ratio"] >= 0.30:
        reasons.append(
            "High after-hours login activity"
        )

    if row["weekend_login_ratio"] >= 0.05:
        reasons.append(
            "Unusual weekend login activity"
        )

    if row["after_hours_usb"] > 0:
        reasons.append(
            "USB activity outside normal hours"
        )

    if row["after_hours_files"] > 0:
        reasons.append(
            "File activity outside normal hours"
        )

    if row["after_hours_emails"] > 0:
        reasons.append(
            "Email activity outside normal hours"
        )

    if row["after_hours_web_ratio"] >= 0.05:
        reasons.append(
            "High after-hours web activity"
        )

    if row["usb_percentile"] >= 0.95:
        reasons.append(
            "Very high USB usage"
        )

    if row["file_percentile"] >= 0.95:
        reasons.append(
            "Very high file activity"
        )

    if row["web_percentile"] >= 0.95:
        reasons.append(
            "Very high web activity"
        )

    if row["email_percentile"] >= 0.95:
        reasons.append(
            "Very high email activity"
        )

    if row["computer_percentile"] >= 0.95:
        reasons.append(
            "Activity across many computers"
        )

    if len(reasons) == 0:
        reasons.append(
            "Overall behavior is unusual compared with peers"
        )

    return "; ".join(reasons)


df["explanation"] = df.apply(
    generate_reasons,
    axis=1
)


# ---------------------------------------------------------
# 13. Risk level
# ---------------------------------------------------------

def risk_level(score):

    if score >= 75:
        return "High"

    elif score >= 50:
        return "Medium"

    else:
        return "Low"


df["risk_level"] = df["risk_score"].apply(
    risk_level
)


# ---------------------------------------------------------
# 14. Sort by risk score
# ---------------------------------------------------------

df = df.sort_values(
    by="risk_score",
    ascending=False
)


# ---------------------------------------------------------
# 15. Final report columns
# ---------------------------------------------------------

final_columns = [
    "user",
    "risk_score",
    "risk_level",
    "anomaly_score",

    "login_count",
    "after_hours_logins",
    "weekend_logins",

    "usb_connections",
    "after_hours_usb",

    "file_activity",
    "after_hours_files",

    "email_count",
    "after_hours_emails",

    "web_activity",
    "after_hours_web",

    "unique_computers",

    "explanation"
]

final_report = df[final_columns].copy()


# ---------------------------------------------------------
# 16. Save report
# ---------------------------------------------------------

final_report.to_csv(
    FINAL_FILE,
    index=False
)


# ---------------------------------------------------------
# 17. Display final results
# ---------------------------------------------------------

print("\n" + "=" * 60)
print("FINAL INSIDER THREAT RISK REPORT")
print("=" * 60)

print(
    f"\nTotal users analyzed: {len(features)}"
)

print(
    f"Anomalous users: {len(final_report)}"
)

print("\nRisk level distribution:")

print(
    final_report["risk_level"].value_counts()
)


print("\nTop 10 highest-risk users:")

print(
    final_report[
        [
            "user",
            "risk_score",
            "risk_level",
            "anomaly_score"
        ]
    ].head(10).to_string(index=False)
)


print("\nTop risk explanations:")

for _, row in final_report.head(10).iterrows():

    print(
        f"\nUser: {row['user']}"
        f"\nRisk Score: {row['risk_score']:.2f}"
        f"\nRisk Level: {row['risk_level']}"
        f"\nReason: {row['explanation']}"
    )


print("\n" + "=" * 60)
print("FINAL REPORT CREATED SUCCESSFULLY")
print("=" * 60)

print("\nSaved to:")
print(FINAL_FILE)