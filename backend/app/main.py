"""Insider Threat Behavioral Intelligence System - FastAPI application."""
from __future__ import annotations

import logging
import time
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
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


@app.get("/api", tags=["System"])
def api_info():
    """Service metadata. Lives at /api so the console can own the root path."""
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


@app.get("/health/services", tags=["System"])
def service_health():
    """Which backing service answered, and which fell back.

    Mongo, Redis and OpenSearch are all optional -- the platform runs on
    PostgreSQL alone. That makes silent degradation the real risk: a demo can
    look completely healthy while every document write is landing in a fallback
    table. This endpoint names the mode each adapter is actually in.
    """
    from app.core.cache import cache
    from app.core.documents import documents
    from app.core.mailer import SEVERITY_ORDER
    from app.core.search import search_backend
    from app.ml import classifier

    with SessionLocal() as db:
        document_stats = documents.stats(db)

    return {
        "primary_database": {
            "backend": "postgresql" if not settings.is_sqlite else "sqlite",
            "mode": "primary",
        },
        "documents": {
            "backend": documents.backend,
            "mode": "mongodb" if documents.available else "fallback: postgresql",
            "collections": document_stats,
        },
        "cache": {
            "backend": cache.backend,
            "mode": "redis" if cache.available else "fallback: in-process",
            "ttl_seconds": settings.CACHE_TTL_SECONDS,
        },
        "search": {
            "backend": search_backend.backend,
            "mode": "opensearch" if search_backend.available else "fallback: postgresql ILIKE",
        },
        "email": {
            "enabled": settings.SMTP_ENABLED,
            "mode": "smtp" if settings.SMTP_ENABLED else "logged only",
            "min_severity": settings.EMAIL_MIN_SEVERITY,
            "severity_scale": SEVERITY_ORDER,
        },
        "classifier": classifier.model_info(),
    }


app.include_router(api_router, prefix=settings.API_V1_PREFIX)


# ---------------------------------------------------------------- console
# When a built frontend is present (single-container deployment) the API also
# serves it, so the whole platform runs as one process on one origin and needs
# no CORS configuration at all. Split deployments simply omit this directory.
STATIC_DIR = Path(__file__).resolve().parent.parent / "static"
INDEX_FILE = STATIC_DIR / "index.html"

if INDEX_FILE.exists():
    assets_dir = STATIC_DIR / "assets"
    if assets_dir.is_dir():
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    def serve_console(full_path: str):
        """Serve the console, letting client-side routing own unknown paths."""
        # API and docs paths must keep returning JSON errors, not the SPA shell.
        if full_path.startswith(("api", "docs", "redoc", "openapi.json", "health")):
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Not found")

        candidate = (STATIC_DIR / full_path).resolve()
        if full_path and candidate.is_file() and candidate.is_relative_to(STATIC_DIR.resolve()):
            return FileResponse(candidate)
        return FileResponse(INDEX_FILE)

    logger.info("Serving the console from %s", STATIC_DIR)
else:

    @app.get("/", include_in_schema=False)
    def root():
        return api_info()

    logger.info("No built console at %s - running API only", STATIC_DIR)
