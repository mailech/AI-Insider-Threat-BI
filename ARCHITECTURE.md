# System Architecture

## 1. Overall Recommended Architecture
The system follows a typical modern, layered architecture utilizing a decoupled React frontend and FastAPI backend, backed by PostgreSQL. The ML component can either be embedded within the backend (for synchronous operations) or run as an asynchronous celery/worker task (highly recommended for large log analysis).

## 2. Frontend Architecture
- **Framework**: React.js 
- **State Management**: Redux Toolkit or Zustand for handling complex data like timelines and incident states.
- **Routing**: React Router (implementing Role-Based routing guards).
- **Visualizations**: D3.js, Chart.js, or Recharts for behavioral analytics, risk trends, and UEBA scatter plots.

## 3. Backend Architecture
- **Framework**: FastAPI (Python) for asynchronous, high-performance API delivery.
- **Design Pattern**: Controller-Service-Repository pattern (Routes -> CRUD -> DB).
- **Authentication**: OAuth2 with JWT tokens, mapping users (analysts) to Roles.
- **Async Tasks**: Celery/Redis or simple FastAPI BackgroundTasks for ML inference on incoming event streams.

## 4. ML / Anomaly Detection Architecture
- Anomaly detection is separated into logical layers:
  1. **Data Pre-processing**: Pandas/NumPy script running periodically or event-driven to aggregate user activity.
  2. **Model Inference**: Scikit-learn (Isolation Forest) is loaded into memory to evaluate the aggregated activity vector against historical baselines.
  3. **Risk Calculator**: Takes the anomaly flags, computes weights (Behavioral, Access, Privilege), and produces the Insider Risk Category.

## 5. Data Flow (Ingestion to Alert)
1. **Activity Ingestion**: External agents/logs push data to `POST /api/v1/activities/ingest`.
2. **Preprocessing**: Backend maps the event to an employee and normalizes the data.
3. **Queue/Buffer**: (Optional) Data goes into a message queue or directly into the DB.
4. **Behavioral Profiling**: ML worker accesses the last $N$ days of logs, extracts features (login time avg, transfer volume).
5. **Anomaly Detection**: Feature vector passed to Isolation Forest. If outlier = True, an Anomaly Record is generated.
6. **Risk Scoring**: Risk Calculation Service recalculates Employee's overall score.
7. **Alerting**: If score exceeds threshold, an Alert/Incident is generated.
8. **Investigation**: Security analyst sees Alert in real-time (via WebSocket or polling) on Dashboard.

## 6. Deployment Strategy
- **Containerization**: Backend, Frontend, and ML Worker wrapped in separate Docker containers.
- **Local Dev**: Configured with `docker-compose.yml`.
- **Cloud**: AWS/GCP/Azure.
  - Frontend: CDN/S3 or App Service.
  - Backend: Managed Container Service (ECS / Cloud Run).
  - Database: Managed PostgreSQL (Supabase or AWS RDS).

## 7. Testing Strategy
- **Unit**: PyTest for backend logic and risk calculation algorithms.
- **Integration**: Testing API endpoints with FastAPI test client, mocking the DB layer.
- **E2E**: Cypress or Playwright for critical UI workflows (alert escalation, dashboard loading).
