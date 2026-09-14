# AI Insider Threat Behavioral Intelligence System

An AI-powered cybersecurity system designed to detect abnormal employee behavior, assess insider-threat risk, manage security alerts, support threat investigations, and generate security reports.

## Project Overview

- AI-based system for insider threat detection and behavioral intelligence.
- Analyzes employee activities to identify unusual behavioral patterns.
- Uses machine learning-based anomaly detection for risk assessment.
- Provides employee-level risk scores and risk classifications.
- Supports security analysts in monitoring, investigating, and resolving potential threats.
- Provides analytics and reporting for security and compliance activities.

## Key Objectives

- Detect abnormal employee behavior.
- Analyze employee activities from multiple sources.
- Identify potentially risky behavioral patterns.
- Calculate employee risk scores.
- Classify employees into Low, Medium, High, and Critical risk levels.
- Generate and manage security alerts.
- Support threat investigation workflows.
- Track investigation status and resolution.
- Generate risk, behavioral, threat, investigation, and compliance reports.

## Features

### Authentication and Security

- User registration and login.
- JWT-based authentication.
- OAuth2 authentication support.
- Security Analyst role.
- Protected API endpoints.

### Employee Management

- Employee profile management.
- Employee identity and organizational information.
- Department and designation details.
- Manager information.
- Access privilege information.
- Employee status tracking.

### Activity Monitoring

- Logon and logoff monitoring.
- Email activity monitoring.
- File activity monitoring.
- HTTP and web activity monitoring.
- Device activity monitoring.
- Employee behavioral activity summaries.

### Behavioral Intelligence

- Behavioral feature analysis.
- Employee behavioral profiling.
- Identification of abnormal activity patterns.
- Activity-based security indicators.
- Behavioral risk analysis.

### Machine Learning

- Isolation Forest-based anomaly detection.
- Feature scaling and preprocessing.
- Machine learning-based behavioral anomaly scoring.
- Risk score calibration.
- Pre-trained machine learning model artifacts included in the project.

### Risk Scoring

- Employee risk score from 0 to 100.
- Risk classification based on the calculated risk score:
  - Low: 0–24
  - Medium: 25–49
  - High: 50–74
  - Critical: 75–100
- Risk components include:
  - Behavioral anomalies
  - Privilege misuse
  - Data access violations
  - Access pattern deviations
  - Historical security events
- Employee-level risk analysis.
- Risk distribution analytics.

### Alert Management

- Security threat alerts.
- Alert severity classification.
- Alert status tracking.
- Employee-linked alerts.
- Analyst assignment.
- Alert resolution tracking.

### Threat Investigation

- Investigation case creation.
- Employee and alert association.
- Investigation severity management.
- Analyst assignment.
- Investigation status management.
- Investigation workflow support.
- Resolution notes.
- Investigation resolution tracking.

### Reports and Analytics

- Risk Assessment Reports.
- Behavioral Analytics Reports.
- Insider Threat Reports.
- Investigation Reports.
- Compliance Reports.
- Interactive charts and analytics.
- PDF report export.
- Excel report export.

### Psychometric Analysis

- Employee psychometric information.
- Big Five personality characteristics:
  - Openness
  - Conscientiousness
  - Extraversion
  - Agreeableness
  - Neuroticism
- Psychometric information is used as additional employee behavioral context.

## Technologies Used

### Frontend

- React.js
- Vite
- Tailwind CSS
- React Router
- Recharts
- jsPDF
- XLSX

### Backend

- Python
- FastAPI
- SQLAlchemy
- PostgreSQL
- JWT
- OAuth2

### Machine Learning and Data Processing

- Scikit-learn
- Isolation Forest
- NumPy
- Pandas

### Dataset

- CERT Insider Threat Dataset

### Development and Deployment

- Git
- GitHub


## Database

- PostgreSQL is used as the primary database.
- SQLAlchemy is used for database interaction.
- Main data entities include:
  - Employees
  - Psychometric Data
  - Logon Activity
  - Email Activity
  - File Activity
  - HTTP Activity
  - Device Activity
  - Behavioral Features
  - Risk
  - Alerts
  - Investigations

## Main Project Modules

- Login and Authentication
- Dashboard
- Employee Profiles
- Activity Monitoring
- Behavioral Analysis
- Risk Scoring
- Alert Management
- Threat Investigation
- Reports and Analytics
- Psychometric Analysis

## Risk Intelligence

The system processes employee behavioral and security information to provide:

- Employee risk scores.
- Risk levels.
- Behavioral anomaly indicators.
- Security risk components.
- Employee-level risk analysis.
- Risk distribution analytics.
- Risk-based security monitoring.

## Report Export

Reports can be exported in:

- PDF format
- Excel format

These exports can be used for security analysis, documentation, compliance activities, and offline review.



