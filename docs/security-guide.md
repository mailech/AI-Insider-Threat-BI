# Security Guide

## Core security posture

SentinelAI must adopt enterprise security patterns from the first iteration.

## Mandatory protections

- JWT with short-lived access tokens and refresh rotation
- RBAC and least privilege
- Rate limiting on public endpoints
- Input validation and schema enforcement
- Secret storage in environment manager or vault
- Structured audit logging for admin and investigation actions
- Security headers for all web responses

## Cybersecurity why

A threat-intelligence platform stores sensitive employee and risk data. If the platform is not hardened, the system itself can become the attack surface.

## Implementation notes

- Use HTTPS everywhere.
- Enable CORS only for documented frontend origins.
- Enforce secure cookie and token patterns.
- Store secrets outside the repository.
