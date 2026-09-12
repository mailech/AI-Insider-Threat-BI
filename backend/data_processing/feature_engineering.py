import os
import pandas as pd
from sklearn.ensemble import IsolationForest

# --------------------------------------------------
# Paths
# --------------------------------------------------

BASE_DIR = os.path.dirname(
    os.path.dirname(
        os.path.dirname(os.path.abspath(__file__))
    )
)

DATA_DIR = os.path.join(
    BASE_DIR,
    "data",
    "cert_r4_2"
)

OUTPUT_FILE = os.path.join(
    DATA_DIR,
    "behavioral_features.csv"
)


# --------------------------------------------------
# LOGON FEATURES
# --------------------------------------------------

def process_logon():

    print("Processing logon.csv...")

    result = []

    file_path = os.path.join(DATA_DIR, "logon.csv")

    for chunk in pd.read_csv(
        file_path,
        usecols=["date", "user", "pc", "activity"],
        chunksize=100000
    ):

        chunk["date"] = pd.to_datetime(
            chunk["date"],
            dayfirst=True,
            errors="coerce"
        )

        chunk = chunk[
            chunk["activity"].str.lower() == "logon"
        ]

        chunk["hour"] = chunk["date"].dt.hour
        chunk["weekday"] = chunk["date"].dt.weekday

        chunk["after_hours"] = (
            (chunk["hour"] < 8) |
            (chunk["hour"] >= 18)
        )

        chunk["weekend"] = (
            chunk["weekday"] >= 5
        )

        grouped = chunk.groupby("user").agg(
            login_count=("user", "size"),
            after_hours_logins=("after_hours", "sum"),
            weekend_logins=("weekend", "sum"),
            unique_pcs=("pc", "nunique")
        )

        result.append(grouped)

    final = pd.concat(result)

    final = final.groupby(final.index).sum()

    return final


# --------------------------------------------------
# DEVICE FEATURES
# --------------------------------------------------

def process_device():

    print("Processing device.csv...")

    result = []

    file_path = os.path.join(DATA_DIR, "device.csv")

    for chunk in pd.read_csv(
        file_path,
        usecols=["user", "pc", "activity"],
        chunksize=100000
    ):

        chunk = chunk[
            chunk["activity"].str.lower() == "connect"
        ]

        grouped = chunk.groupby("user").agg(
            device_connections=("user", "size"),
            device_unique_pcs=("pc", "nunique")
        )

        result.append(grouped)

    final = pd.concat(result)

    final = final.groupby(final.index).sum()

    return final


# --------------------------------------------------
# FILE FEATURES
# --------------------------------------------------

def process_file():

    print("Processing file.csv...")

    result = []

    file_path = os.path.join(DATA_DIR, "file.csv")

    for chunk in pd.read_csv(
        file_path,
        usecols=["date", "user", "pc", "filename"],
        chunksize=100000
    ):

        chunk["date"] = pd.to_datetime(
            chunk["date"],
            dayfirst=True,
            errors="coerce"
        )

        chunk["hour"] = chunk["date"].dt.hour

        chunk["after_hours"] = (
            (chunk["hour"] < 8) |
            (chunk["hour"] >= 18)
        )

        grouped = chunk.groupby("user").agg(
            file_accesses=("user", "size"),
            unique_files=("filename", "nunique"),
            after_hours_file_accesses=("after_hours", "sum")
        )

        result.append(grouped)

    final = pd.concat(result)

    final = final.groupby(final.index).sum()

    return final


# --------------------------------------------------
# MAIN FEATURE ENGINEERING
# --------------------------------------------------

def main():

    print("\nStarting behavioral feature engineering...\n")

    logon_features = process_logon()

    device_features = process_device()

    file_features = process_file()

    print("\nMerging features...")

    features = logon_features.join(
        device_features,
        how="outer"
    )

    features = features.join(
        file_features,
        how="outer"
    )

    features = features.fillna(0)

    features = features.reset_index()

    features.rename(
        columns={"index": "user"},
        inplace=True
    )

    # --------------------------------------------------
    # ML FEATURES
    # --------------------------------------------------

    ml_columns = [
        "login_count",
        "after_hours_logins",
        "weekend_logins",
        "unique_pcs",
        "device_connections",
        "device_unique_pcs",
        "file_accesses",
        "unique_files",
        "after_hours_file_accesses"
    ]

    X = features[ml_columns]

    print("\nTraining Isolation Forest...")

    model = IsolationForest(
        n_estimators=100,
        contamination="auto",
        random_state=42
    )

    model.fit(X)

    scores = model.decision_function(X)

    # Lower Isolation Forest score = more abnormal
    features["raw_anomaly_score"] = scores

    # Convert abnormality into easy 0-100 score
    abnormality = -scores

    min_score = abnormality.min()
    max_score = abnormality.max()

    if max_score != min_score:

        features["anomaly_score"] = (
            (abnormality - min_score)
            / (max_score - min_score)
            * 100
        )

    else:

        features["anomaly_score"] = 0


    # --------------------------------------------------
    # THREAT LEVEL
    # --------------------------------------------------

    def get_level(score):

        if score >= 80:
            return "CRITICAL"

        elif score >= 60:
            return "HIGH"

        elif score >= 30:
            return "MEDIUM"

        return "LOW"


    features["threat_level"] = (
        features["anomaly_score"]
        .apply(get_level)
    )


    # --------------------------------------------------
    # SORT BY RISK
    # --------------------------------------------------

    features = features.sort_values(
        "anomaly_score",
        ascending=False
    )


    # --------------------------------------------------
    # SAVE
    # --------------------------------------------------

    features.to_csv(
        OUTPUT_FILE,
        index=False
    )

    print("\n----------------------------------")
    print("Feature engineering completed!")
    print("----------------------------------")

    print(
        f"\nOutput saved at:\n{OUTPUT_FILE}"
    )

    print("\nTop 10 risky users:\n")

    print(
        features[
            [
                "user",
                "login_count",
                "after_hours_logins",
                "device_connections",
                "file_accesses",
                "anomaly_score",
                "threat_level"
            ]
        ].head(10).to_string(index=False)
    )


if __name__ == "__main__":
    main()