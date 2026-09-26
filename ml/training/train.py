import os
import sys
import argparse
import logging
import pandas as pd
import numpy as np
from ml.models.isolation_forest import InsiderThreatIsolationForest
from ml.models.xgboost_model import InsiderThreatXGBoost

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("MLTraining")


def train_isolation_forest(
    input_path: str = "data/processed/behavioral_feature_matrix.parquet",
    output_dir: str = "models",
    n_estimators: int = 200,
    contamination: float = 0.02,
    random_state: int = 42
) -> str:
    """Trains and persists an Unsupervised Isolation Forest model on behavioral features."""
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Feature matrix not found at: {input_path}. Run preprocessing first.")

    logger.info(f"Loading behavioral feature matrix from: {input_path}")
    df = pd.read_parquet(input_path)
    logger.info(f"Loaded {len(df)} daily activity records for {df['user_id'].nunique()} employees.")

    model = InsiderThreatIsolationForest(
        n_estimators=n_estimators,
        contamination=contamination,
        random_state=random_state
    )
    
    logger.info(f"Fitting Isolation Forest (n_estimators={n_estimators}, contamination={contamination})...")
    model.fit(df)

    scored_df = model.score_samples(df)
    
    logger.info("Anomaly Score Distribution Summary:")
    logger.info(f"  Mean Anomaly Score: {scored_df['anomaly_score'].mean():.4f}")
    logger.info(f"  Min Score: {scored_df['anomaly_score'].min():.4f}, Max Score: {scored_df['anomaly_score'].max():.4f}")
    logger.info("Severity Breakdown:")
    for sev, count in scored_df["severity"].value_counts().items():
        logger.info(f"  {sev}: {count} ({count / len(scored_df) * 100:.1f}%)")

    if "is_insider" in scored_df.columns:
        insider_mask = scored_df["is_insider"] == 1
        insider_count = insider_mask.sum()
        if insider_count > 0:
            insider_scores = scored_df.loc[insider_mask, "anomaly_score"]
            normal_scores = scored_df.loc[~insider_mask, "anomaly_score"]
            logger.info("Ground Truth Separation:")
            logger.info(f"  Known Insider Days Count: {insider_count}")
            logger.info(f"  Insider Mean Anomaly Score: {insider_scores.mean():.4f}")
            logger.info(f"  Normal Mean Anomaly Score: {normal_scores.mean():.4f}")
            detected_anomalies = (insider_scores >= 0.70).sum()
            logger.info(f"  Insider Recall at 0.70 threshold: {detected_anomalies}/{insider_count} ({detected_anomalies/insider_count*100:.1f}%)")

    os.makedirs(output_dir, exist_ok=True)
    saved_path = os.path.join(output_dir, "isolation_forest.joblib")
    model.save(saved_path)
    logger.info(f"Model successfully saved to: {saved_path}")

    scored_output = os.path.join("data", "processed", "scored_feature_matrix.parquet")
    clean_scored = scored_df.drop(columns=["anomaly_factors"], errors="ignore")
    clean_scored.to_parquet(scored_output, index=False)
    logger.info(f"Scored features exported to: {scored_output}")

    return saved_path


def train_xgboost(
    input_path: str = "data/processed/behavioral_feature_matrix.parquet",
    output_dir: str = "models",
    test_ratio: float = 0.25,
    random_state: int = 42
) -> str:
    """
    Trains a supervised XGBoost classifier using CERT ground truth labels.
    Uses time-aware / chronological splitting to evaluate out-of-sample performance.
    """
    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Feature matrix not found at: {input_path}")

    logger.info(f"Loading dataset for XGBoost training from: {input_path}")
    df = pd.read_parquet(input_path)

    if "is_insider" not in df.columns:
        # Default label to 0 if not present
        df["is_insider"] = 0

    # Ensure chronological sort
    df["date_dt"] = pd.to_datetime(df["date"], errors="coerce")
    df = df.sort_values("date_dt").reset_index(drop=True)

    split_idx = int(len(df) * (1.0 - test_ratio))
    train_df = df.iloc[:split_idx].copy()
    test_df = df.iloc[split_idx:].copy()

    logger.info(f"Train set: {len(train_df)} samples, Test set: {len(test_df)} samples")
    logger.info(f"Train insider count: {(train_df['is_insider'] == 1).sum()}, Test insider count: {(test_df['is_insider'] == 1).sum()}")

    # Fit XGBoost
    xgb_model = InsiderThreatXGBoost(
        n_estimators=150,
        max_depth=4,
        learning_rate=0.05,
        random_state=random_state
    )
    xgb_model.fit(train_df, train_df["is_insider"])

    # Evaluate on test set
    eval_results = xgb_model.evaluate(test_df, test_df["is_insider"])
    logger.info(f"Evaluation ROC-AUC: {eval_results.get('roc_auc', 0):.4f}, PR-AUC: {eval_results.get('pr_auc', 0):.4f}")
    logger.info("Top Predictive Features:")
    sorted_feats = sorted(xgb_model.feature_importances_.items(), key=lambda x: x[1], reverse=True)[:5]
    for feat, imp in sorted_feats:
        logger.info(f"  {feat}: {imp:.4f}")

    # Retrain on full dataset for maximum production coverage
    logger.info("Retraining XGBoost on complete dataset for production artifact...")
    xgb_model.fit(df, df["is_insider"])

    os.makedirs(output_dir, exist_ok=True)
    saved_path = os.path.join(output_dir, "xgboost_model.joblib")
    xgb_model.save(saved_path)
    logger.info(f"XGBoost model artifact saved to: {saved_path}")

    return saved_path


def main():
    parser = argparse.ArgumentParser(description="Train ML models for Insider Threat Detection")
    parser.add_argument("--model-type", type=str, default="all", choices=["isolation_forest", "xgboost", "all"], help="Model architecture to train")
    parser.add_argument("--input", type=str, default="data/processed/behavioral_feature_matrix.parquet", help="Path to behavioral feature matrix")
    parser.add_argument("--output-dir", type=str, default="models", help="Directory to save model artifacts")
    parser.add_argument("--n-estimators", type=int, default=200, help="Number of trees")
    parser.add_argument("--contamination", type=float, default=0.02, help="Contamination ratio for isolation forest")

    args = parser.parse_args()

    if args.model_type in ["isolation_forest", "all"]:
        train_isolation_forest(
            input_path=args.input,
            output_dir=args.output_dir,
            n_estimators=args.n_estimators,
            contamination=args.contamination
        )

    if args.model_type in ["xgboost", "all"]:
        train_xgboost(
            input_path=args.input,
            output_dir=args.output_dir
        )


if __name__ == "__main__":
    main()
