from typing import List, Dict, Any, Optional, Tuple
import os
import json
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import joblib
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import RobustScaler
from ml.features.engineer import BehavioralFeatureEngineer


class InsiderThreatIsolationForest:
    """
    Production-grade Unsupervised Isolation Forest model tailored for CERT insider threat detection.
    Features robust normalization, calibrated [0.0, 1.0] anomaly scores, severity ranking,
    and feature-level anomaly explainability.
    """

    DEFAULT_FEATURES = BehavioralFeatureEngineer().get_feature_column_names()

    def __init__(
        self,
        n_estimators: int = 200,
        contamination: float = 0.02,
        random_state: int = 42,
        features: Optional[List[str]] = None
    ):
        self.n_estimators = n_estimators
        self.contamination = contamination
        self.random_state = random_state
        self.features = features or self.DEFAULT_FEATURES

        self.model = IsolationForest(
            n_estimators=self.n_estimators,
            contamination=self.contamination,
            random_state=self.random_state,
            n_jobs=-1
        )
        self.scaler = RobustScaler()
        self.is_fitted = False
        self.feature_medians_: Dict[str, float] = {}
        self.feature_iqrs_: Dict[str, float] = {}
        self.min_score_: float = -0.5
        self.max_score_: float = 0.5

    def fit(self, df: pd.DataFrame) -> "InsiderThreatIsolationForest":
        """
        Fits the Isolation Forest on the behavioral feature columns.
        """
        if df.empty:
            raise ValueError("Cannot fit model on empty DataFrame.")

        X = self._prepare_features(df)
        
        # Calculate feature distributions for explainability
        for col in self.features:
            val_series = pd.to_numeric(df.get(col, 0.0), errors="coerce").fillna(0.0)
            self.feature_medians_[col] = float(val_series.median())
            iqr = float(val_series.quantile(0.75) - val_series.quantile(0.25))
            self.feature_iqrs_[col] = iqr if iqr > 1e-4 else 1.0

        # Scale features
        X_scaled = self.scaler.fit_transform(X)
        self.model.fit(X_scaled)
        self.is_fitted = True

        # Calibrate score bounds
        raw_scores = self.model.decision_function(X_scaled)
        self.min_score_ = float(np.percentile(raw_scores, 1))
        self.max_score_ = float(np.percentile(raw_scores, 99))
        if self.min_score_ == self.max_score_:
            self.min_score_ -= 0.1
            self.max_score_ += 0.1

        return self

    def predict(self, df: pd.DataFrame) -> np.ndarray:
        """Returns binary anomaly predictions (-1 for anomaly, 1 for normal)."""
        if not self.is_fitted:
            raise ValueError("Model is not fitted yet.")
        X = self._prepare_features(df)
        X_scaled = self.scaler.transform(X)
        return self.model.predict(X_scaled)

    def score_samples(self, df: pd.DataFrame) -> pd.DataFrame:
        """
        Calculates calibrated anomaly scores (0.0 to 1.0), binary anomaly flags,
        severity tiers, and top explainable anomaly factors.
        """
        if not self.is_fitted:
            raise ValueError("Model is not fitted yet.")
        if df.empty:
            return pd.DataFrame()

        df = df.copy()
        X = self._prepare_features(df)
        X_scaled = self.scaler.transform(X)

        # Raw decision function: higher is normal, lower is anomalous
        raw_scores = self.model.decision_function(X_scaled)
        
        # Invert and normalize to [0.0, 1.0] where 1.0 is extremely anomalous
        # decision_function typically ranges from -0.5 (most anomalous) to +0.2 (normal)
        normalized_scores = (self.max_score_ - raw_scores) / (self.max_score_ - self.min_score_)
        calibrated_scores = np.clip(normalized_scores, 0.0, 1.0)
        calibrated_scores = np.round(calibrated_scores, 4)

        df["raw_anomaly_score"] = np.round(raw_scores, 4)
        df["anomaly_score"] = calibrated_scores
        df["is_anomaly"] = (df["anomaly_score"] >= 0.70).astype(int)

        # Assign severity category
        severities = []
        for score in calibrated_scores:
            if score >= 0.85:
                severities.append("CRITICAL")
            elif score >= 0.75:
                severities.append("HIGH")
            elif score >= 0.60:
                severities.append("MEDIUM")
            else:
                severities.append("LOW")
        df["severity"] = severities

        # Explainability: Calculate top contributing features
        reasons = []
        for idx in range(len(df)):
            top_factors = self._explain_row_anomaly(X.iloc[idx])
            reasons.append(top_factors)
        df["anomaly_factors"] = reasons

        return df

    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Ensures all expected feature columns exist and are numerical."""
        feature_matrix = pd.DataFrame(index=df.index)
        for col in self.features:
            if col in df.columns:
                feature_matrix[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
            else:
                feature_matrix[col] = 0.0
        return feature_matrix

    def _explain_row_anomaly(self, row: pd.Series) -> List[Dict[str, Any]]:
        """
        Determines the top features contributing to the anomalousness of an observation.
        """
        contributions = []
        for col in self.features:
            val = float(row.get(col, 0.0))
            median = self.feature_medians_.get(col, 0.0)
            iqr = self.feature_iqrs_.get(col, 1.0)
            
            # Feature deviation relative to training distribution IQR
            deviation = (val - median) / iqr
            if deviation > 1.5:  # Only features significantly above typical levels
                contributions.append({
                    "feature": col,
                    "value": round(val, 2),
                    "baseline_median": round(median, 2),
                    "deviation_ratio": round(deviation, 2)
                })

        # Sort descending by deviation ratio
        contributions.sort(key=lambda x: x["deviation_ratio"], reverse=True)
        return contributions[:5]

    def save(self, filepath: str = "models/isolation_forest.joblib") -> str:
        """
        Persists the trained model artifact and its metadata.
        """
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        
        artifact = {
            "model": self.model,
            "scaler": self.scaler,
            "features": self.features,
            "n_estimators": self.n_estimators,
            "contamination": self.contamination,
            "feature_medians_": self.feature_medians_,
            "feature_iqrs_": self.feature_iqrs_,
            "min_score_": self.min_score_,
            "max_score_": self.max_score_,
            "is_fitted": self.is_fitted
        }
        joblib.dump(artifact, filepath)

        # Save metadata json alongside
        metadata_path = filepath.rsplit(".", 1)[0] + "_metadata.json"
        metadata = {
            "model_type": "IsolationForest",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "n_estimators": self.n_estimators,
            "contamination": self.contamination,
            "feature_count": len(self.features),
            "features": self.features,
            "min_score_": self.min_score_,
            "max_score_": self.max_score_
        }
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        return filepath

    @classmethod
    def load(cls, filepath: str = "models/isolation_forest.joblib") -> "InsiderThreatIsolationForest":
        """Loads a persisted model from file."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")

        artifact = joblib.load(filepath)
        instance = cls(
            n_estimators=artifact.get("n_estimators", 200),
            contamination=artifact.get("contamination", 0.02),
            features=artifact.get("features", None)
        )
        instance.model = artifact["model"]
        instance.scaler = artifact["scaler"]
        instance.feature_medians_ = artifact.get("feature_medians_", {})
        instance.feature_iqrs_ = artifact.get("feature_iqrs_", {})
        instance.min_score_ = artifact.get("min_score_", -0.5)
        instance.max_score_ = artifact.get("max_score_", 0.5)
        instance.is_fitted = artifact.get("is_fitted", True)

        return instance
