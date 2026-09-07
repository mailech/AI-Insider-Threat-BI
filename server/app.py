# Activity Management System - Model API
# Small Flask server whose only job is to load insider_threat_model.joblib
# and expose it over HTTP so the React frontend (which can't run Python/joblib
# itself) can get real predictions from it.

import os
import joblib
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)  # allow the Vite dev server (different port) to call this API

MODEL_PATH = os.path.join(os.path.dirname(__file__), "insider_threat_model.joblib")
bundle = joblib.load(MODEL_PATH)
model = bundle["model"]
scaler = bundle["scaler"]
feature_cols = bundle["feature_cols"]


def to_risk_score(decision_value):
    """
    Converts the IsolationForest's decision_function output into the 0-100 risk
    score scale already used throughout the app (see risk() in main.jsx).
    Higher decision_function = more "normal"; lower/negative = more anomalous.
    This is a simple heuristic rescaling, not a calibrated probability.
    """
    risk = (0.30 - decision_value) / 0.60 * 100
    return int(max(0, min(100, round(risk))))


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "feature_cols": feature_cols})


@app.route("/api/predict", methods=["POST"])
def predict():
    data = request.get_json(force=True) or {}
    try:
        row = [float(data.get(f, 0)) for f in feature_cols]
    except (TypeError, ValueError):
        return jsonify({"error": "All feature values must be numbers."}), 400

    X = scaler.transform([row])
    pred = model.predict(X)[0]              # -1 = anomaly, 1 = normal
    decision = model.decision_function(X)[0]
    risk_score = to_risk_score(decision)
    risk_level = "High Risk" if risk_score >= 80 else "Medium" if risk_score >= 50 else "Low"

    return jsonify({
        "is_anomaly": bool(pred == -1),
        "decision_function": float(decision),
        "risk_score": risk_score,
        "risk_level": risk_level,
        "feature_cols": feature_cols,
    })


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
