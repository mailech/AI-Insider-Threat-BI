import pandas as pd
from pathlib import Path
from collections import Counter

# ============================================================
# WEEK 1 - HTTP / WEB BEHAVIOR ANALYSIS
# CERT R4.2 INSIDER THREAT PROJECT
# ============================================================

DATA_PATH = Path("data/r4.2/http.csv")
OUTPUT_PATH = Path("outputs")
OUTPUT_PATH.mkdir(exist_ok=True)

CHUNK_SIZE = 100000

print("=" * 60)
print("WEEK 1 - HTTP / WEB BEHAVIOR ANALYSIS")
print("=" * 60)

# ------------------------------------------------------------
# Variables
# ------------------------------------------------------------

total_records = 0

users = set()
computers = set()

web_activity_per_user = Counter()
after_hours_per_user = Counter()
weekend_per_user = Counter()

web_activity_by_hour = Counter()

domain_counter = Counter()

# ------------------------------------------------------------
# Read HTTP dataset in chunks
# ------------------------------------------------------------

print("\n1. Loading HTTP dataset in chunks...")
print("-" * 40)

for chunk_number, df in enumerate(
    pd.read_csv(
        DATA_PATH,
        chunksize=CHUNK_SIZE,
        usecols=["date", "user", "pc", "url", "content"]
    ),
    start=1
):

    # Parse date
    df["date"] = pd.to_datetime(
        df["date"],
        format="mixed"
    )

    total_records += len(df)

    # Basic information
    users.update(df["user"].dropna().unique())
    computers.update(df["pc"].dropna().unique())

    # --------------------------------------------------------
    # Web activity per user
    # --------------------------------------------------------

    user_counts = df["user"].value_counts()

    for user, count in user_counts.items():
        web_activity_per_user[user] += int(count)

    # --------------------------------------------------------
    # Extract hour and day
    # --------------------------------------------------------

    df["hour"] = df["date"].dt.hour
    df["day_of_week"] = df["date"].dt.dayofweek

    # --------------------------------------------------------
    # Web activity by hour
    # --------------------------------------------------------

    hourly_counts = df["hour"].value_counts()

    for hour, count in hourly_counts.items():
        web_activity_by_hour[int(hour)] += int(count)

    # --------------------------------------------------------
    # After-hours web activity
    # Before 8 AM or from 6 PM onwards
    # --------------------------------------------------------

    after_hours = df[
        (df["hour"] < 8) |
        (df["hour"] >= 18)
    ]

    after_counts = after_hours["user"].value_counts()

    for user, count in after_counts.items():
        after_hours_per_user[user] += int(count)

    # --------------------------------------------------------
    # Weekend web activity
    # Saturday = 5
    # Sunday = 6
    # --------------------------------------------------------

    weekend = df[
        df["day_of_week"] >= 5
    ]

    weekend_counts = weekend["user"].value_counts()

    for user, count in weekend_counts.items():
        weekend_per_user[user] += int(count)

    # --------------------------------------------------------
    # Domain analysis
    # --------------------------------------------------------

    for url in df["url"].dropna():

        url = str(url).lower().strip()

        # Remove protocol
        url = url.replace("http://", "")
        url = url.replace("https://", "")

        # Remove www.
        url = url.replace("www.", "")

        # Extract domain
        domain = url.split("/")[0]

        if domain:
            domain_counter[domain] += 1

    print(
        f"Processed chunk {chunk_number} | "
        f"Records processed: {total_records:,}"
    )


# ------------------------------------------------------------
# 2. Basic information
# ------------------------------------------------------------

print("\n2. HTTP DATASET INFORMATION")
print("-" * 40)

print("Total web records:", f"{total_records:,}")
print("Unique users:", len(users))
print("Unique computers:", len(computers))


# ------------------------------------------------------------
# 3. Top users by web activity
# ------------------------------------------------------------

web_activity_series = pd.Series(
    web_activity_per_user
).sort_values(ascending=False)

print("\n3. TOP 10 USERS BY WEB ACTIVITY")
print("-" * 40)

print(web_activity_series.head(10))


# ------------------------------------------------------------
# 4. Web activity by hour
# ------------------------------------------------------------

hour_series = pd.Series(
    web_activity_by_hour
).sort_index()

print("\n4. WEB ACTIVITY BY HOUR")
print("-" * 40)

print(hour_series)


# ------------------------------------------------------------
# 5. After-hours web activity
# ------------------------------------------------------------

after_hours_series = pd.Series(
    after_hours_per_user
).sort_values(ascending=False)

print("\n5. AFTER-HOURS WEB ACTIVITY")
print("-" * 40)

print(
    "Total after-hours web activity:",
    after_hours_series.sum()
)

print("\nTOP 10 USERS:")
print(after_hours_series.head(10))


# ------------------------------------------------------------
# 6. Weekend web activity
# ------------------------------------------------------------

weekend_series = pd.Series(
    weekend_per_user
).sort_values(ascending=False)

print("\n6. WEEKEND WEB ACTIVITY")
print("-" * 40)

print(
    "Total weekend web activity:",
    weekend_series.sum()
)

print("\nTOP 10 USERS:")
print(weekend_series.head(10))


# ------------------------------------------------------------
# 7. Domain analysis
# ------------------------------------------------------------

domain_series = pd.Series(
    domain_counter
).sort_values(ascending=False)

print("\n7. TOP 20 WEB DOMAINS")
print("-" * 40)

print(domain_series.head(20))


# ------------------------------------------------------------
# 8. Save results
# ------------------------------------------------------------

web_activity_series.to_csv(
    OUTPUT_PATH / "web_activity_per_user.csv",
    header=["web_activity_count"]
)

hour_series.to_csv(
    OUTPUT_PATH / "web_activity_by_hour.csv",
    header=["web_activity_count"]
)

after_hours_series.to_csv(
    OUTPUT_PATH / "after_hours_web_per_user.csv",
    header=["after_hours_web_count"]
)

weekend_series.to_csv(
    OUTPUT_PATH / "weekend_web_per_user.csv",
    header=["weekend_web_count"]
)

domain_series.head(100).to_csv(
    OUTPUT_PATH / "top_web_domains.csv",
    header=["web_activity_count"]
)


# ------------------------------------------------------------
# 9. Completion
# ------------------------------------------------------------

print("\n")
print("=" * 60)
print("HTTP / WEB BEHAVIOR ANALYSIS COMPLETED SUCCESSFULLY")
print("=" * 60)

print("\nResults saved in:")
print("outputs/")