# AI Engine

This module is responsible for feature engineering, baseline generation, and anomaly detection.

## Planned models

- Isolation Forest for density-based anomaly detection
- Local Outlier Factor for neighborhood-based outlier scoring
- XGBoost for structured risk classification where labels exist

## Why these models

Isolation Forest performs well on high-dimensional behavior vectors and is less sensitive to a priori distributions. LOF is helpful when a point is anomalous relative to its local neighborhood instead of global density. XGBoost adds stronger supervised scoring where we have historical incident labels.
