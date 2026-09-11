# Storage roadmap

This plan follows the storage technologies named in the project brief. It separates transactional state from event evidence and search workloads so that high-volume telemetry cannot slow down investigations or authentication.

## Storage responsibilities

| Storage | System role | Owns | Does not own |
| --- | --- | --- | --- |
| PostgreSQL | Primary database | identities, roles, employee profiles, assets, risk assessments, alerts, investigations, audit trail, report metadata | raw event payloads or full-text search indexes |
| MongoDB | Secondary database | immutable raw activity events, model-feature snapshots, collected evidence payloads | canonical employee/alert state or authorization |
| Elasticsearch / OpenSearch | Search and analytics | indexed security logs, correlation queries, timeline search, aggregation dashboards | system-of-record records |

The PDF does not name object storage. Add S3/Azure Blob only later if large report exports, forensic attachments, or long-retention raw logs require it. PostgreSQL remains the source of truth for metadata and access policy.

## Delivery route

1. **Foundation** - Provision PostgreSQL, apply `postgres_schema.sql`, create a least-privilege application role, and enable encrypted backups.
2. **Transactional API** - Replace the in-memory alert repository with PostgreSQL repositories. Implement users, employees, alerts, investigations, and audit logs first.
3. **Ingestion lane** - Provision MongoDB and apply `mongodb_collections.js`. Activity collectors write raw events once, with an idempotency key.
4. **Analytics lane** - Stream or batch-copy validated activity events to Elasticsearch/OpenSearch using `search_mappings.json`. Never query the search cluster for authorization decisions.
5. **Risk pipeline** - Aggregate event windows into behavioral baselines, write a feature snapshot to MongoDB, and persist each explainable risk decision to PostgreSQL.
6. **Investigation workflow** - Link alerts and cases to immutable evidence IDs. Search timelines in the search engine; retrieve the original event from MongoDB only after RBAC authorization.
7. **Operations** - Add migrations, retention jobs, backup restore tests, monitoring, and data-subject/compliance workflows.

## Required data flow

```text
Activity collectors
      |
      v
MongoDB activity_events ----> Elasticsearch/OpenSearch security-events
      |                                  |
      v                                  v
Behavioral feature builder --------> analyst timeline/search
      |
      v
PostgreSQL risk_assessments -> alerts -> investigations -> audit_logs
```

## Core relationships

```text
departments 1--* employees 1--* employee_assets *--1 assets
employees   1--* risk_assessments 1--* alerts *--* investigations
users       *--* roles
users       1--* audit_logs
alerts      1--* evidence_links (MongoDB / search document IDs)
```

## Retention and lifecycle baseline

| Data class | Default retention | Lifecycle action |
| --- | ---: | --- |
| Authentication and authorization audit | 1 year | archive or delete per policy |
| Alert and investigation metadata | 3 years | archive closed cases before deletion |
| Raw activity events | 90 days hot, 1 year archive | TTL/ILM to warm/cold storage |
| Search indexes | 30 days hot, 90 days warm | index lifecycle management; rebuildable from raw events |
| Behavioral feature snapshots | 1 year | delete/aggregate after policy expiry |

These are initial engineering defaults, not a compliance policy. Security, legal, and data-governance stakeholders must approve final values before production.

## Security requirements

- Use separate database users for API, ingestion, analytics, and migrations; each needs only the permissions it uses.
- Keep database URIs, keys, and JWT secrets in environment variables or a managed secret manager, never source control.
- Use TLS in transit and encryption at rest for all stores and backups.
- Apply row/tenant scoping in repository queries if multiple organizations are introduced.
- Treat raw event metadata as untrusted input: enforce size limits, validate fields, and redact secrets before persistence/indexing.
- Record all alert acknowledgement, evidence access, exports, and role changes in `audit_logs`.

## Implementation artifacts

- `backend/database/postgres_schema.sql` - canonical relational tables and indexes.
- `backend/database/mongodb_collections.js` - validated collection and TTL definitions.
- `backend/database/search_mappings.json` - index templates for security-event and alert search.
