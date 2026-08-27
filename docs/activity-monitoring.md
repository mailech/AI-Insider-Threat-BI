# Activity Monitoring Service

## Purpose

This service ingests employee-related activity telemetry and stores the raw normalized documents in MongoDB. The primary goal is to make behavioral analytics, timeline correlation, and insider-risk scoring possible with reliable event records.

## Supported event classes

- login
- logout
- file_access
- usb_event
- vpn_event
- email_event
- network_event
- application_usage

## Storage pattern

- PostgreSQL remains the relational source of truth for structured entities.
- MongoDB stores high-volume semi-structured telemetry documents.
- The event document should carry a stable event ID, employee ID, timestamp, source metadata, and raw payload details.

## Security posture

- JSON schema enforcement for inbound payloads
- Event ID uniqueness enforcement
- Source IP and device context preservation
- Redaction of secret values where appropriate
- Auditability for ingestion changes and service retries

## Expected integration points

- Employee management service for employee identity context
- Risk service for anomaly and severity interpretation
- Alert service for case enrichment
- Notification service for analyst urgency delivery
