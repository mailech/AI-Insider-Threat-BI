# Architecture Diagram

The architecture is separated into a frontend experience, a gateway for API composition, and discrete operational services for activity, intelligence, and notification handling.

```mermaid
flowchart LR
    U[Analyst / Security User] --> F[Next.js Frontend]
    F --> G[Gateway API]
    G --> A[Auth Service]
    G --> B[Employee Service]
    G --> C[Activity Service]
    G --> D[Risk Service]
    G --> E[Alert Service]
    G --> N[Notification Service]
    C --> M[(MongoDB)]
    B --> P[(PostgreSQL)]
    D --> AI[AI Engine]
    AI --> S[Isolation Forest / LOF / XGBoost]
    E --> R[(Redis)]
```
