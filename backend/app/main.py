"""
ITBIS — FastAPI Application Entry Point
"""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.db.init_db import init_db
from app.db.mongo import connect_mongo, disconnect_mongo
from app.api.v1 import auth as auth_router
from app.api.v1 import employees as employees_router
from app.api.v1 import telemetry as telemetry_router
from app.api.v1.endpoints import analytics as analytics_router


# ── Lifespan (startup / shutdown) ─────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    # Startup
    init_db()               # Create / verify PostgreSQL tables
    await connect_mongo()   # Open Motor connection pool
    yield
    # Shutdown
    await disconnect_mongo()


# ── App factory ────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    description="Insider Threat Behavioral Intelligence System — REST API",
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    openapi_url="/api/openapi.json",
)

# ── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",   # Next.js dev server
        "http://localhost:5173",   # Vite dev server
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
API_PREFIX = "/api/v1"

# Module 1 — Authentication & RBAC
app.include_router(auth_router.router,      prefix=API_PREFIX)
# Module 2 — Employee Identity
app.include_router(employees_router.router, prefix=API_PREFIX)
# Module 3 — Telemetry Log Ingestion
app.include_router(telemetry_router.router, prefix=API_PREFIX)
# Module 6 — Analytics & Risk Scoring
app.include_router(analytics_router.router, prefix=API_PREFIX)


# ── Health check ───────────────────────────────────────────────────────────────
@app.get("/health", tags=["Health"])
def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.APP_NAME}
