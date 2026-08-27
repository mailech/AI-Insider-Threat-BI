# Deployment Guide

## Container-first deployment

The system is intended to run through Docker Compose in development and through a container orchestrator in production. Each service should be built independently and exposed through a gateway with a reverse proxy chain.

## Production readiness checklist

- TLS termination at ingress
- Secret-managed credentials
- Persistent PostgreSQL storage
- Redis persistence and queue durability
- Separate credentials for read and write DB roles
- Prometheus metrics and Grafana visualizations
