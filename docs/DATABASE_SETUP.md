# Database Setup and Relationships

## Overview
This document outlines the initial database schema deployed to Supabase PostgreSQL for Milestone 1 of the Insider Threat Behavioral Intelligence System.

## Tables and Purpose

1. **`departments`**: Stores organizational units (e.g., "Engineering", "HR"). This replaces a flat text field in `employees` to allow proper relational filtering and grouping later for UEBA peer analytics.
2. **`users` (Profiles)**: Stores the platform's operators (Security Analysts, SOC Engineers, etc.). It strips out password handling because Supabase Auth handles authentication natively via an internal `auth.users` table. This `users` public table tracks the roles and names.
3. **`employees`**: The entities being monitored by the system. Includes organizational metadata and will later hold risk scoring features.
4. **`devices`**: Tracks corporate assets assigned to employees.
5. **`activity_logs`**: The core ingestion table. Receives high-volume synthetic events like `LOGIN`, `FILE_DOWNLOAD`, and `REMOTE_ACCESS`.
6. **`audit_logs`**: Crucial for security and compliance, tracking what the platform's operators (the `users`) do within the dashboard (e.g., changing another user's role).

## Relationships
- **Departments (1) <---> (N) Employees**: Many employees belong to one department.
- **Employees (1) <---> (N) Employees**: A recursive manager-subordinate relationship.
- **Employees (1) <---> (N) Devices**: An employee can trigger events on multiple assigned corporate devices.
- **Employees (1) <---> (N) Activity Logs**: Every monitored activity belongs to exactly one employee.
- **Devices (1) <---> (N) Activity Logs**: Activities tracked via MAC/IP are mapped to the originating device if applicable.
- **Users (1) <---> (N) Audit Logs**: Every operator action in the dashboard is mapped to the logged-in User.
