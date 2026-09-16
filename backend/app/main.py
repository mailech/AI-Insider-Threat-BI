"""InsiderIQ FastAPI application entry-point."""

from contextlib import asynccontextmanager

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text

from app.api.v1 import api_router
from app.core.config import settings
from app.db.session import engine
from app.db.base import Base
import app.models  # register every model before create_all


# ---------------------------------------------------------------------------
# Lifespan – startup / shutdown
# ---------------------------------------------------------------------------

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: verify database connectivity (skip during tests)
    import os
    if not os.environ.get("TESTING"):
        try:
            Base.metadata.create_all(bind=engine)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            print("[OK] Database connection verified.")
        except Exception as exc:  # pragma: no cover
            print(f"[ERROR] Database connection failed: {exc}")
            raise

    yield
    # Shutdown: nothing special required; SQLAlchemy manages its pool


# ---------------------------------------------------------------------------
# Application factory
# ---------------------------------------------------------------------------

app = FastAPI(
    title="InsiderIQ API",
    description=(
        "Insider threat detection and UEBA platform.\n\n"
        "Authenticate via **POST /api/v1/auth/login** to receive a Bearer token, "
        "then click **Authorize** and enter `Bearer <token>`."
    ),
    version="1.0.0",
    contact={
        "name": "InsiderIQ Security Team",
        "email": "security@insideriq.dev",
    },
    license_info={
        "name": "Proprietary",
    },
    openapi_tags=[
        {"name": "auth", "description": "Authentication and identity"},
        {"name": "users", "description": "User account management"},
        {"name": "employees", "description": "Monitored employee records"},
        {"name": "activity", "description": "Activity log ingestion and query"},
        {"name": "behavior", "description": "UEBA behavioral profiles and analysis"},
        {"name": "anomalies", "description": "Anomaly detection and status management"},
        {"name": "risk", "description": "Risk scoring (Isolation Forest)"},
        {"name": "alerts", "description": "Security alerts raised from anomalies"},
        {"name": "notifications", "description": "User notifications"},
        {"name": "investigations", "description": "Investigation workflow"},
        {"name": "reports", "description": "PDF / Excel report generation"},
    ],
    lifespan=lifespan,
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(api_router, prefix="/api/v1")

# ---------------------------------------------------------------------------
# Health check
# ---------------------------------------------------------------------------


@app.get(
    "/health",
    tags=["health"],
    summary="Service health check",
    response_description="Returns service status and database reachability",
)
def health_check() -> dict:
    """Lightweight liveness probe.

    Returns HTTP 200 when the API process is running.  A database ping is
    attempted; its result is reflected in the `database` field but does **not**
    change the HTTP status so that container health checks remain stable even
    during transient DB blips.
    """
    db_ok = False
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        db_ok = True
    except Exception:  # pragma: no cover
        pass

    return {
        "status": "ok",
        "service": "InsiderIQ API",
        "version": "1.0.0",
        "database": "connected" if db_ok else "unreachable",
    }


# ---------------------------------------------------------------------------
# Global exception handlers
# ---------------------------------------------------------------------------


@app.exception_handler(404)
async def not_found_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_404_NOT_FOUND,
        content={"detail": "The requested resource was not found."},
    )


@app.exception_handler(405)
async def method_not_allowed_handler(request: Request, exc: Exception) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        content={"detail": "Method not allowed."},
    )


@app.exception_handler(500)
async def internal_error_handler(request: Request, exc: Exception) -> JSONResponse:  # pragma: no cover
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={"detail": "An unexpected internal error occurred."},
    )
