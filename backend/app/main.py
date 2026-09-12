import datetime
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import settings
from app.database import engine, Base
from app.seed import seed_database
from app.routers import auth, dashboard, employees, telemetry, analytics, settings as settings_router, audit, anomalies, incidents, devices, executive, live_ingestion
from services.windows_event_listener import start_listener_service, stop_listener_service

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize DB schemas
    Base.metadata.create_all(bind=engine)
    # Seed benchmark data on startup
    seed_database()
    # Start live Windows event listener if enabled in configuration (Default OFF)
    start_listener_service()
    yield
    stop_listener_service()

app = FastAPI(
    title="Activity Management System (AMS) API",
    description="Enterprise Insider Threat Behavioral Intelligence & Activity Telemetry Platform",
    version=settings.PROJECT_VERSION,
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"http://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

import time
from collections import defaultdict
from fastapi.responses import JSONResponse
from fastapi import Request

# API Gateway Rate Limiting Configuration (Sliding Window: 600 req / 60 seconds per IP)
RATE_LIMIT_WINDOW_SECONDS = 60.0
RATE_LIMIT_MAX_REQUESTS = 600
_rate_limit_history = defaultdict(list)

@app.middleware("http")
async def api_gateway_instrumentation_middleware(request: Request, call_next):
    now = time.time()
    client_ip = request.client.host if request.client else "127.0.0.1"

    # Enforce sliding-window rate limiting
    timestamps = _rate_limit_history[client_ip]
    cutoff = now - RATE_LIMIT_WINDOW_SECONDS
    # Prune expired timestamps
    _rate_limit_history[client_ip] = [ts for ts in timestamps if ts > cutoff]
    current_count = len(_rate_limit_history[client_ip])

    if current_count >= RATE_LIMIT_MAX_REQUESTS:
        return JSONResponse(
            status_code=429,
            content={
                "detail": "Too Many Requests: API rate limit exceeded (600 req/min). Please back off.",
                "retry_after_seconds": int(RATE_LIMIT_WINDOW_SECONDS)
            },
            headers={
                "Retry-After": str(int(RATE_LIMIT_WINDOW_SECONDS)),
                "X-RateLimit-Limit": str(RATE_LIMIT_MAX_REQUESTS),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(now + RATE_LIMIT_WINDOW_SECONDS)),
            }
        )

    # Record current request timestamp
    _rate_limit_history[client_ip].append(now)
    remaining_quota = max(0, RATE_LIMIT_MAX_REQUESTS - (current_count + 1))

    # Time request processing
    start_perf = time.perf_counter()
    response = await call_next(request)
    duration_ms = (time.perf_counter() - start_perf) * 1000.0

    # Inject API Gateway performance & rate limiting telemetry headers
    response.headers["X-Process-Time"] = f"{duration_ms:.2f}ms"
    response.headers["X-RateLimit-Limit"] = str(RATE_LIMIT_MAX_REQUESTS)
    response.headers["X-RateLimit-Remaining"] = str(remaining_quota)
    response.headers["X-RateLimit-Reset"] = str(int(now + RATE_LIMIT_WINDOW_SECONDS))

    return response
# Mount Routers under API Prefix
app.include_router(auth.router, prefix=settings.API_PREFIX)
app.include_router(dashboard.router, prefix=settings.API_PREFIX)
app.include_router(employees.router, prefix=settings.API_PREFIX)
app.include_router(telemetry.router, prefix=settings.API_PREFIX)
app.include_router(analytics.router, prefix=settings.API_PREFIX)
app.include_router(anomalies.router, prefix=settings.API_PREFIX)
app.include_router(incidents.router, prefix=settings.API_PREFIX)
app.include_router(devices.router, prefix=settings.API_PREFIX)
app.include_router(settings_router.router, prefix=settings.API_PREFIX)
app.include_router(audit.router, prefix=settings.API_PREFIX)
app.include_router(executive.router, prefix=settings.API_PREFIX)
app.include_router(live_ingestion.router, prefix=settings.API_PREFIX)




@app.get("/")
def root():
    return {
        "name": "Activity Management System (AMS) API",
        "version": settings.PROJECT_VERSION,
        "status": "operational",
        "timestamp": datetime.datetime.utcnow().isoformat(),
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "AMS Telemetry Gateway",
        "timestamp": datetime.datetime.utcnow().isoformat()
    }
