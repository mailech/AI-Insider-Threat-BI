-- =========================================================
-- SYNTHETIC MOCK DATA GENERATOR (MILESTONE 1 ACADEMIC SAFE)
-- =========================================================
-- This script preloads realistic but entirely fake synthetic data 
-- for Departments, Employees, Devices, and initial Activity Logs.
-- It avoids touching the users/profiles table as that relies on Supabase Auth UUIDs.

-- 1. Insert Departments
INSERT INTO departments (id, name) VALUES 
('11111111-1111-4111-a111-111111111111', 'Cybersecurity / SOC'),
('22222222-2222-4222-a222-222222222222', 'Human Resources'),
('33333333-3333-4333-a333-333333333333', 'Software Engineering'),
('44444444-4444-4444-a444-444444444444', 'Finance')
ON CONFLICT (name) DO NOTHING;

-- 2. Insert Employees (Synthetic Entities)
INSERT INTO employees (id, employee_id, department_id, designation, risk_score, risk_category) VALUES 
('55555555-5555-4555-a555-555555555555', 'EMP-1001', '11111111-1111-4111-a111-111111111111', 'L2 Security Analyst', 10.0, 'Low'),
('66666666-6666-4666-a666-666666666666', 'EMP-1002', '33333333-3333-4333-a333-333333333333', 'Senior Backend Developer', 0.0, 'Low'),
('77777777-7777-4777-a777-777777777777', 'EMP-1003', '44444444-4444-4444-a444-444444444444', 'Financial Controller', 0.0, 'Low')
ON CONFLICT (employee_id) DO NOTHING;

-- 3. Insert Devices (Synthetic Assets)
INSERT INTO devices (id, employee_id, device_name, ip_address, mac_address, os_info) VALUES 
('88888888-8888-4888-a888-888888888888', '55555555-5555-4555-a555-555555555555', 'SEC-LPT-001', '10.0.1.5', '00:1B:44:11:3A:B7', 'Windows 11 Enterprise'),
('99999999-9999-4999-a999-999999999999', '66666666-6666-4666-a666-666666666666', 'ENG-MAC-044', '10.0.2.14', 'F8:FF:C2:59:E1:92', 'macOS Sonoma'),
('aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', '77777777-7777-4777-a777-777777777777', 'FIN-LPT-022', '10.0.3.50', 'E4:A4:71:B2:C9:83', 'Windows 10 Pro');

-- 4. Insert Initial Activity Logs (Normal Baselines for Milestone 1 visualization)
INSERT INTO activity_logs (employee_id, device_id, event_type, resource_accessed, volume_bytes, status) VALUES 
-- Employee 1 (Security, normal operations)
('55555555-5555-4555-a555-555555555555', '88888888-8888-4888-a888-888888888888', 'LOGIN', '{"system": "Windows AD", "location": "Internal Office"}', 0, 'Success'),
('55555555-5555-4555-a555-555555555555', '88888888-8888-4888-a888-888888888888', 'NETWORK', '{"destination_ip": "10.0.1.250", "protocol": "SSH"}', 1500, 'Success'),

-- Employee 2 (Engineering, compiling code and downloading dependencies)
('66666666-6666-4666-a666-666666666666', '99999999-9999-4999-a999-999999999999', 'LOGIN', '{"system": "GitLab", "location": "VPN USA"}', 0, 'Success'),
('66666666-6666-4666-a666-666666666666', '99999999-9999-4999-a999-999999999999', 'FILE_DOWNLOAD', '{"file_name": "ubuntu-22.04.iso", "server": "Internal NAS"}', 2147483648, 'Success'),
('66666666-6666-4666-a666-666666666666', '99999999-9999-4999-a999-999999999999', 'APP_USAGE', '{"application": "Docker Subsystem"}', 0, 'Success'),

-- Employee 3 (Finance, fetching quarterly reports)
('77777777-7777-4777-a777-777777777777', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'LOGIN', '{"system": "ERP Oracle", "location": "Internal Office"}', 0, 'Success'),
('77777777-7777-4777-a777-777777777777', 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa', 'DATA_TRANSFER', '{"file_name": "Q2_Earnings_Draft.xlsx", "destination": "OneDrive Sync"}', 5400000, 'Success');
