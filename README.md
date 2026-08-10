# SentinelAI – AI-Powered Insider Threat Behavioral Intelligence System

SentinelAI is an enterprise-grade insider-threat platform designed to monitor employee behavior, convert event telemetry into behavioral baselines, and detect risky deviations using UEBA + anomaly detection.

## Phase 1 Focus

This repository currently establishes the foundational blueprint for the system:

1. Overall architecture
2. Folder structure
3. Development roadmap
4. Database design
5. API planning
6. UI wireframes
7. Initial project setup

## Target Architecture

The system is intentionally decomposed into independent services so that risk computation, activity ingestion, alert handling, and notifications can evolve without coupling all concerns together.

## Repository Layout

- `frontend/` – Next.js + React + TypeScript dashboard experience
- `backend/` – FastAPI gateway and core APIs
- `ai-engine/` – anomaly detection, UEBA, feature engineering, model registry
- `activity-service/` – telemetry ingestion and normalization
- `risk-service/` – score calculation and policy evaluation
- `alert-service/` – alert creation, triage, suppression, enrichment
- `notification-service/` – email, WebSocket, Slack-ready delivery
- `gateway/` – ingress / API composition / shared auth
- `docker/` – container definitions and compose overlays
- `docs/` – architecture, deployment, database, security, API documentation
- `tests/` – unit, integration, and contract testing
- `scripts/` – build, setup, and automation helpers

## Security Principles

- Least privilege
- Zero-trust service boundaries
- Secrets via environment variables or secret manager
- RLS-aware database strategy
- Audited administrative actions
- Secure-by-default CORS, headers, and validation

## Next Step

Continue with Phase 1 implementation by building the documentation and starter application skeleton in each service boundary.
