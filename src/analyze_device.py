import pandas as pd
from pathlib import Path

# ============================================================
# WEEK 1 - DEVICE / USB BEHAVIOR ANALYSIS
# CERT R4.2 INSIDER THREAT PROJECT
# ============================================================

DATA_PATH = Path("data/r4.2/device.csv")

print("=" * 60)
print("WEEK 1 - DEVICE / USB BEHAVIOR ANALYSIS")
print("=" * 60)

# ------------------------------------------------------------
# 1. Load device dataset
# ------------------------------------------------------------

print("\n1. Loading device dataset...")
print("-" * 30)

df = pd.read_csv(DATA_PATH)

df["date"] = pd.to_datetime(
    df["date"],
    format="mixed"
)

print("Dataset loaded successfully!")
print("Total records:", len(df))


# ------------------------------------------------------------
# 2. Basic activity information
# ------------------------------------------------------------

print("\n2. DEVICE ACTIVITY SUMMARY")
print("-" * 30)

print(df["activity"].value_counts())


# ------------------------------------------------------------
# 3. Unique users and computers
# ------------------------------------------------------------

print("\n3. DEVICE INFORMATION")
print("-" * 30)

print("Unique users:", df["user"].nunique())
print("Unique computers:", df["pc"].nunique())


# ------------------------------------------------------------
# 4. Device activity per user
# ------------------------------------------------------------

device_activity = (
    df.groupby("user")
    .size()
    .sort_values(ascending=False)
)

print("\n4. TOP 10 USERS BY DEVICE ACTIVITY")
print("-" * 30)

print(device_activity.head(10))


# ------------------------------------------------------------
# 5. USB connections per user
# ------------------------------------------------------------

connections = df[df["activity"] == "Connect"]

connect_counts = (
    connections.groupby("user")
    .size()
    .sort_values(ascending=False)
)

print("\n5. TOP 10 USERS BY USB CONNECTIONS")
print("-" * 30)

print(connect_counts.head(10))


# ------------------------------------------------------------
# 6. Device activity by hour
# ------------------------------------------------------------

df["hour"] = df["date"].dt.hour

hourly_activity = (
    df.groupby("hour")
    .size()
    .sort_index()
)

print("\n6. DEVICE ACTIVITY BY HOUR")
print("-" * 30)

print(hourly_activity)


# ------------------------------------------------------------
# 7. After-hours USB connections
# ------------------------------------------------------------

after_hours_connections = connections[
    (connections["date"].dt.hour < 8) |
    (connections["date"].dt.hour >= 18)
]

after_hours_by_user = (
    after_hours_connections
    .groupby("user")
    .size()
    .sort_values(ascending=False)
)

print("\n7. AFTER-HOURS USB CONNECTIONS")
print("-" * 30)

print(
    "Total after-hours USB connections:",
    len(after_hours_connections)
)

print("\nTOP 10 USERS:")
print(after_hours_by_user.head(10))


# ------------------------------------------------------------
# 8. Weekend USB connections
# ------------------------------------------------------------

connections["day_of_week"] = connections["date"].dt.dayofweek

weekend_connections = connections[
    connections["day_of_week"] >= 5
]

weekend_by_user = (
    weekend_connections
    .groupby("user")
    .size()
    .sort_values(ascending=False)
)

print("\n8. WEEKEND USB CONNECTIONS")
print("-" * 30)

print(
    "Total weekend USB connections:",
    len(weekend_connections)
)

print("\nTOP 10 USERS:")
print(weekend_by_user.head(10))


# ------------------------------------------------------------
# 9. Unique computers used for USB activity
# ------------------------------------------------------------

computers_per_user = (
    connections.groupby("user")["pc"]
    .nunique()
    .sort_values(ascending=False)
)

print("\n9. USERS WITH USB ACTIVITY ON MOST COMPUTERS")
print("-" * 30)

print(computers_per_user.head(10))


# ------------------------------------------------------------
# 10. Save results
# ------------------------------------------------------------

output_path = Path("outputs")
output_path.mkdir(exist_ok=True)

device_activity.to_csv(
    output_path / "device_activity_per_user.csv",
    header=["device_activity_count"]
)

connect_counts.to_csv(
    output_path / "usb_connections_per_user.csv",
    header=["usb_connection_count"]
)

after_hours_by_user.to_csv(
    output_path / "after_hours_usb_per_user.csv",
    header=["after_hours_usb_count"]
)

weekend_by_user.to_csv(
    output_path / "weekend_usb_per_user.csv",
    header=["weekend_usb_count"]
)

computers_per_user.to_csv(
    output_path / "usb_computers_per_user.csv",
    header=["unique_usb_computers"]
)


# ------------------------------------------------------------
# 11. Completion
# ------------------------------------------------------------

print("\n")
print("=" * 60)
print("DEVICE / USB ANALYSIS COMPLETED SUCCESSFULLY")
print("=" * 60)

print("\nResults saved in:")
print("outputs/")