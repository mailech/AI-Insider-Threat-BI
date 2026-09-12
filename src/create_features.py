import pandas as pd
from pathlib import Path

# ============================================================
# COMBINED BEHAVIORAL FEATURE DATASET
# CERT R4.2 INSIDER THREAT PROJECT
# ============================================================

OUTPUT_PATH = Path("outputs")

print("=" * 60)
print("CREATING COMBINED BEHAVIORAL FEATURE DATASET")
print("=" * 60)


# ------------------------------------------------------------
# 1. Load previously generated analysis files
# ------------------------------------------------------------

print("\n1. Loading analysis results...")
print("-" * 40)

files = {
    "login": "login_counts_per_user.csv",
    "after_login": "after_hours_logins_per_user.csv",
    "weekend_login": "weekend_logins_per_user.csv",
    "computers": "computers_per_user.csv",

    "device": "device_activity_per_user.csv",
    "usb": "usb_connections_per_user.csv",
    "after_usb": "after_hours_usb_per_user.csv",
    "weekend_usb": "weekend_usb_per_user.csv",
    "usb_computers": "usb_computers_per_user.csv",

    "file": "file_activity_per_user.csv",
    "after_file": "after_hours_files_per_user.csv",
    "weekend_file": "weekend_files_per_user.csv",

    "email": "email_activity_per_user.csv",
    "after_email": "after_hours_emails_per_user.csv",
    "weekend_email": "weekend_emails_per_user.csv",
    "attachments": "attachments_per_user.csv",

    "web": "web_activity_per_user.csv",
    "after_web": "after_hours_web_per_user.csv",
    "weekend_web": "weekend_web_per_user.csv",

    "psychometric": "psychometric_analysis.csv"
}


# ------------------------------------------------------------
# 2. Read behavioral CSV files
# ------------------------------------------------------------

dataframes = {}

for name, filename in files.items():

    file_path = OUTPUT_PATH / filename

    if not file_path.exists():
        print(f"ERROR: Missing file -> {filename}")
        raise FileNotFoundError(file_path)

    dataframes[name] = pd.read_csv(file_path)

    print(f"Loaded: {filename}")


# ------------------------------------------------------------
# 3. Prepare user-based datasets
# ------------------------------------------------------------

print("\n2. Preparing behavioral features...")
print("-" * 40)


def prepare_feature(dataframe, value_column):
    """
    Convert a two-column analysis CSV into:
    user + requested feature
    """

    df = dataframe.copy()

    # First column contains user IDs
    user_column = df.columns[0]

    # Second column contains the calculated value
    value_column_original = df.columns[1]

    df = df[
        [user_column, value_column_original]
    ]

    df.columns = [
        "user",
        value_column
    ]

    return df


features = []


# ------------------------------------------------------------
# Logon features
# ------------------------------------------------------------

features.append(
    prepare_feature(
        dataframes["login"],
        "login_count"
    )
)

features.append(
    prepare_feature(
        dataframes["after_login"],
        "after_hours_logins"
    )
)

features.append(
    prepare_feature(
        dataframes["weekend_login"],
        "weekend_logins"
    )
)

features.append(
    prepare_feature(
        dataframes["computers"],
        "unique_computers"
    )
)


# ------------------------------------------------------------
# Device features
# ------------------------------------------------------------

features.append(
    prepare_feature(
        dataframes["device"],
        "device_activity"
    )
)

features.append(
    prepare_feature(
        dataframes["usb"],
        "usb_connections"
    )
)

features.append(
    prepare_feature(
        dataframes["after_usb"],
        "after_hours_usb"
    )
)

features.append(
    prepare_feature(
        dataframes["weekend_usb"],
        "weekend_usb"
    )
)

features.append(
    prepare_feature(
        dataframes["usb_computers"],
        "usb_unique_computers"
    )
)


# ------------------------------------------------------------
# File features
# ------------------------------------------------------------

features.append(
    prepare_feature(
        dataframes["file"],
        "file_activity"
    )
)

features.append(
    prepare_feature(
        dataframes["after_file"],
        "after_hours_files"
    )
)

features.append(
    prepare_feature(
        dataframes["weekend_file"],
        "weekend_files"
    )
)


# ------------------------------------------------------------
# Email features
# ------------------------------------------------------------

features.append(
    prepare_feature(
        dataframes["email"],
        "email_count"
    )
)

features.append(
    prepare_feature(
        dataframes["after_email"],
        "after_hours_emails"
    )
)

features.append(
    prepare_feature(
        dataframes["weekend_email"],
        "weekend_emails"
    )
)

features.append(
    prepare_feature(
        dataframes["attachments"],
        "attachment_count"
    )
)


# ------------------------------------------------------------
# Web features
# ------------------------------------------------------------

features.append(
    prepare_feature(
        dataframes["web"],
        "web_activity"
    )
)

features.append(
    prepare_feature(
        dataframes["after_web"],
        "after_hours_web"
    )
)

features.append(
    prepare_feature(
        dataframes["weekend_web"],
        "weekend_web"
    )
)


# ------------------------------------------------------------
# 4. Merge all behavioral features
# ------------------------------------------------------------

print("\n3. Merging behavioral features...")
print("-" * 40)

combined = features[0]

for feature_df in features[1:]:

    combined = combined.merge(
        feature_df,
        on="user",
        how="outer"
    )


# ------------------------------------------------------------
# 5. Add psychometric information
# ------------------------------------------------------------

print("Adding psychometric features...")

psychometric = dataframes["psychometric"].copy()

psychometric = psychometric[
    ["user_id", "O", "C", "E", "A", "N"]
]

psychometric.columns = [
    "user",
    "O",
    "C",
    "E",
    "A",
    "N"
]

combined = combined.merge(
    psychometric,
    on="user",
    how="outer"
)


# ------------------------------------------------------------
# 6. Fill missing behavioral values
# ------------------------------------------------------------

print("Filling missing behavioral values...")

feature_columns = [
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

combined[feature_columns] = (
    combined[feature_columns]
    .fillna(0)
)


# ------------------------------------------------------------
# 7. Sort by user
# ------------------------------------------------------------

combined = combined.sort_values(
    "user"
).reset_index(drop=True)


# ------------------------------------------------------------
# 8. Display final information
# ------------------------------------------------------------

print("\n4. FINAL FEATURE DATASET")
print("-" * 40)

print("Number of users:", len(combined))
print("Number of features:", len(combined.columns) - 1)

print("\nColumns:")
print(list(combined.columns))

print("\nFirst 10 users:")
print(combined.head(10).to_string(index=False))


# ------------------------------------------------------------
# 9. Missing-value check
# ------------------------------------------------------------

print("\n5. MISSING VALUE CHECK")
print("-" * 40)

print(
    combined.isnull().sum()
)


# ------------------------------------------------------------
# 10. Save final dataset
# ------------------------------------------------------------

output_file = (
    OUTPUT_PATH /
    "combined_behavioral_features.csv"
)

combined.to_csv(
    output_file,
    index=False
)

print("\n")
print("=" * 60)
print("COMBINED FEATURE DATASET CREATED SUCCESSFULLY")
print("=" * 60)

print("\nSaved as:")
print(output_file)

print("\nThis file will be used for the AI/ML stage.")