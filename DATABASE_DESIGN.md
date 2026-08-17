# Database Design

## 1. Relational Database (PostgreSQL)
We will use an Entity-Relationship model that separates System Users (Analysts) from Target Entities (Monitored Employees), tracking activities, anomalies, and incidents.

## 2. Core Tables and Relationships

### Users (System Access)
- `id` (PK, UUID)
- `email`, `hashed_password`
- `role` (Enum: Security Analyst, SOC Engineer, Security Manager, Administrator)
- `full_name`, `created_at`

### Employees (Monitored Entities)
- `id` (PK, UUID)
- `employee_id` (String - HR specific)
- `department`, `designation`
- `manager_id` (FK to Employees)
- `risk_score` (Float)
- `risk_category` (Enum: Low, Medium, High, Critical)
- `created_at`, `updated_at`

### Devices & Assets
- `id` (PK, UUID)
- `employee_id` (FK to Employees)
- `device_name`, `ip_address`, `mac_address`, `os_info`

### Activity Logs (Event Ingestion)
- `id` (PK, UUID)
- `employee_id` (FK to Employees)
- `device_id` (FK to Devices)
- `event_type` (Enum: Login, FileDownload, FileUpload, DataTransfer, Network, Email, USB, PrivilegeChange, RemoteAccess, AppUsage)
- `timestamp`
- `resource_accessed` (String/JSONB)
- `volume_bytes` (Integer)
- `status` (Success/Failed)

### Behavioral Baselines
- `id` (PK, UUID)
- `employee_id` (FK to Employees)
- `feature_name` (e.g., avg_login_time, avg_daily_transfer)
- `mean_value`, `std_dev`
- `last_calculated_at`

### Anomalies
- `id` (PK, UUID)
- `employee_id` (FK to Employees)
- `activity_id` (FK to Activity Logs - optional if aggregated)
- `anomaly_category` (Enum: Unusual Login Time, Abnormal Data Download, Unauthorized Access Attempt, Excessive File Transfers, Suspicious Device Usage)
- `confidence_score` (Float)
- `detected_at`

### Alerts & Incidents
- `id` (PK, UUID)
- `employee_id` (FK to Employees)
- `severity` (Enum: Informational, Low, Medium, High, Critical)
- `status` (Enum: Open, Investigating, Escalated, Resolved, FalsePositive)
- `assigned_to` (FK to Users)
- `description`, `created_at`, `resolved_at`

### Audit Logs (System Activity)
- `id` (PK, UUID)
- `user_id` (FK to Users)
- `action_type` (String)
- `target_resource` (String)
- `timestamp`

### Investigation Evidence (Mapping table)
- `id` (PK, UUID)
- `incident_id` (FK to Alerts)
- `anomaly_id` (FK to Anomalies) or `activity_id` (FK to Activity Logs)
- `notes` (Text)

## 3. Relationships
- **Employee** 1:N **Devices**
- **Employee** 1:N **Activity Logs**
- **Employee** 1:N **Anomalies**
- **Employee** 1:N **Alerts/Incidents**
- **User** 1:N **Alerts** (Assigned Analyst)
- **Incident** 1:N **Investigation Evidence**
- **User** 1:N **Audit Logs**
