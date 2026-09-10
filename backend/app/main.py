"""Insider Threat Behavioral Intelligence System - FastAPI application."""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import select, text

from app.api.v1.router import api_router
from app.core.config import settings
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.enums import Role
from app.models.user import User

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
)
logger = logging.getLogger("itbis")

DESCRIPTION = """
AI-powered **Insider Threat Behavioral Intelligence System**.

Continuously monitors employee activity, builds behavioural baselines, detects
anomalies, scores insider risk and drives investigation workflows for SOC teams.

**Modules**
1. Authentication & role-based access  2. Employee identity & profiles
3. Activity monitoring  4. Behavioural profiling  5. Anomaly detection
6. Insider risk scoring  7. Threat investigation  8. UEBA intelligence
9. Alerts & incidents  10. Dashboards  11. Notifications  12. Reports & export
"""


def bootstrap_admin() -> None:
    """Create the initial administrator account if the platform has no users."""
    with SessionLocal() as db:
        if db.execute(select(User.id).limit(1)).scalar_one_or_none() is not None:
            return
        admin = User(
            email=settings.FIRST_ADMIN_EMAIL.lower(),
            full_name="Platform Administrator",
            hashed_password=hash_password(settings.FIRST_ADMIN_PASSWORD),
            role=Role.ADMINISTRATOR.value,
            is_verified=True,
        )
        db.add(admin)
        db.commit()
        logger.info("Bootstrapped administrator account: %s", admin.email)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Starting %s (%s)", settings.PROJECT_NAME, settings.ENVIRONMENT)
    Base.metadata.create_all(bind=engine)
    bootstrap_admin()
    logger.info("Database ready; API available at %s", settings.API_V1_PREFIX)
    yield
    logger.info("Shutting down")


app = FastAPI(
    title=settings.PROJECT_NAME,
    description=DESCRIPTION,
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Expose API response time - one of the platform performance metrics."""
    started = time.perf_counter()
    response = await call_next(request)
    elapsed_ms = (time.perf_counter() - started) * 1000
    response.headers["X-Process-Time-ms"] = f"{elapsed_ms:.2f}"
    return response


@app.exception_handler(RequestValidationError)
async def validation_handler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={"detail": "Validation error", "errors": exc.errors()},
    )


@app.get("/", tags=["System"])
def root():
    return {
        "name": settings.PROJECT_NAME,
        "version": "1.0.0",
        "environment": settings.ENVIRONMENT,
        "docs": "/docs",
        "api": settings.API_V1_PREFIX,
    }


@app.get("/health", tags=["System"])
def health():
    """Liveness / readiness probe used by Docker and the cloud load balancer."""
    database = "connected"
    try:
        with SessionLocal() as db:
            db.execute(text("SELECT 1"))
    except Exception as exc:  # pragma: no cover
        database = f"error: {exc}"
    from app.services.notifications import manager

    return {
        "status": "healthy" if database == "connected" else "degraded",
        "database": database,
        "websocket_clients": manager.active,
        "environment": settings.ENVIRONMENT,
    }


app.include_router(api_router, prefix=settings.API_V1_PREFIX)
