# Development Roadmap

## Phase 1 – Foundation

- Define architecture and boundaries
- Set up repository structure
- Plan APIs and data models
- Design UX and dashboard layout
- Establish secure configuration and container tooling

## Phase 2 – Identity and access core

- Build auth, RBAC, MFA-ready hooks, and token refresh
- Create employee, department, manager, and device models
- Add audit logging and access policy primitives

## Phase 3 – Telemetry ingestion

- Model login, file access, email, USB, browser, VPN, and network events
- Build normalization adapters for heterogeneous data sources
- Introduce MongoDB-backed log storage

## Phase 4 – Behavioral profiling and UEBA

- Create feature engineering pipelines
- Build baselines and peer comparison models
- Add anomaly scoring with Isolation Forest and LOF

## Phase 5 – Risk and alerting

- Compute low / medium / high / critical risk
- Correlate detections into incidents
- Add alert routing, suppression, and escalation

## Phase 6 – Investigation and reporting

- Add case investigation interfaces
- Create evidence timeline and analyst notes
- Support PDF, Excel, and CSV reporting

## Phase 7 – Enterprise hardening

- Add security headers, rate limiting, observability, and deployment automation
- Integrate Prometheus, Grafana, and NGINX
- Prepare AWS-ready deployment manifests
