# Threat AI — Backend REST API Specification (FastAPI Blueprint)

> **Document Classification:** Engineering Reference // Pre-Implementation Blueprint  
> **Target Framework:** Python 3.11+ / FastAPI / Pydantic v2 / SQLAlchemy or asyncpg  
> **Authentication Standard:** OAuth2 with Password Bearer (JWT)  
> **Base URL:** `/api/v1`

This document defines the REST API contract required by the **Insider Threat Behavioral Intelligence System** React frontend. It outlines endpoints, query parameters, request payloads, response schemas, and HTTP status codes to ensure drop-in compatibility when the Python/FastAPI backend is implemented.

---

## 1. Authentication & Session Endpoints

### 1.1 `POST /api/v1/auth/login`
Authenticates a SOC analyst and issues a JWT Bearer token.

- **Request Body (`OAuth2PasswordRequestForm` or JSON):**
  ```json
  {
    "username": "admin@threat.ai",
    "password": "••••••••"
  }
  ```
- **Response (200 OK):**
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "bearer",
    "expires_in": 28800,
    "user": {
      "id": "USR-001",
      "email": "admin@threat.ai",
      "name": "Security Ops",
      "role": "Lead SOC Analyst",
      "initials": "SO",
      "department": "Security Operations",
      "clearance": "TOP SECRET // SCI"
    }
  }
  ```
- **Error Responses:**
  - `401 Unauthorized`: Invalid credentials.
  - `423 Locked`: Account suspended due to brute-force protection.

### 1.2 `GET /api/v1/auth/me`
Retrieves the profile and security clearance details of the currently authenticated analyst.

- **Headers:** `Authorization: Bearer <token>`
- **Response (200 OK):**
  ```json
  {
    "id": "USR-001",
    "email": "admin@threat.ai",
    "name": "Security Ops",
    "role": "Lead SOC Analyst",
    "clearance": "TOP SECRET // SCI",
    "activeSession": {
      "ipAddress": "10.240.12.8",
      "workstation": "SOC-ANALYST-ALPHA-01",
      "cipher": "TLS 1.3 // AES-256-GCM",
      "mfaVerified": true
    },
    "metrics": {
      "incidentsTriaged": 142,
      "containmentDirectives": 19
    }
  }
  ```

---

## 2. Workforce & Identity Endpoints

### 2.1 `GET /api/v1/employees`
Retrieves a paginated, filterable list of monitored identities.

- **Query Parameters:**
  - `search` (string, optional): Search by name, ID, or email.
  - `department` (string, optional): Filter by department (`Finance`, `Engineering`, `Legal`, etc.).
  - `risk_level` (string, optional): Filter by tier (`High`, `Medium`, `Low`).
  - `status` (string, optional): Filter by status (`Active`, `Under Review`, `Locked`).
  - `sort_by` (string, default: `"score"`): Sorting field (`score`, `name`, `lastActivity`).
  - `order` (string, default: `"desc"`): `asc` or `desc`.
  - `page` (int, default: `1`): Page number.
  - `page_size` (int, default: `10`): Items per page.
- **Response (200 OK):**
  ```json
  {
    "total": 97,
    "page": 1,
    "page_size": 10,
    "items": [
      {
        "id": "101",
        "name": "John Carter",
        "department": "Finance",
        "role": "Senior Financial Analyst",
        "status": "Under Review",
        "riskLevel": "High",
        "score": 87,
        "email": "john.carter@threat.ai",
        "lastActivity": "Unusual login — 3:14 AM, unrecognized device",
        "seen": "2h ago"
      }
    ]
  }
  ```

### 2.2 `GET /api/v1/employees/{id}`
Retrieves a complete forensic identity dossier including behavioral indicators, risk factor weights, and chronological security events.

- **Path Parameter:** `id` (string): Employee ID.
- **Response (200 OK):**
  ```json
  {
    "id": "101",
    "name": "John Carter",
    "department": "Finance",
    "role": "Senior Financial Analyst",
    "status": "Under Review",
    "riskLevel": "High",
    "score": 87,
    "email": "john.carter@threat.ai",
    "workstation": "WS-FIN-091",
    "ipAddress": "192.168.4.112",
    "location": "Frankfurt / Remote",
    "details": "Attempted 5 failed logins from unapproved IP in Berlin.",
    "behavioralIndicators": ["Off-Hours Authentication", "Foreign IP"],
    "riskFactors": [
      { "name": "Anomalous Authentication", "score": 92, "weight": "High" },
      { "name": "Geographic Deviation", "score": 85, "weight": "High" }
    ],
    "securityEvents": [
      {
        "id": "EVT-101-1",
        "title": "Consecutive Failed Login Attempts",
        "severity": "Critical",
        "timestamp": "Today, 03:12 AM",
        "source": "VPN Gateway",
        "description": "5 consecutive authentication failures."
      }
    ]
  }
  ```

### 2.3 `POST /api/v1/employees/{id}/lock`
Executes an immediate containment directive, suspending employee Active Directory/Okta credentials.

- **Response (200 OK):**
  ```json
  {
    "id": "101",
    "status": "Locked",
    "riskLevel": "Low",
    "score": 0,
    "message": "Identity credentials isolated and sessions terminated."
  }
  ```

### 2.4 `POST /api/v1/employees/{id}/reset-score`
Recalibrates the behavioral anomaly score to standard baseline (15 / 100).

- **Response (200 OK):**
  ```json
  {
    "id": "101",
    "score": 15,
    "riskLevel": "Low",
    "status": "Active",
    "message": "Behavioral threat baseline reset."
  }
  ```

### 2.5 `POST /api/v1/employees/{id}/dismiss-flag`
Clears active security flag and clamps risk score.

- **Response (200 OK):**
  ```json
  {
    "id": "101",
    "status": "Active",
    "riskLevel": "Low",
    "message": "Security flag dismissed by analyst."
  }
  ```

---

## 3. Incident Alerts Endpoints

### 3.1 `GET /api/v1/alerts`
Retrieves security alerts and anomalous telemetry events.

- **Query Parameters:**
  - `severity` (string, optional): `Critical`, `High`, `Medium`, `Low`.
  - `status` (string, optional): `New`, `Investigating`, `Resolved`.
  - `employee_id` (string, optional): Filter by associated identity.
- **Response (200 OK):**
  ```json
  {
    "total": 12,
    "items": [
      {
        "id": "ALT-2026-001",
        "title": "Mass Bulk Download from Confidential Legal Vault",
        "severity": "Critical",
        "status": "New",
        "employeeId": "104",
        "employeeName": "Priya Nair",
        "department": "Legal",
        "timestamp": "12 mins ago",
        "vector": "Data Exfiltration",
        "summary": "Downloaded 4.8 GB of encrypted patent records."
      }
    ]
  }
  ```

### 3.2 `PATCH /api/v1/alerts/{id}`
Updates the status or analyst notes on an alert.

- **Request Body:**
  ```json
  {
    "status": "Investigating"
  }
  ```
- **Response (200 OK):** Updated alert object.

---

## 4. Behavioral Risk Telemetry & Analytics Endpoints

### 4.1 `GET /api/v1/risk/overview`
Retrieves high-level composite threat indicators and workforce risk tier distribution.

- **Response (200 OK):**
  ```json
  {
    "compositeRiskScore": 24,
    "riskTier": "Low Risk",
    "monitoredIdentities": 97,
    "distribution": {
      "high": 3,
      "medium": 7,
      "low": 87
    }
  }
  ```

### 4.2 `GET /api/v1/risk/trajectory`
Retrieves longitudinal time-series threat score trajectory.

- **Query Parameters:** `timeframe` (`7d` | `30d` | `90d`)
- **Response (200 OK):**
  ```json
  [
    { "date": "Day 1", "score": 18, "anomalies": 2 },
    { "date": "Day 2", "score": 24, "anomalies": 5 }
  ]
  ```

### 4.3 `GET /api/v1/risk/threat-vectors`
Retrieves threat category benchmarks (Data Exfiltration, Anomalous Auth, etc.).

---

## 5. Notification Pipeline Endpoints

### 5.1 `GET /api/v1/notifications`
Retrieves real-time notification feed.

### 5.2 `PATCH /api/v1/notifications/{id}/read`
Marks an individual notification as read.

### 5.3 `POST /api/v1/notifications/mark-all-read`
Marks all notifications as read.

### 5.4 `DELETE /api/v1/notifications`
Clears the notification drawer feed.

---

## 6. SOC Configuration Endpoints

### 6.1 `GET /api/v1/settings`
Retrieves organization SOC parameters (anomaly thresholds, webhook endpoints, notification cadence).

### 6.2 `PUT /api/v1/settings`
Updates organization SOC parameters.

### 6.3 `POST /api/v1/settings/test-webhook`
Dispatches a test ping to the configured SIEM / Slack webhook endpoint.

---

## 7. Unified Error Response Schema (RFC 7807)

All endpoints return uniform error objects upon failure:

```json
{
  "error": {
    "code": "ENTITY_NOT_FOUND",
    "message": "Monitored employee with ID 999 does not exist.",
    "status": 404,
    "timestamp": "2026-09-09T16:30:00Z"
  }
}
```
