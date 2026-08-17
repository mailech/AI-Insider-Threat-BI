-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =========================================================
-- ENUMS
-- =========================================================

-- Support for the required 4 roles mapped in DATABASE_DESIGN.md
CREATE TYPE user_role AS ENUM (
    'Security Analyst', 
    'SOC Engineer', 
    'Security Manager', 
    'Administrator'
);

-- Support for the explicitly required activity logs categories
CREATE TYPE activity_type AS ENUM (
    'LOGIN', 
    'FILE_DOWNLOAD', 
    'FILE_UPLOAD', 
    'DATA_TRANSFER', 
    'EMAIL_ACTIVITY', 
    'PRIVILEGE_CHANGE', 
    'REMOTE_ACCESS',
    'NETWORK',
    'USB',
    'APP_USAGE'
);

-- =========================================================
-- UPDATE TRIGGER FUNCTION
-- =========================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- =========================================================
-- TABLES
-- =========================================================

-- Departments
CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER departments_updated_at
BEFORE UPDATE ON departments
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();


-- Users / Profiles (Maps strictly to Supabase Auth auth.users)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'Security Analyst',
    full_name VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Employees (The monitored entities)
-- risk_score and risk_category are included here as they form the foundational schema 
-- dictated in DATABASE_DESIGN.md, acting as placeholders for Milestone 3's logic.
CREATE TABLE employees (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id VARCHAR(50) NOT NULL UNIQUE, -- Internal HR/company ID
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    designation VARCHAR(255),
    manager_id UUID REFERENCES employees(id) ON DELETE SET NULL,
    risk_score FLOAT DEFAULT 0.0,
    risk_category VARCHAR(50) DEFAULT 'Low',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER employees_updated_at
BEFORE UPDATE ON employees
FOR EACH ROW EXECUTE PROCEDURE set_updated_at();


-- Devices / Assets
CREATE TABLE devices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    device_name VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    mac_address VARCHAR(17),
    os_info VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- Activity Logs (Ingestion point for monitored events)
CREATE TABLE activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
    device_id UUID REFERENCES devices(id) ON DELETE SET NULL,
    event_type activity_type NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resource_accessed JSONB,
    volume_bytes BIGINT,
    status VARCHAR(50)
);


-- Audit Logs (Tracks actions taken by Analysts/Admins)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(255) NOT NULL,
    target_resource VARCHAR(255),
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);


-- =========================================================
-- INDEXES & CONSTRAINTS
-- =========================================================

-- Create indexes to optimize queries on foreign keys and commonly ordered fields
CREATE INDEX idx_employees_department_id ON employees(department_id);
CREATE INDEX idx_employees_manager_id ON employees(manager_id);
CREATE INDEX idx_devices_employee_id ON devices(employee_id);
CREATE INDEX idx_activity_logs_employee_id ON activity_logs(employee_id);
CREATE INDEX idx_activity_logs_event_type ON activity_logs(event_type);
CREATE INDEX idx_activity_logs_timestamp ON activity_logs(timestamp);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);


-- =========================================================
-- ROW LEVEL SECURITY (RLS)
-- =========================================================

-- Enable RLS on all tables
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Note: The FastAPI backend acts as the service controller and will utilize a system-level role 
-- or Postgres connection to bypass RLS for data INGEST/UPDATE/ADMIN operations.
-- The following policies secure read access for queries originating directly from authenticated clients (e.g. React frontend hitting Supabase API directly).

-- 1. Users can only read their own profile natively. Admin read operations 
--    will route safely through the FastAPI backend.
CREATE POLICY "Users can read own profile" 
ON users FOR SELECT TO authenticated USING (auth.uid() = id);

-- 2. Departments, Employees, Devices are general org entities. Read-only to validated system users.
CREATE POLICY "Validated system users can read departments" 
ON departments FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
);

CREATE POLICY "Validated system users can read employees" 
ON employees FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
);

CREATE POLICY "Validated system users can read devices" 
ON devices FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid())
);

-- 3. Activity Logs are security sensitive. Only validated platform roles can view.
CREATE POLICY "Validated operators can view activity logs" 
ON activity_logs FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Security Analyst', 'SOC Engineer', 'Security Manager', 'Administrator'))
);

-- 4. Audit Logs are highly restricted. Only Admins and Security Managers can view natively.
CREATE POLICY "Restricted read on audit logs" 
ON audit_logs FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('Security Manager', 'Administrator'))
);
