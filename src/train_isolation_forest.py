import pandas as pd
import numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest

# ============================================================
# ISOLATION FOREST - INSIDER THREAT DETECTION
# CERT R4.2 DATASET
# ============================================================

INPUT_FILE = Path("outputs/ml_features.csv")
OUTPUT_FILE = Path("outputs/anomaly_results.csv")

print("=" * 60)
print("INSIDER THREAT DETECTION - ISOLATION FOREST")
print("=" * 60)


# ------------------------------------------------------------
# 1. Load ML-ready dataset
# ------------------------------------------------------------

print("\n1. Loading ML dataset...")
df = pd.read_csv(INPUT_FILE)

print("Users:", len(df))
print("Columns:", len(df.columns))


# ------------------------------------------------------------
# 2. Separate user IDs and features
# ------------------------------------------------------------

print("\n2. Preparing features...")

users = df["user"]

X = df.drop(columns=["user"])

print("Number of ML features:", X.shape[1])


# ------------------------------------------------------------
# 3. Standardize the features
# ------------------------------------------------------------

print("\n3. Standardizing features...")

scaler = StandardScaler()

X_scaled = scaler.fit_transform(X)

print("Feature scaling completed.")


# ------------------------------------------------------------
# 4. Create Isolation Forest model
# ------------------------------------------------------------

print("\n4. Training Isolation Forest...")
print("-" * 40)

model = IsolationForest(
    n_estimators=200,
    contamination=0.05,
    random_state=42
)

model.fit(X_scaled)

print("Model training completed.")


# ------------------------------------------------------------
# 5. Generate predictions
# ------------------------------------------------------------

print("\n5. Detecting anomalous users...")

predictions = model.predict(X_scaled)

# Isolation Forest:
#  1  = normal
# -1  = anomaly

anomaly_score = model.decision_function(X_scaled)

# Convert prediction into easier labels
anomaly_label = np.where(
    predictions == -1,
    "Anomaly",
    "Normal"
)


# ------------------------------------------------------------
# 6. Create results dataframe
# ------------------------------------------------------------

results = pd.DataFrame({
    "user": users,
    "anomaly_score": anomaly_score,
    "status": anomaly_label
})


# ------------------------------------------------------------
# 7. Sort anomalies first
# ------------------------------------------------------------

results = results.sort_values(
    "anomaly_score"
).reset_index(drop=True)


# ------------------------------------------------------------
# 8. Count detected anomalies
# ------------------------------------------------------------

anomaly_count = (
    results["status"] == "Anomaly"
).sum()

normal_count = (
    results["status"] == "Normal"
).sum()

print("\n6. DETECTION SUMMARY")
print("-" * 40)

print("Total users:", len(results))
print("Normal users:", normal_count)
print("Anomalous users:", anomaly_count)

print(
    "Anomaly percentage:",
    round((anomaly_count / len(results)) * 100, 2),
    "%"
)


# ------------------------------------------------------------
# 9. Display top anomalous users
# ------------------------------------------------------------

print("\n7. TOP 20 ANOMALOUS USERS")
print("-" * 40)

print(
    results.head(20).to_string(index=False)
)


# ------------------------------------------------------------
# 10. Save results
# ------------------------------------------------------------

results.to_csv(
    OUTPUT_FILE,
    index=False
)

print("\n")
print("=" * 60)
print("ISOLATION FOREST COMPLETED SUCCESSFULLY")
print("=" * 60)

print("\nResults saved as:")
print(OUTPUT_FILE)

print("\nThe next stage will analyze these anomalies")
print("using behavioral features and CERT ground truth.")