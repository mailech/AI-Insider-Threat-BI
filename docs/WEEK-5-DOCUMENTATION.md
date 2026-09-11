# Week 5 Documentation

## Insider Risk Scoring & Threat Investigation

### 1. Objective

The objective of Week 5 is to implement an insider risk scoring system and provide security analysts with tools to investigate suspicious employee behavior.

The system combines anomaly detection results with behavioral activity indicators to calculate a final insider risk score.

---

### 2. Insider Risk Scoring

The risk scoring engine uses:

* Anomaly detection score
* USB activity
* File activity
* Email activity
* Web activity
* Unique computer usage

The system calculates a normalized anomaly component and a behavioral component.

The final risk score is calculated using:

**Final Risk Score = (Anomaly Component × 60) + (Behavioral Component × 40)**

The score is limited to a range of 0–100.

---

### 3. Risk Classification

Users are classified according to their final risk score:

| Risk Score | Risk Level |
| ---------- | ---------- |
| 75–100     | High       |
| 50–74.99   | Medium     |
| Below 50   | Low        |

The current analysis identified:

* **17 High-risk users**
* **33 Medium-risk users**
* **50 anomalous users**

---

### 4. Threat Investigation Module

A threat investigation module was added to the Streamlit dashboard.

Security analysts can select an anomalous user and inspect:

* Risk score
* Risk level
* Anomaly score
* Login activity
* After-hours login activity
* Weekend login activity
* USB activity
* After-hours USB activity
* File activity
* After-hours file activity
* Email activity
* After-hours email activity
* Web activity
* After-hours web activity
* Unique computers

The module also displays an explanation of the behavioral indicators detected for the selected user.

---

### 5. Example Investigation

For example, user **DLM0051** received a high risk score of approximately **98.55**.

The investigation identified several behavioral indicators including:

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

These indicators help a security analyst prioritize the user for further investigation.

> A high risk score indicates anomalous behavior requiring investigation. It does not by itself prove malicious intent.

---

### 6. Technologies Used

* Python
* Pandas
* NumPy
* Scikit-learn
* Streamlit
* Plotly
* SQLite
* SQLAlchemy

---

### 7. Week 5 Outcome

The insider risk scoring engine and threat investigation module were successfully implemented.

The system can now convert behavioral anomalies into prioritized risk scores and provide detailed behavioral information to security analysts.
