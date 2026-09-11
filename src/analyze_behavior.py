import pandas as pd
from pathlib import Path

# ============================================================
# WEEK 1 - LOGIN BEHAVIOR ANALYSIS
# CERT R4.2 INSIDER THREAT PROJECT
# ============================================================

DATA_PATH = Path("data/r4.2/logon.csv")

print("=" * 60)
print("WEEK 1 - LOGIN BEHAVIOR ANALYSIS")
print("=" * 60)

# ------------------------------------------------------------
# 1. Load logon dataset
# ------------------------------------------------------------

print("\n1. Loading logon dataset...")
print("-" * 30)

df = pd.read_csv(DATA_PATH)

# Convert date column to datetime
df["date"] = pd.to_datetime(df["date"], format="mixed")

print("Dataset loaded successfully!")
print("Total records:", len(df))


# ------------------------------------------------------------
# 2. Basic activity information
# ------------------------------------------------------------

print("\n2. ACTIVITY SUMMARY")
print("-" * 30)

print(df["activity"].value_counts())


# ------------------------------------------------------------
# 3. Login records only
# ------------------------------------------------------------

logins = df[df["activity"] == "Logon"].copy()

print("\n3. LOGIN INFORMATION")
print("-" * 30)

print("Total login records:", len(logins))
print("Unique users:", logins["user"].nunique())
print("Unique computers:", logins["pc"].nunique())


# ------------------------------------------------------------
# 4. Login count per user
# ------------------------------------------------------------

login_counts = (
    logins.groupby("user")
    .size()
    .sort_values(ascending=False)
)

print("\n4. TOP 10 USERS BY LOGIN COUNT")
print("-" * 30)

print(login_counts.head(10))


# ------------------------------------------------------------
# 5. Login activity by hour
# ------------------------------------------------------------

logins["hour"] = logins["date"].dt.hour

hourly_logins = logins["hour"].value_counts().sort_index()

print("\n5. LOGIN ACTIVITY BY HOUR")
print("-" * 30)

print(hourly_logins)


# ------------------------------------------------------------
# 6. After-hours login analysis
# ------------------------------------------------------------

# Normal working hours: 8 AM to 6 PM
after_hours = logins[
    (logins["hour"] < 8) |
    (logins["hour"] >= 18)
]

print("\n6. AFTER-HOURS LOGIN ANALYSIS")
print("-" * 30)

print("Total after-hours logins:", len(after_hours))

after_hours_by_user = (
    after_hours.groupby("user")
    .size()
    .sort_values(ascending=False)
)

print("\nTOP 10 USERS WITH AFTER-HOURS LOGINS:")
print(after_hours_by_user.head(10))


# ------------------------------------------------------------
# 7. Weekend login analysis
# ------------------------------------------------------------

logins["day_of_week"] = logins["date"].dt.dayofweek

weekend_logins = logins[
    logins["day_of_week"] >= 5
]

print("\n7. WEEKEND LOGIN ANALYSIS")
print("-" * 30)

print("Total weekend logins:", len(weekend_logins))

weekend_by_user = (
    weekend_logins.groupby("user")
    .size()
    .sort_values(ascending=False)
)

print("\nTOP 10 USERS WITH WEEKEND LOGINS:")
print(weekend_by_user.head(10))


# ------------------------------------------------------------
# 8. Users logging into multiple computers
# ------------------------------------------------------------

computers_per_user = (
    logins.groupby("user")["pc"]
    .nunique()
    .sort_values(ascending=False)
)

print("\n8. USERS WITH MOST UNIQUE COMPUTERS")
print("-" * 30)

print(computers_per_user.head(10))


# ------------------------------------------------------------
# 9. Save basic results
# ------------------------------------------------------------

output_path = Path("outputs")

# Create outputs folder if it doesn't exist
output_path.mkdir(exist_ok=True)

login_counts.to_csv(
    output_path / "login_counts_per_user.csv",
    header=["login_count"]
)

after_hours_by_user.to_csv(
    output_path / "after_hours_logins_per_user.csv",
    header=["after_hours_login_count"]
)

weekend_by_user.to_csv(
    output_path / "weekend_logins_per_user.csv",
    header=["weekend_login_count"]
)

computers_per_user.to_csv(
    output_path / "computers_per_user.csv",
    header=["unique_computers"]
)


# ------------------------------------------------------------
# 10. Completion
# ------------------------------------------------------------

print("\n")
print("=" * 60)
print("LOGIN BEHAVIOR ANALYSIS COMPLETED SUCCESSFULLY")
print("=" * 60)

print("\nResults saved in:")
print("outputs/")