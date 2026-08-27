# Developer Guide

## Initial setup

1. Create a Python virtual environment for backend services.
2. Install backend dependencies from the service requirements files.
3. Set environment variables for JWT secret, DB URLs, Redis, and service-to-service auth.
4. Start PostgreSQL, MongoDB, Redis, and the API service using Docker Compose.

## Coding standards

- Use clear domain boundaries.
- Prefer typed models and interfaces.
- Keep service logic testable.
- Use dependency injection where business logic depends on repositories or messaging clients.

## Recommended workflow

- Write tests for exposed behavior before implementation.
- Keep the service contract stable.
- Run static checks and unit tests for each service boundary.
