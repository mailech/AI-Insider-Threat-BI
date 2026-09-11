import pandas as pd
from pathlib import Path

# ============================================================
# PREPARE DATA FOR MACHINE LEARNING
# CERT R4.2 INSIDER THREAT PROJECT
# ============================================================

INPUT_FILE = Path("outputs/combined_behavioral_features.csv")
OUTPUT_FILE = Path("outputs/ml_features.csv")

print("=" * 60)
print("PREPARING DATA FOR MACHINE LEARNING")
print("=" * 60)

# ------------------------------------------------------------
# 1. Load combined behavioral dataset
# ------------------------------------------------------------

print("\n1. Loading combined dataset...")
df = pd.read_csv(INPUT_FILE)

print("Dataset loaded successfully.")
print("Rows:", len(df))
print("Columns:", len(df.columns))


# ------------------------------------------------------------
# 2. Separate user IDs from numerical features
# ------------------------------------------------------------

print("\n2. Separating user IDs and ML features...")

users = df["user"]

features = df.drop(columns=["user"])


# ------------------------------------------------------------
# 3. Convert all feature columns to numeric
# ------------------------------------------------------------

print("\n3. Checking data types...")

features = features.apply(
    pd.to_numeric,
    errors="coerce"
)


# ------------------------------------------------------------
# 4. Check missing values
# ------------------------------------------------------------

print("\n4. Checking missing values...")

missing_values = features.isnull().sum().sum()

print("Total missing values:", missing_values)

if missing_values > 0:
    print("Missing values found. Filling with 0...")
    features = features.fillna(0)
else:
    print("No missing values found.")


# ------------------------------------------------------------
# 5. Check infinite values
# ------------------------------------------------------------

print("\n5. Checking infinite values...")

infinite_values = features.isin(
    [float("inf"), float("-inf")]
).sum().sum()

print("Total infinite values:", infinite_values)

if infinite_values > 0:
    print("Infinite values found. Replacing with 0...")
    features = features.replace(
        [float("inf"), float("-inf")],
        0
    )


# ------------------------------------------------------------
# 6. Display feature statistics
# ------------------------------------------------------------

print("\n6. Feature statistics...")
print("-" * 40)

print(
    features.describe().round(2).to_string()
)


# ------------------------------------------------------------
# 7. Save ML-ready dataset
# ------------------------------------------------------------

print("\n7. Saving ML-ready dataset...")

features.insert(
    0,
    "user",
    users
)

features.to_csv(
    OUTPUT_FILE,
    index=False
)


# ------------------------------------------------------------
# 8. Final information
# ------------------------------------------------------------

print("\n")
print("=" * 60)
print("ML DATA PREPARATION COMPLETED")
print("=" * 60)

print("\nFinal dataset:")
print("Users:", len(features))
print("Columns:", len(features.columns))

print("\nSaved as:")
print(OUTPUT_FILE)

print("\nML features:")
print(list(features.columns))

print("\nFirst 5 rows:")
print(features.head().to_string(index=False))

print("\nReady for anomaly detection.")