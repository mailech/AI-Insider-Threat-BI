import pandas as pd
from pathlib import Path

# ============================================================
# WEEK 1 - FILE BEHAVIOR ANALYSIS
# CERT R4.2 INSIDER THREAT PROJECT
# ============================================================

DATA_PATH = Path("data/r4.2/file.csv")

print("=" * 60)
print("WEEK 1 - FILE BEHAVIOR ANALYSIS")
print("=" * 60)

# ------------------------------------------------------------
# 1. Load file dataset
# ------------------------------------------------------------

print("\n1. Loading file dataset...")
print("-" * 30)

df = pd.read_csv(DATA_PATH)

df["date"] = pd.to_datetime(
    df["date"],
    format="mixed"
)

print("Dataset loaded successfully!")
print("Total records:", len(df))


# ------------------------------------------------------------
# 2. Basic information
# ------------------------------------------------------------

print("\n2. FILE DATASET INFORMATION")
print("-" * 30)

print("Unique users:", df["user"].nunique())
print("Unique computers:", df["pc"].nunique())
print("Unique filenames:", df["filename"].nunique())


# ------------------------------------------------------------
# 3. File activity per user
# ------------------------------------------------------------

file_activity = (
    df.groupby("user")
    .size()
    .sort_values(ascending=False)
)

print("\n3. TOP 10 USERS BY FILE ACTIVITY")
print("-" * 30)

print(file_activity.head(10))


# ------------------------------------------------------------
# 4. File activity by hour
# ------------------------------------------------------------

df["hour"] = df["date"].dt.hour

hourly_files = (
    df.groupby("hour")
    .size()
    .sort_index()
)

print("\n4. FILE ACTIVITY BY HOUR")
print("-" * 30)

print(hourly_files)


# ------------------------------------------------------------
# 5. After-hours file activity
# ------------------------------------------------------------

after_hours_files = df[
    (df["hour"] < 8) |
    (df["hour"] >= 18)
]

after_hours_by_user = (
    after_hours_files
    .groupby("user")
    .size()
    .sort_values(ascending=False)
)

print("\n5. AFTER-HOURS FILE ACTIVITY")
print("-" * 30)

print("Total after-hours file activity:", len(after_hours_files))

print("\nTOP 10 USERS:")
print(after_hours_by_user.head(10))


# ------------------------------------------------------------
# 6. Weekend file activity
# ------------------------------------------------------------

df["day_of_week"] = df["date"].dt.dayofweek

weekend_files = df[
    df["day_of_week"] >= 5
]

weekend_by_user = (
    weekend_files
    .groupby("user")
    .size()
    .sort_values(ascending=False)
)

print("\n6. WEEKEND FILE ACTIVITY")
print("-" * 30)

print("Total weekend file activity:", len(weekend_files))

print("\nTOP 10 USERS:")
print(weekend_by_user.head(10))


# ------------------------------------------------------------
# 7. File extension analysis
# ------------------------------------------------------------

df["extension"] = (
    df["filename"]
    .str.lower()
    .str.extract(r"(\.[a-z0-9]+)$", expand=False)
)

extension_counts = (
    df["extension"]
    .value_counts()
)

print("\n7. FILE EXTENSION ANALYSIS")
print("-" * 30)

print(extension_counts.head(15))


# ------------------------------------------------------------
# 8. Unique file types per user
# ------------------------------------------------------------

file_types_per_user = (
    df.groupby("user")["extension"]
    .nunique()
    .sort_values(ascending=False)
)

print("\n8. USERS WITH MOST FILE TYPES")
print("-" * 30)

print(file_types_per_user.head(10))


# ------------------------------------------------------------
# 9. Save results
# ------------------------------------------------------------

output_path = Path("outputs")
output_path.mkdir(exist_ok=True)

file_activity.to_csv(
    output_path / "file_activity_per_user.csv",
    header=["file_activity_count"]
)

after_hours_by_user.to_csv(
    output_path / "after_hours_files_per_user.csv",
    header=["after_hours_file_count"]
)

weekend_by_user.to_csv(
    output_path / "weekend_files_per_user.csv",
    header=["weekend_file_count"]
)

extension_counts.to_csv(
    output_path / "file_extension_counts.csv",
    header=["count"]
)

file_types_per_user.to_csv(
    output_path / "file_types_per_user.csv",
    header=["unique_file_types"]
)


# ------------------------------------------------------------
# 10. Completion
# ------------------------------------------------------------

print("\n")
print("=" * 60)
print("FILE BEHAVIOR ANALYSIS COMPLETED SUCCESSFULLY")
print("=" * 60)

print("\nResults saved in:")
print("outputs/")