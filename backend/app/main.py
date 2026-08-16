from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from backend.app.config import STATIC_DIR
from backend.app.database import init_database
from backend.app.routers import activity, auth, dashboard, employees
from backend.app.services.seed import seed_database


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    seed_database()
    yield


app = FastAPI(
    title="Insider Threat Behavioral Intelligence API",
    version="0.1.0",
    description="Milestone 1 API surface for authentication, RBAC, employee profiles, activity ingestion, and dashboard telemetry.",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8000", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(activity.router)
app.include_router(dashboard.router)

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/api/health", tags=["System"])
def health() -> dict:
    return {"status": "ok", "service": "insider-threat-bi", "milestone": 1}


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/{full_path:path}", include_in_schema=False)
def spa_fallback(full_path: str) -> FileResponse:
    if full_path.startswith("api/"):
        raise HTTPException(status_code=404, detail="API route not found.")
    return FileResponse(STATIC_DIR / "index.html")
