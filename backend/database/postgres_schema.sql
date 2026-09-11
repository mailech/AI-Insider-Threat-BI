-- Sentinel Insight transactional storage (PostgreSQL 15+)
-- Apply through a migration tool in production; this file is the initial reference schema.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TYPE user_role AS ENUM ('security_analyst', 'soc_engineer', 'security_manager', 'administrator');
CREATE TYPE alert_severity AS ENUM ('informational', 'low', 'medium', 'high', 'critical');
CREATE TYPE alert_status AS ENUM ('open', 'acknowledged', 'escalated', 'resolved', 'dismissed');
CREATE TYPE investigation_status AS ENUM ('open', 'in_review', 'contained', 'resolved', 'closed');
CREATE TYPE asset_type AS ENUM ('endpoint', 'server', 'mobile', 'cloud_account', 'application');

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(120) NOT NULL UNIQUE,
    cost_center VARCHAR(80),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    external_id VARCHAR(100) NOT NULL UNIQUE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    display_name VARCHAR(160) NOT NULL,
    email VARCHAR(254) NOT NULL UNIQUE,
    designation VARCHAR(120),
    employment_status VARCHAR(32) NOT NULL DEFAULT 'active' CHECK (employment_status IN ('active', 'inactive', 'terminated', 'leave')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX employees_department_idx ON employees(department_id);
CREATE INDEX employees_manager_idx ON employees(manager_id);

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID UNIQUE REFERENCES employees(id) ON DELETE SET NULL,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name user_role NOT NULL UNIQUE,
    description TEXT NOT NULL
);

CREATE TABLE user_roles (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
    granted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (user_id, role_id)
);

CREATE TABLE assets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    asset_tag VARCHAR(100) NOT NULL UNIQUE,
    asset_type asset_type NOT NULL,
    hostname VARCHAR(255),
    operating_system VARCHAR(100),
    criticality SMALLINT NOT NULL DEFAULT 3 CHECK (criticality BETWEEN 1 AND 5),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE employee_assets (
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    asset_id UUID NOT NULL REFERENCES assets(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    unassigned_at TIMESTAMPTZ,
    PRIMARY KEY (employee_id, asset_id, assigned_at)
);
CREATE INDEX employee_assets_current_idx ON employee_assets(employee_id) WHERE unassigned_at IS NULL;

CREATE TABLE employee_privileges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    resource_name VARCHAR(255) NOT NULL,
    privilege_level VARCHAR(80) NOT NULL,
    granted_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    UNIQUE (employee_id, resource_name, privilege_level)
);

CREATE TABLE behavioral_baselines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    baseline_version VARCHAR(64) NOT NULL,
    period_start TIMESTAMPTZ NOT NULL,
    period_end TIMESTAMPTZ NOT NULL,
    profile JSONB NOT NULL,
    feature_snapshot_id VARCHAR(128), -- MongoDB ObjectId/reference
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (period_end > period_start)
);
CREATE INDEX behavioral_baselines_employee_period_idx ON behavioral_baselines(employee_id, period_end DESC);

CREATE TABLE risk_assessments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
    baseline_id UUID REFERENCES behavioral_baselines(id) ON DELETE SET NULL,
    score SMALLINT NOT NULL CHECK (score BETWEEN 0 AND 100),
    category alert_severity NOT NULL,
    behavioral_anomalies NUMERIC(5,2) NOT NULL CHECK (behavioral_anomalies BETWEEN 0 AND 100),
    privilege_misuse NUMERIC(5,2) NOT NULL CHECK (privilege_misuse BETWEEN 0 AND 100),
    data_access_violations NUMERIC(5,2) NOT NULL CHECK (data_access_violations BETWEEN 0 AND 100),
    access_pattern_deviations NUMERIC(5,2) NOT NULL CHECK (access_pattern_deviations BETWEEN 0 AND 100),
    historical_security_events NUMERIC(5,2) NOT NULL CHECK (historical_security_events BETWEEN 0 AND 100),
    model_version VARCHAR(80) NOT NULL,
    explanation JSONB NOT NULL DEFAULT '{}'::jsonb,
    assessed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX risk_assessments_employee_time_idx ON risk_assessments(employee_id, assessed_at DESC);
CREATE INDEX risk_assessments_priority_idx ON risk_assessments(category, score DESC, assessed_at DESC);

CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(32) NOT NULL UNIQUE,
    employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
    risk_assessment_id UUID REFERENCES risk_assessments(id) ON DELETE SET NULL,
    severity alert_severity NOT NULL,
    status alert_status NOT NULL DEFAULT 'open',
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    deduplication_key VARCHAR(255) NOT NULL,
    acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
    acknowledged_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (deduplication_key, status)
);
CREATE INDEX alerts_queue_idx ON alerts(status, severity DESC, created_at DESC);
CREATE INDEX alerts_employee_idx ON alerts(employee_id, created_at DESC);

CREATE TABLE investigations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    public_id VARCHAR(32) NOT NULL UNIQUE,
    subject_employee_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    status investigation_status NOT NULL DEFAULT 'open',
    priority alert_severity NOT NULL,
    title VARCHAR(255) NOT NULL,
    summary TEXT,
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    opened_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    opened_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ
);
CREATE INDEX investigations_queue_idx ON investigations(status, priority DESC, opened_at DESC);

CREATE TABLE investigation_alerts (
    investigation_id UUID NOT NULL REFERENCES investigations(id) ON DELETE CASCADE,
    alert_id UUID NOT NULL REFERENCES alerts(id) ON DELETE CASCADE,
    linked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (investigation_id, alert_id)
);

CREATE TABLE evidence_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
    investigation_id UUID REFERENCES investigations(id) ON DELETE CASCADE,
    storage_type VARCHAR(32) NOT NULL CHECK (storage_type IN ('mongodb', 'elasticsearch', 'opensearch', 'object_storage')),
    external_id VARCHAR(255) NOT NULL,
    content_hash CHAR(64),
    label VARCHAR(255),
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (alert_id IS NOT NULL OR investigation_id IS NOT NULL)
);
CREATE INDEX evidence_links_lookup_idx ON evidence_links(storage_type, external_id);

CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_type VARCHAR(80) NOT NULL,
    filters JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    storage_reference VARCHAR(255),
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    expires_at TIMESTAMPTZ
);

CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id VARCHAR(255),
    request_id UUID,
    source_ip INET,
    user_agent VARCHAR(512),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_target_idx ON audit_logs(target_type, target_id, occurred_at DESC);
CREATE INDEX audit_logs_actor_idx ON audit_logs(actor_user_id, occurred_at DESC);
