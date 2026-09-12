import pandas as pd
from pathlib import Path

# ============================================================
# CERT R4.2 - FAST DATASET INSPECTION
# ============================================================

DATA_PATH = Path("data/r4.2")

print("=" * 60)
print("CERT R4.2 - FAST DATASET INSPECTION")
print("=" * 60)

csv_files = sorted(DATA_PATH.glob("*.csv"))

print("\n1. DATASET FILES")
print("-" * 30)

for file in csv_files:
    print(f"📄 {file.name}")

print(f"\nTotal CSV files: {len(csv_files)}")


# ------------------------------------------------------------
# Inspect each CSV without loading the entire large file
# ------------------------------------------------------------

for file in csv_files:

    print("\n" + "=" * 60)
    print(f"DATASET: {file.name}")
    print("=" * 60)

    # Read only a small sample
    sample = pd.read_csv(file, nrows=5)

    print("\nColumns:")
    print(list(sample.columns))

    print("\nFirst 3 rows:")
    print(sample.head(3).to_string(index=False))

    # Count records efficiently by reading only one column
    try:
        record_count = sum(
            1 for _ in open(file, "r", encoding="utf-8", errors="ignore")
        ) - 1

        print("\nApproximate record count:", record_count)

    except Exception as e:
        print("\nCould not count records:", e)

    # Check missing values in sample only
    print("\nMissing values in first 5 rows:")
    print(sample.isnull().sum())


print("\n")
print("=" * 60)
print("FAST DATASET INSPECTION COMPLETED SUCCESSFULLY")
print("=" * 60)