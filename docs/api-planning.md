# API Planning

## Core design principle

APIs should be separated by bounded capability. The gateway composes user-facing interactions while each service owns one domain of responsibility.

## Authentication API

- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `POST /api/v1/auth/logout`
- `GET /api/v1/auth/me`

## Employee and identity APIs

- `GET /api/v1/employees`
- `POST /api/v1/employees`
- `GET /api/v1/departments`
- `GET /api/v1/devices`
- `GET /api/v1/access-privileges`

## Activity and telemetry APIs

- `POST /api/v1/activity/events`
- `GET /api/v1/activity/search`
- `GET /api/v1/activity/timeline/{employee_id}`

## Risk and anomaly APIs

- `GET /api/v1/risk/employee/{employee_id}`
- `GET /api/v1/risk/summary`
- `POST /api/v1/risk/recompute`

## Investigation APIs

- `GET /api/v1/incidents`
- `GET /api/v1/incidents/{id}`
- `POST /api/v1/incidents/{id}/notes`
- `POST /api/v1/cases`

## Notification and report APIs

- `POST /api/v1/notifications/send`
- `GET /api/v1/reports/export?type=pdf`

## Why this API structure matters

This pattern provides clear security boundaries, easier testing, and consistent integration for SOC analyst workflows.
