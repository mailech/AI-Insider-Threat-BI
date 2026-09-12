# Week 4 Documentation — Behavioral Analytics & Anomaly Detection

## 1. Project Title

**Insider Threat Behavioral Intelligence System**

---

## 2. Week 4 Milestone

The Week 3 & 4 milestone focuses on:

* Implementing a behavioral profiling engine
* Building behavioral baselines
* Developing anomaly detection workflows
* Creating threat detection models
* Generating anomaly and risk reports

---

## 3. Objectives

The objective of this phase is to analyze user behavior from the CERT Insider Threat Dataset and identify users whose activity differs significantly from normal behavioral patterns.

The system combines behavioral features, anomaly detection results, and behavioral risk indicators to produce a final insider-threat risk score.

---

## 4. Behavioral Profiling Engine

### Implementation File

`src/create_features.py`

The behavioral profiling engine combines user activity from multiple sources, including:

* Login activity
* After-hours logins
* Weekend logins
* Computer usage
* Device and USB activity
* File activity
* Email activity
* Email attachments
* Web activity
* Psychometric information

### Result

* **Total users:** 1000
* **Total features:** 24
* **Missing values:** 0

### Output File

`outputs/combined_behavioral_features.csv`

### Main Behavioral Features

* `login_count`
* `after_hours_logins`
* `weekend_logins`
* `unique_computers`
* `device_activity`
* `usb_connections`
* `after_hours_usb`
* `weekend_usb`
* `usb_unique_computers`
* `file_activity`
* `after_hours_files`
* `weekend_files`
* `email_count`
* `after_hours_emails`
* `weekend_emails`
* `attachment_count`
* `web_activity`
* `after_hours_web`
* `weekend_web`

---

## 5. Behavioral Baseline

### Implementation File

`src/behavioral_baseline.py`

A behavioral baseline was created to represent the normal statistical behavior of the user population.

For each behavioral feature, the system calculates:

* Mean
* Median
* Standard deviation
* Minimum
* Maximum

These statistics provide a reference for identifying unusual user activity.

### Result

* **Users analyzed:** 1000
* **Behavioral features analyzed:** 19

### Output File

`outputs/behavioral_baseline.csv`

---

## 6. Anomaly Detection Workflow

### Implementation File

`src/evaluate_anomalies.py`

The anomaly evaluation workflow identifies users classified as anomalies by the machine-learning anomaly detection model.

The workflow evaluates:

* Anomaly score
* After-hours login ratio
* Weekend login ratio
* After-hours email ratio
* After-hours web ratio
* After-hours file ratio
* USB activity
* Behavioral signals

A priority score is calculated using:

* **60% anomaly component**
* **40% behavioral signal component**

### Priority Classification

| Priority Score | Priority |
| -------------- | -------- |
| >= 0.75        | High     |
| >= 0.50        | Medium   |
| < 0.50         | Low      |

### Anomaly Detection Result

Out of 1000 users:

* **950 Normal**
* **50 Anomalies**

Anomaly priority distribution:

* **High Priority:** 2
* **Medium Priority:** 16
* **Low Priority:** 32

### Output File

`outputs/anomaly_evaluation_report.csv`

---

## 7. Threat Detection Model

### Implementation File

`src/final_risk_scoring.py`

The threat detection model combines anomaly information with behavioral activity to calculate a final risk score for anomalous users.

The final risk score consists of:

* **60% Anomaly Component**
* **40% Behavioral Component**

The behavioral component considers indicators such as:

* USB activity
* File activity
* Email activity
* Web activity
* Number of computers used
* After-hours activity
* Weekend activity

The system also generates an explanation describing the detected risky behaviors.

---

## 8. Risk Classification

The final risk score is classified as follows:

| Risk Score | Risk Level |
| ---------- | ---------- |
| 75–100     | High       |
| 50–74.99   | Medium     |
| Below 50   | Low        |

---

## 9. Final Threat Detection Results

The final risk-scoring model successfully analyzed:

* **Total users:** 1000
* **Anomalous users:** 50
* **High-risk users:** 17
* **Medium-risk users:** 33

### Risk Distribution

| Risk Level | Number of Users |
| ---------- | --------------: |
| High       |              17 |
| Medium     |              33 |
| Low        |               0 |

---

## 10. Top 10 Highest-Risk Users

| Rank | User    | Risk Score | Risk Level |
| ---: | ------- | ---------: | ---------- |
|    1 | DLM0051 |      98.55 | High       |
|    2 | AJF0370 |      92.66 | High       |
|    3 | HSB0196 |      85.67 | High       |
|    4 | NAF0326 |      84.05 | High       |
|    5 | LBH0942 |      83.86 | High       |
|    6 | IBB0359 |      83.65 | High       |
|    7 | HPH0075 |      82.17 | High       |
|    8 | BAL0044 |      81.56 | High       |
|    9 | EIS0041 |      79.61 | High       |
|   10 | HDS0367 |      79.44 | High       |

---

## 11. Example High-Risk Detection

### User

**DLM0051**

### Risk Score

**98.55 / 100**

### Risk Level

**High**

### Detected Behavioral Indicators

The system identified multiple unusual behavioral signals:

* High after-hours login activity
* Unusual weekend login activity
* USB activity outside normal hours
* File activity outside normal hours
* Email activity outside normal hours
* High after-hours web activity
* Very high USB usage
* Very high file activity
* Very high web activity
* Very high email activity

This demonstrates that the system combines multiple behavioral indicators when determining insider-threat risk.

---

## 12. Generated Reports

The following reports were generated during this milestone:

1. `outputs/combined_behavioral_features.csv`
2. `outputs/behavioral_baseline.csv`
3. `outputs/anomaly_evaluation_report.csv`
4. `outputs/final_insider_threat_report.csv`

---

## 13. Execution Commands

### Step 1 — Behavioral Profiling

```text
python src\create_features.py
```

### Step 2 — Behavioral Baseline

```text
python src\behavioral_baseline.py
```

### Step 3 — Anomaly Evaluation

```text
python src\evaluate_anomalies.py
```

### Step 4 — Final Risk Scoring

```text
python src\final_risk_scoring.py
```

---

## 14. Overall Workflow

```text
CERT Insider Threat Dataset
            ↓
    Data Preprocessing
            ↓
   Behavioral Features
            ↓
   Behavioral Profiling
            ↓
   Behavioral Baseline
            ↓
    Anomaly Detection
            ↓
  Behavioral Risk Analysis
            ↓
    Threat Risk Scoring
            ↓
   Risk Classification
            ↓
      Anomaly Reports
            ↓
 Final Insider Threat Report
```

---

## 15. Overall Outcome

The Behavioral Analytics and Anomaly Detection milestone has been successfully implemented.

The system can:

1. Build behavioral profiles for users.
2. Calculate population-level behavioral baselines.
3. Detect anomalous users.
4. Evaluate behavioral risk signals.
5. Calculate final insider-threat risk scores.
6. Classify users into risk levels.
7. Generate explanations for detected risky behavior.
8. Generate machine-readable CSV reports.

---

## 16. Final Status

| Component                   | Status      |
| --------------------------- | ----------- |
| Behavioral Profiling Engine | ✅ Completed |
| Behavioral Baseline         | ✅ Completed |
| Anomaly Detection Workflow  | ✅ Completed |
| Threat Detection Model      | ✅ Completed |
| Anomaly Evaluation Report   | ✅ Completed |
| Final Risk Report           | ✅ Completed |

### Milestone Status

**WEEK 4 — COMPLETED ✅**

---

## 17. Important Note

A **High Risk** classification indicates that the user's behavior contains multiple unusual or risky patterns that should be investigated.

It does **not** by itself prove malicious intent or confirm that the user is an attacker.
