# ML & UEBA Validation Plan

## 1. Feature Engineering
We will build a pipeline (using Pandas) to extract vectorized features per employee daily:
- `login_time_offset`: Deviation from normal start time (Work patterns).
- `data_egress_bytes_daily`: Total data volume downloaded/transferred out.
- `sensitive_files_accessed_count`: Access patterns and privilege usage.
- `unique_devices_count`: Device usage footprints.
- `app_usage_frequency`: Application usage tracking.
- `communication_volume`: Email and communication patterns.
- `pw_failure_count`: Authentication failures.

## 2. Anomaly Detection (Isolation Forest)
**Algorithm Choice**: Isolation Forest is ideal for unsupervised anomaly detection because it isolates outliers by randomly selecting a feature and a split value. Normal points require more splits to isolate than anomalous ones.

**Implementation Steps**:
1. Scikit-Learn `IsolationForest` will be fit on a historical rolling window (e.g., past 30 days) per department or peer group.
2. Inference is run on the daily feature vector.
3. Output returns `-1` (Anomaly) or `1` (Normal).
4. `decision_function` utilized to extract an *anomaly score* (confidence level), stored in PostgreSQL.

## 3. Insider Risk Scoring Calculation
When an Anomaly or Policy Violation occurs, compute the composite score:
`Risk Score = (Behavioral Anomalies * 0.35) + (Privilege Misuse * 0.25) + (Data Access * 0.20) + (Pattern Deviations * 0.10) + (Historical Events * 0.10)`

- A service normalizes this into a 0-100 scale.
- Thresholds mapping Risk Category:
  - `0-30`: Low
  - `31-60`: Medium
  - `61-80`: High
  - `81-100`: Critical

## 4. Threat Prediction & UEBA
- User Behavior Analytics (UBA): Establish individual entity behavior analytics and work patterns over time.
- Peer group deviation: Subtract user's daily feature vector from their department's mean vector for peer comparison.
- Trending: Simple moving average (SMA) of risk score to track behavioral trends and establish threat prediction capabilities.
