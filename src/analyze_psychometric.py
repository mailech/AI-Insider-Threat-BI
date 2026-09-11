import pandas as pd
from pathlib import Path

# ============================================================
# WEEK 1 - PSYCHOMETRIC DATA ANALYSIS
# CERT R4.2 INSIDER THREAT PROJECT
# ============================================================

DATA_PATH = Path("data/r4.2/psychometric.csv")
OUTPUT_PATH = Path("outputs")
OUTPUT_PATH.mkdir(exist_ok=True)

print("=" * 60)
print("WEEK 1 - PSYCHOMETRIC DATA ANALYSIS")
print("=" * 60)

# ------------------------------------------------------------
# 1. Load dataset
# ------------------------------------------------------------

print("\n1. Loading psychometric dataset...")
print("-" * 40)

df = pd.read_csv(DATA_PATH)

print("Dataset loaded successfully!")
print("Total records:", len(df))


# ------------------------------------------------------------
# 2. Basic information
# ------------------------------------------------------------

print("\n2. DATASET INFORMATION")
print("-" * 40)

print("Columns:")
print(list(df.columns))

print("\nUnique employees:", df["user_id"].nunique())


# ------------------------------------------------------------
# 3. Check missing values
# ------------------------------------------------------------

print("\n3. MISSING VALUE CHECK")
print("-" * 40)

print(df.isnull().sum())


# ------------------------------------------------------------
# 4. Basic statistics
# ------------------------------------------------------------

print("\n4. BIG FIVE PERSONALITY STATISTICS")
print("-" * 40)

personality_columns = ["O", "C", "E", "A", "N"]

print(df[personality_columns].describe())


# ------------------------------------------------------------
# 5. Average personality scores
# ------------------------------------------------------------

print("\n5. AVERAGE PERSONALITY SCORES")
print("-" * 40)

average_scores = (
    df[personality_columns]
    .mean()
    .sort_values(ascending=False)
)

print(average_scores)


# ------------------------------------------------------------
# 6. Highest scores for each personality trait
# ------------------------------------------------------------

print("\n6. HIGHEST SCORE FOR EACH TRAIT")
print("-" * 40)

for trait in personality_columns:

    highest = df.loc[
        df[trait].idxmax()
    ]

    print(
        f"{trait}: "
        f"{highest['user_id']} "
        f"({highest[trait]})"
    )


# ------------------------------------------------------------
# 7. Lowest scores for each personality trait
# ------------------------------------------------------------

print("\n7. LOWEST SCORE FOR EACH TRAIT")
print("-" * 40)

for trait in personality_columns:

    lowest = df.loc[
        df[trait].idxmin()
    ]

    print(
        f"{trait}: "
        f"{lowest['user_id']} "
        f"({lowest[trait]})"
    )


# ------------------------------------------------------------
# 8. Overall personality score
# ------------------------------------------------------------

df["personality_average"] = (
    df[personality_columns]
    .mean(axis=1)
)

print("\n8. USERS WITH HIGHEST PERSONALITY AVERAGE")
print("-" * 40)

top_users = (
    df[
        ["user_id", "personality_average"]
    ]
    .sort_values(
        "personality_average",
        ascending=False
    )
)

print(top_users.head(10))


# ------------------------------------------------------------
# 9. Save results
# ------------------------------------------------------------

df.to_csv(
    OUTPUT_PATH / "psychometric_analysis.csv",
    index=False
)

average_scores.to_csv(
    OUTPUT_PATH / "average_personality_scores.csv",
    header=["average_score"]
)

print("\n")
print("=" * 60)
print("PSYCHOMETRIC ANALYSIS COMPLETED SUCCESSFULLY")
print("=" * 60)

print("\nResults saved in:")
print("outputs/")