# Deployment

## Two ways to deploy

**Together, as one container (simplest).** The root `Dockerfile` builds the React
console and serves it from the FastAPI process. One image, one port, one URL —
and because the console calls the API on its own origin, there is **no CORS to
configure and no `VITE_API_URL` to set**.

```bash
docker build -t itbis .
docker run -p 8000:8000 \
  -e SECRET_KEY="$(python -c 'import secrets;print(secrets.token_hex(32))')" \
  -e DATABASE_URL="postgresql+psycopg2://user:pass@host:5432/itbis" \
  -e ENVIRONMENT=production \
  itbis
```

Everything is then on one origin: console at `/`, API at `/api/v1`, docs at
`/docs`, health check at `/health`. The image honours `$PORT`, so it drops
straight onto Render, Railway, Fly.io and Cloud Run without changes.

To run it without Docker, build the console into the API's `static/` directory:

```bash
cd frontend && npm run build && cp -r dist ../backend/static
cd ../backend && uvicorn app.main:app --port 8000
```

The API serves the console whenever `backend/static/index.html` exists, and runs
API-only when it does not — no configuration switch.

**Separately (better at scale).** `docker-compose.yml` runs the console behind
nginx and the API as its own service, so each scales independently. This is the
only mode that needs `VITE_API_URL` (baked into the console at build time) and
`BACKEND_CORS_ORIGINS` (so the API accepts that origin).

## Docker Compose (separate services)

```bash
cp .env.example .env
# edit .env: set SECRET_KEY, POSTGRES_PASSWORD, FIRST_ADMIN_PASSWORD
docker compose up -d --build
docker compose ps
curl http://localhost:8000/health
```

Services: `postgres` (primary store), `mongo` (raw log archive), `redis` (cache),
`api` (FastAPI, 2 workers), `web` (React behind nginx). Add `--profile search` to bring up
OpenSearch and OpenSearch Dashboards.

Seed a demo dataset:

```bash
docker compose exec api python -m scripts.seed --employees 40 --days 60 --reset
```

Useful commands:

```bash
docker compose logs -f api          # follow API logs
docker compose restart api          # restart after a config change
docker compose down                 # stop
docker compose down -v              # stop and delete all data
```

## Environment variables

Only three variables matter for a single-container deployment. Everything else has
a working default.

| Variable | Required? | Default | Notes |
| --- | --- | --- | --- |
| `SECRET_KEY` | **Yes** | dev value | Signs the JWTs. `python -c "import secrets;print(secrets.token_hex(32))"` |
| `DATABASE_URL` | **Yes** in production | SQLite file | `postgresql+psycopg2://user:pass@host:5432/db`. Omit entirely to use a local SQLite file |
| `ENVIRONMENT` | **Yes** in production | `development` | Any value other than `development` turns off the permissive localhost CORS rule |
| `BACKEND_CORS_ORIGINS` | Split deploy only | localhost list | Comma-separated origins. Not needed single-container — same origin, so no CORS |
| `VITE_API_URL` | Split deploy only | same origin | Baked into the console **at build time**. Leave unset single-container |
| `PORT` | No | `8000` | Injected automatically by Render, Railway, Fly and Cloud Run |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `60` | Access token lifetime |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | Refresh token lifetime |
| `ANOMALY_CONTAMINATION` | `0.035` | Isolation Forest sensitivity |
| `BASELINE_MIN_EVENTS` | `25` | Events required before a baseline is built |
| `RISK_CRITICAL_THRESHOLD` | `80` | Critical band floor |
| `RISK_HIGH_THRESHOLD` | `60` | High band floor |
| `RISK_MEDIUM_THRESHOLD` | `35` | Medium band floor |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | empty | Enables Google OAuth2 |
| `FIRST_ADMIN_EMAIL` / `FIRST_ADMIN_PASSWORD` | demo values | Bootstrap admin, created only when the user table is empty |

`VITE_API_URL` is compiled into the bundle, so changing it means rebuilding the console
image — restarting it is not enough.

## Production checklist

- [ ] `SECRET_KEY` set to 32+ random bytes, stored in a secrets manager, not in `.env`
- [ ] Every default password changed, starting with `FIRST_ADMIN_PASSWORD`
- [ ] `ENVIRONMENT=production` (this is what turns off permissive localhost CORS)
- [ ] `BACKEND_CORS_ORIGINS` restricted to your real console origin (split deploys only)
- [ ] TLS terminated at the load balancer or ingress; HTTP redirected to HTTPS
- [ ] PostgreSQL backups scheduled and a restore actually tested
- [ ] Model store on shared storage (S3 / Azure Blob) if running more than one API replica
- [ ] Log aggregation and uptime alerting on `/health`
- [ ] Legal basis and workforce notice confirmed for employee monitoring

## AWS

**ECS Fargate + RDS**

```bash
aws ecr create-repository --repository-name itbis-api
aws ecr create-repository --repository-name itbis-web

aws ecr get-login-password --region us-east-1 \
  | docker login --username AWS --password-stdin <acct>.dkr.ecr.us-east-1.amazonaws.com

docker build -t <acct>.dkr.ecr.us-east-1.amazonaws.com/itbis-api:latest ./backend
docker push <acct>.dkr.ecr.us-east-1.amazonaws.com/itbis-api:latest

docker build --build-arg VITE_API_URL=https://api.example.com \
  -t <acct>.dkr.ecr.us-east-1.amazonaws.com/itbis-web:latest ./frontend
docker push <acct>.dkr.ecr.us-east-1.amazonaws.com/itbis-web:latest
```

- **RDS for PostgreSQL 16** — Multi-AZ, encrypted, automated backups. Put `DATABASE_URL` in
  Secrets Manager and inject it as a task secret.
- **ECS service** — target group health check on `/health`, behind an ALB with an ACM
  certificate. Two tasks minimum.
- **EFS or S3** for `models_store` so replicas share per-user models.
- **DocumentDB** if you want the MongoDB archive tier; **ElastiCache** for Redis;
  **OpenSearch Service** for the search tier.
- **CloudWatch** for logs and an alarm on the `/health` check.

**Simpler alternative** — App Runner for the API (point it at the ECR image, health check
`/health`) and S3 + CloudFront for the built frontend, since `dist/` is static.

## Azure

**Container Apps + Azure Database for PostgreSQL**

```bash
az acr build --registry <registry> --image itbis-api:latest ./backend
az acr build --registry <registry> --image itbis-web:latest \
  --build-arg VITE_API_URL=https://api.example.com ./frontend

az containerapp create \
  --name itbis-api --resource-group <rg> --environment <env> \
  --image <registry>.azurecr.io/itbis-api:latest \
  --target-port 8000 --ingress external --min-replicas 2 \
  --secrets secret-key=<value> db-url=<value> \
  --env-vars SECRET_KEY=secretref:secret-key DATABASE_URL=secretref:db-url ENVIRONMENT=production
```

- **Azure Database for PostgreSQL Flexible Server** — zone-redundant HA, private endpoint.
- **Azure Files** mounted at `/app/models_store` for shared models.
- **Key Vault** for `SECRET_KEY` and the database URL.
- **Cosmos DB (Mongo API)** for the archive tier; **Azure Cache for Redis** for caching.
- **Application Insights** for tracing and availability tests against `/health`.

Static Web Apps is a cheaper home for the frontend if you would rather not run the nginx
container.

## Database migrations

The app calls `create_all` at startup, which is right for development and for a first
deployment. For an evolving production schema, add Alembic:

```bash
cd backend
alembic init migrations          # then point env.py at app.db.base:Base
alembic revision --autogenerate -m "describe the change"
alembic upgrade head
```

Run `alembic upgrade head` as a release step before rolling the API, and drop the
`create_all` call once migrations own the schema.

## Scheduled analytics

Detection runs automatically on ingestion. For estates that receive logs in nightly batches,
schedule the engines instead:

```bash
# 02:00 daily — rebuild baselines, detect, score and alert
0 2 * * * docker compose exec -T api python -c "
from app.db.session import SessionLocal
from app.ml import baseline, anomaly, risk
from app.services import alerts
with SessionLocal() as db:
    baseline.build_all_baselines(db, lookback_days=90)
    result = anomaly.run_detection(db, lookback_days=7)
    risk.recompute_all(db)
    alerts.generate_alerts(db, result['anomalies'])
    db.commit()
    print(f\"{result['anomalies_detected']} anomalies\")"
```

## Troubleshooting

| Symptom | Cause and fix |
| --- | --- |
| Console loads but every request fails | `VITE_API_URL` wrong — rebuild the `web` image, don't just restart it |
| CORS errors in the browser | Add the console origin to `BACKEND_CORS_ORIGINS` |
| `No behavioural baseline yet` | Fewer than 25 events for that employee; ingest more, then rebuild baselines |
| Detection returns zero anomalies | No events in the lookback window, or baselines were never built |
| Live feed shows offline | WebSockets blocked by the proxy — enable `Upgrade`/`Connection` header pass-through |
| API container restarts | Check `docker compose logs api`; usually `DATABASE_URL` pointing at an unreachable host |
