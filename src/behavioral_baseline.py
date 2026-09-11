import pandas as pd
from pathlib import Path

# ============================================================
# BEHAVIORAL BASELINE ENGINE
# CERT R4.2 INSIDER THREAT PROJECT
# ============================================================

INPUT_FILE = Path("outputs/combined_behavioral_features.csv")
OUTPUT_FILE = Path("outputs/behavioral_baseline.csv")

print("=" * 60)
print("BEHAVIORAL BASELINE ANALYSIS")
print("=" * 60)

# ------------------------------------------------------------
# 1. Load behavioral feature dataset
# ------------------------------------------------------------

print("\n1. Loading behavioral feature dataset...")
print("-" * 40)

if not INPUT_FILE.exists():
    raise FileNotFoundError(
        f"Input file not found: {INPUT_FILE}"
    )

df = pd.read_csv(INPUT_FILE)

print("Loaded:", INPUT_FILE)
print("Number of users:", len(df))


# ------------------------------------------------------------
# 2. Select behavioral features
# ------------------------------------------------------------

behavioral_features = [
    "login_count",
    "after_hours_logins",
    "weekend_logins",
    "unique_computers",

    "device_activity",
    "usb_connections",
    "after_hours_usb",
    "weekend_usb",
    "usb_unique_computers",

    "file_activity",
    "after_hours_files",
    "weekend_files",

    "email_count",
    "after_hours_emails",
    "weekend_emails",
    "attachment_count",

    "web_activity",
    "after_hours_web",
    "weekend_web"
]

print("\n2. Calculating behavioral baselines...")
print("-" * 40)


# ------------------------------------------------------------
# 3. Calculate baseline statistics
# ------------------------------------------------------------

baseline = df[behavioral_features].agg(
    [
        "mean",
        "median",
        "std",
        "min",
        "max"
    ]
).T

baseline = baseline.reset_index()

baseline.columns = [
    "feature",
    "mean",
    "median",
    "std",
    "minimum",
    "maximum"
]


# ------------------------------------------------------------
# 4. Display baseline information
# ------------------------------------------------------------

print("\n3. BEHAVIORAL BASELINE")
print("-" * 40)

print(
    baseline.to_string(index=False)
)


# ------------------------------------------------------------
# 5. Save baseline
# ------------------------------------------------------------

baseline.to_csv(
    OUTPUT_FILE,
    index=False
)

print("\n")
print("=" * 60)
print("BEHAVIORAL BASELINE CREATED SUCCESSFULLY")
print("=" * 60)

print("\nSaved as:")
print(OUTPUT_FILE)

print("\nThis baseline will be used to identify unusual behavior.")