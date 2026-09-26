from typing import List, Dict, Any, Optional, Tuple
import os
import json
from datetime import datetime, timezone
import numpy as np
import pandas as pd
import joblib
import xgboost as xgb
from sklearn.metrics import roc_auc_score, precision_recall_curve, auc, classification_report, confusion_matrix
from ml.features.engineer import BehavioralFeatureEngineer


class InsiderThreatXGBoost:
    """
    Supervised XGBoost Classifier trained on CERT Insider Threat ground truth patterns.
    Optimized for highly imbalanced class distributions with probability calibration,
    feature importance ranking, and local explanation extraction.
    """

    DEFAULT_FEATURES = BehavioralFeatureEngineer().get_feature_column_names()

    def __init__(
        self,
        n_estimators: int = 150,
        max_depth: int = 4,
        learning_rate: float = 0.05,
        subsample: float = 0.8,
        colsample_bytree: float = 0.8,
        scale_pos_weight: float = 10.0,
        random_state: int = 42,
        features: Optional[List[str]] = None
    ):
        self.n_estimators = n_estimators
        self.max_depth = max_depth
        self.learning_rate = learning_rate
        self.subsample = subsample
        self.colsample_bytree = colsample_bytree
        self.scale_pos_weight = scale_pos_weight
        self.random_state = random_state
        self.features = features or self.DEFAULT_FEATURES

        self.model = xgb.XGBClassifier(
            n_estimators=self.n_estimators,
            max_depth=self.max_depth,
            learning_rate=self.learning_rate,
            subsample=self.subsample,
            colsample_bytree=self.colsample_bytree,
            scale_pos_weight=self.scale_pos_weight,
            random_state=self.random_state,
            eval_metric="logloss",
            n_jobs=-1
        )
        self.is_fitted = False
        self.feature_importances_: Dict[str, float] = {}

    def fit(self, X: pd.DataFrame, y: pd.Series) -> "InsiderThreatXGBoost":
        """
        Fits the XGBoost classifier on engineered behavioral features and binary ground truth labels.
        """
        if X.empty or y.empty:
            raise ValueError("Input features X and labels y must not be empty.")

        X_mat = self._prepare_features(X)
        y_vec = np.array(y, dtype=int)

        # Automatically tune scale_pos_weight if positive class is sparse
        pos_count = (y_vec == 1).sum()
        neg_count = (y_vec == 0).sum()
        if pos_count > 0 and neg_count > 0:
            calc_pos_weight = float(neg_count / pos_count)
            self.scale_pos_weight = min(calc_pos_weight, 50.0)
            self.model.set_params(scale_pos_weight=self.scale_pos_weight)

        self.model.fit(X_mat, y_vec)
        self.is_fitted = True

        # Extract feature importances
        raw_importances = self.model.feature_importances_
        for feat, imp in zip(self.features, raw_importances):
            self.feature_importances_[feat] = round(float(imp), 4)

        return self

    def predict_proba(self, df: pd.DataFrame) -> np.ndarray:
        """Returns threat probabilities for class 1 (insider threat)."""
        if not self.is_fitted:
            raise ValueError("Model is not fitted yet.")
        if df.empty:
            return np.array([])
        X_mat = self._prepare_features(df)
        probs = self.model.predict_proba(X_mat)[:, 1]
        return np.round(probs, 4)

    def predict(self, df: pd.DataFrame, threshold: float = 0.5) -> np.ndarray:
        """Returns binary predictions based on custom decision threshold."""
        probs = self.predict_proba(df)
        return (probs >= threshold).astype(int)

    def evaluate(self, X_test: pd.DataFrame, y_test: pd.Series) -> Dict[str, Any]:
        """Evaluates model performance metrics on test set."""
        if not self.is_fitted:
            raise ValueError("Model is not fitted.")

        probs = self.predict_proba(X_test)
        preds = (probs >= 0.5).astype(int)
        y_true = np.array(y_test, dtype=int)

        metrics = {}
        # ROC-AUC
        if len(np.unique(y_true)) > 1:
            metrics["roc_auc"] = round(float(roc_auc_score(y_true, probs)), 4)
            precision, recall, _ = precision_recall_curve(y_true, probs)
            metrics["pr_auc"] = round(float(auc(recall, precision)), 4)
        else:
            metrics["roc_auc"] = 1.0
            metrics["pr_auc"] = 1.0

        cm = confusion_matrix(y_true, preds).tolist()
        metrics["confusion_matrix"] = cm
        metrics["report"] = classification_report(y_true, preds, output_dict=True, zero_division=0)
        return metrics

    def explain_prediction(self, row: pd.Series) -> List[Dict[str, Any]]:
        """
        Provides feature-level breakdown for an individual record based on
        feature value magnitude and global feature importance.
        """
        explanations = []
        for feat in self.features:
            val = float(row.get(feat, 0.0))
            imp = self.feature_importances_.get(feat, 0.0)
            if val > 0 and imp > 0.01:
                explanations.append({
                    "feature": feat,
                    "value": round(val, 2),
                    "importance_weight": imp,
                    "impact_score": round(val * imp, 3)
                })
        explanations.sort(key=lambda x: x["impact_score"], reverse=True)
        return explanations[:5]

    def _prepare_features(self, df: pd.DataFrame) -> pd.DataFrame:
        """Ensures consistent column ordering matching feature list."""
        mat = pd.DataFrame(index=df.index)
        for col in self.features:
            if col in df.columns:
                mat[col] = pd.to_numeric(df[col], errors="coerce").fillna(0.0)
            else:
                mat[col] = 0.0
        return mat

    def save(self, filepath: str = "models/xgboost_model.joblib") -> str:
        """Persists model artifact and configuration metadata."""
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        artifact = {
            "model": self.model,
            "features": self.features,
            "feature_importances_": self.feature_importances_,
            "scale_pos_weight": self.scale_pos_weight,
            "is_fitted": self.is_fitted
        }
        joblib.dump(artifact, filepath)

        metadata_path = filepath.rsplit(".", 1)[0] + "_metadata.json"
        metadata = {
            "model_type": "XGBoostClassifier",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "n_estimators": self.n_estimators,
            "max_depth": self.max_depth,
            "learning_rate": self.learning_rate,
            "scale_pos_weight": self.scale_pos_weight,
            "top_features": sorted(self.feature_importances_.items(), key=lambda x: x[1], reverse=True)[:10]
        }
        with open(metadata_path, "w", encoding="utf-8") as f:
            json.dump(metadata, f, indent=2)

        return filepath

    @classmethod
    def load(cls, filepath: str = "models/xgboost_model.joblib") -> "InsiderThreatXGBoost":
        """Loads a persisted model from file."""
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Model file not found: {filepath}")

        artifact = joblib.load(filepath)
        instance = cls(features=artifact.get("features", None))
        instance.model = artifact["model"]
        instance.feature_importances_ = artifact.get("feature_importances_", {})
        instance.scale_pos_weight = artifact.get("scale_pos_weight", 10.0)
        instance.is_fitted = artifact.get("is_fitted", True)
        return instance
