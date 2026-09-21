import os
import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import IsolationForest
from sklearn.svm import OneClassSVM
from sklearn.preprocessing import StandardScaler
from sklearn.neural_network import MLPRegressor
from typing import Dict, Any, Tuple
from app.config import settings

class AnomalyDetectionSuite:
    def __init__(self):
        self.scaler = StandardScaler()
        self.iso_forest = IsolationForest(contamination=0.12, random_state=42)
        self.one_class_svm = OneClassSVM(nu=0.12, kernel="rbf", gamma="scale")
        self.autoencoder = MLPRegressor(hidden_layer_sizes=(12, 6, 12), max_iter=1000, random_state=42)
        self.feature_columns = [
            "mean_login_hour", "mean_logout_hour", "files_per_day", "usb_per_day",
            "emails_per_day", "network_mb_per_day", "out_of_session_access",
            "suspicious_app_count", "privilege_escalations", "unauth_transfers_mb",
            "keyword_flag_rate", "avg_subject_len", "degree_centrality", "betweenness_centrality"
        ]
        
    def fit_and_predict(self, df_features: pd.DataFrame) -> Tuple[pd.DataFrame, Dict[str, Any]]:
        # Ensure all columns exist
        for col in self.feature_columns:
            if col not in df_features.columns:
                df_features[col] = 0.0
                
        X = df_features[self.feature_columns].values
        X_scaled = self.scaler.fit_transform(X)
        
        # 1. Isolation Forest
        self.iso_forest.fit(X_scaled)
        # Negative decision score -> higher is more anomalous
        iso_raw = -self.iso_forest.score_samples(X_scaled)
        iso_norm = (iso_raw - iso_raw.min()) / (iso_raw.max() - iso_raw.min() + 1e-6)
        
        # 2. One-Class SVM
        self.one_class_svm.fit(X_scaled)
        svm_raw = -self.one_class_svm.decision_function(X_scaled)
        svm_norm = (svm_raw - svm_raw.min()) / (svm_raw.max() - svm_raw.min() + 1e-6)
        
        # 3. Neural Autoencoder
        self.autoencoder.fit(X_scaled, X_scaled)
        recon = self.autoencoder.predict(X_scaled)
        ae_raw = np.mean((X_scaled - recon) ** 2, axis=1)
        ae_norm = (ae_raw - ae_raw.min()) / (ae_raw.max() - ae_raw.min() + 1e-6)
        
        # 4. Graph Centrality Metric
        deg = df_features["degree_centrality"].values
        bet = df_features["betweenness_centrality"].values
        graph_raw = deg * 0.5 + bet * 0.5
        graph_norm = (graph_raw - graph_raw.min()) / (graph_raw.max() - graph_raw.min() + 1e-6)
        
        # 5. Composite Ensemble Score (Weighted Average)
        ensemble = 0.35 * iso_norm + 0.25 * ae_norm + 0.20 * svm_norm + 0.20 * graph_norm
        
        results_df = pd.DataFrame({
            "employee_id": df_features["employee_id"],
            "isolation_forest": np.round(iso_norm * 100, 2),
            "oneclass_svm": np.round(svm_norm * 100, 2),
            "autoencoder": np.round(ae_norm * 100, 2),
            "graph_analytics": np.round(graph_norm * 100, 2),
            "ensemble_score": np.round(ensemble * 100, 2),
            "is_red_team": df_features.get("is_red_team", 0)
        })
        
        # Save models
        joblib.dump(self.scaler, os.path.join(settings.MODEL_DIR, "scaler.pkl"))
        joblib.dump(self.iso_forest, os.path.join(settings.MODEL_DIR, "isolation_forest.pkl"))
        joblib.dump(self.one_class_svm, os.path.join(settings.MODEL_DIR, "oneclass_svm.pkl"))
        joblib.dump(self.autoencoder, os.path.join(settings.MODEL_DIR, "autoencoder.pkl"))
        
        return results_df, {
            "num_samples": len(df_features),
            "features_used": self.feature_columns,
            "models_trained": ["IsolationForest", "OneClassSVM", "NeuralAutoencoder", "GraphCentrality"]
        }
