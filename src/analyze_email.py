import pandas as pd
from pathlib import Path
from collections import Counter

# ============================================================
# WEEK 1 - EMAIL BEHAVIOR ANALYSIS
# CERT R4.2 INSIDER THREAT PROJECT
# ============================================================

DATA_PATH = Path("data/r4.2/email.csv")
OUTPUT_PATH = Path("outputs")
OUTPUT_PATH.mkdir(exist_ok=True)

CHUNK_SIZE = 100000

print("=" * 60)
print("WEEK 1 - EMAIL BEHAVIOR ANALYSIS")
print("=" * 60)

# ------------------------------------------------------------
# Variables for analysis
# ------------------------------------------------------------

total_records = 0
users = set()
computers = set()

email_per_user = Counter()
after_hours_per_user = Counter()
weekend_per_user = Counter()
email_per_hour = Counter()

attachment_per_user = Counter()
large_email_per_user = Counter()

recipient_counter = Counter()

# ------------------------------------------------------------
# Read email.csv in chunks
# ------------------------------------------------------------

print("\n1. Loading email dataset in chunks...")
print("-" * 40)

for chunk_number, df in enumerate(
    pd.read_csv(DATA_PATH, chunksize=CHUNK_SIZE),
    start=1
):

    # Parse dates
    df["date"] = pd.to_datetime(
        df["date"],
        format="mixed"
    )

    total_records += len(df)

    # Basic information
    users.update(df["user"].dropna().unique())
    computers.update(df["pc"].dropna().unique())

    # --------------------------------------------------------
    # Email count per user
    # --------------------------------------------------------

    email_counts = df["user"].value_counts()

    for user, count in email_counts.items():
        email_per_user[user] += int(count)

    # --------------------------------------------------------
    # Time information
    # --------------------------------------------------------

    df["hour"] = df["date"].dt.hour
    df["day_of_week"] = df["date"].dt.dayofweek

    # Email activity by hour
    hourly_counts = df["hour"].value_counts()

    for hour, count in hourly_counts.items():
        email_per_hour[int(hour)] += int(count)

    # --------------------------------------------------------
    # After-hours emails
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
    # Weekend emails
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
    # Attachment analysis
    # --------------------------------------------------------

    attachment_data = df.dropna(
        subset=["user", "attachments"]
    )

    for user, group in attachment_data.groupby("user"):
        attachment_per_user[user] += int(
            group["attachments"].sum()
        )

    # --------------------------------------------------------
    # Large email analysis
    # Emails larger than 1 MB
    # --------------------------------------------------------

    large_emails = df[
        df["size"] > 1_000_000
    ]

    large_counts = large_emails["user"].value_counts()

    for user, count in large_counts.items():
        large_email_per_user[user] += int(count)

    # --------------------------------------------------------
    # Recipient analysis
    # --------------------------------------------------------

    for recipients in df["to"].dropna():

        # Emails can contain multiple recipients
        for recipient in str(recipients).split(";"):
            recipient = recipient.strip()

            if recipient:
                recipient_counter[recipient] += 1

    print(
        f"Processed chunk {chunk_number} | "
        f"Records processed: {total_records:,}"
    )


# ------------------------------------------------------------
# 2. Basic dataset information
# ------------------------------------------------------------

print("\n2. EMAIL DATASET INFORMATION")
print("-" * 40)

print("Total email records:", f"{total_records:,}")
print("Unique users:", len(users))
print("Unique computers:", len(computers))


# ------------------------------------------------------------
# 3. Top users by email activity
# ------------------------------------------------------------

email_per_user_series = pd.Series(
    email_per_user
).sort_values(ascending=False)

print("\n3. TOP 10 USERS BY EMAIL ACTIVITY")
print("-" * 40)

print(email_per_user_series.head(10))


# ------------------------------------------------------------
# 4. Email activity by hour
# ------------------------------------------------------------

email_per_hour_series = pd.Series(
    email_per_hour
).sort_index()

print("\n4. EMAIL ACTIVITY BY HOUR")
print("-" * 40)

print(email_per_hour_series)


# ------------------------------------------------------------
# 5. After-hours email activity
# ------------------------------------------------------------

after_hours_series = pd.Series(
    after_hours_per_user
).sort_values(ascending=False)

print("\n5. AFTER-HOURS EMAIL ACTIVITY")
print("-" * 40)

print(
    "Total after-hours emails:",
    after_hours_series.sum()
)

print("\nTOP 10 USERS:")
print(after_hours_series.head(10))


# ------------------------------------------------------------
# 6. Weekend email activity
# ------------------------------------------------------------

weekend_series = pd.Series(
    weekend_per_user
).sort_values(ascending=False)

print("\n6. WEEKEND EMAIL ACTIVITY")
print("-" * 40)

print(
    "Total weekend emails:",
    weekend_series.sum()
)

print("\nTOP 10 USERS:")
print(weekend_series.head(10))


# ------------------------------------------------------------
# 7. Attachment analysis
# ------------------------------------------------------------

attachment_series = pd.Series(
    attachment_per_user
).sort_values(ascending=False)

print("\n7. ATTACHMENT ACTIVITY")
print("-" * 40)

print(
    "Total attachments:",
    attachment_series.sum()
)

print("\nTOP 10 USERS BY ATTACHMENTS:")
print(attachment_series.head(10))


# ------------------------------------------------------------
# 8. Large email analysis
# ------------------------------------------------------------

large_email_series = pd.Series(
    large_email_per_user
).sort_values(ascending=False)

print("\n8. LARGE EMAIL ANALYSIS")
print("-" * 40)

print(
    "Total emails larger than 1 MB:",
    large_email_series.sum()
)

print("\nTOP 10 USERS:")
print(large_email_series.head(10))


# ------------------------------------------------------------
# 9. Save results
# ------------------------------------------------------------

email_per_user_series.to_csv(
    OUTPUT_PATH / "email_activity_per_user.csv",
    header=["email_count"]
)

email_per_hour_series.to_csv(
    OUTPUT_PATH / "email_activity_by_hour.csv",
    header=["email_count"]
)

after_hours_series.to_csv(
    OUTPUT_PATH / "after_hours_emails_per_user.csv",
    header=["after_hours_email_count"]
)

weekend_series.to_csv(
    OUTPUT_PATH / "weekend_emails_per_user.csv",
    header=["weekend_email_count"]
)

attachment_series.to_csv(
    OUTPUT_PATH / "attachments_per_user.csv",
    header=["attachment_count"]
)

large_email_series.to_csv(
    OUTPUT_PATH / "large_emails_per_user.csv",
    header=["large_email_count"]
)

# Save top recipients
top_recipients = pd.Series(
    recipient_counter
).sort_values(ascending=False).head(100)

top_recipients.to_csv(
    OUTPUT_PATH / "top_email_recipients.csv",
    header=["email_count"]
)


# ------------------------------------------------------------
# 10. Completion
# ------------------------------------------------------------

print("\n")
print("=" * 60)
print("EMAIL BEHAVIOR ANALYSIS COMPLETED SUCCESSFULLY")
print("=" * 60)

print("\nResults saved in:")
print("outputs/")