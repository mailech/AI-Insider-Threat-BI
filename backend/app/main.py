import time
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend.app.core.config import settings
from backend.app.api.v1.api import api_router
from backend.app.db.init_db import init_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize database tables and seed accounts
    init_database()
    yield
    # Shutdown logic if needed


app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    docs_url=f"{settings.API_V1_STR}/docs",
    redoc_url=f"{settings.API_V1_STR}/redoc",
    lifespan=lifespan
)

# Set all CORS enabled origins
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time-Sec"] = f"{process_time:.4f}"
    return response


# Include API routes
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", tags=["Health & Status"])
@app.get("/api/health", tags=["Health & Status"])
def health_check():
    return {
        "status": "HEALTHY",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "api_v1": settings.API_V1_STR,
        "dataset_engine": "CERT Insider Threat Dataset R4.2 Ready"
    }


@app.get("/", tags=["Health & Status"])
def root_redirect():
    return {
        "message": "Welcome to CERT AI-Powered Insider Threat Behavioral Intelligence API",
        "docs_url": f"{settings.API_V1_STR}/docs",
        "health_check": "/health"
    }
