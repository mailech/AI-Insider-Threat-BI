from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.database import initialize_database

from app.routes.employees import router as employee_router
from app.routes.activity import router as activity_router
from app.routes.analytics import router as analytics_router
from app.routes.alerts import router as alerts_router
from app.routes.investigations import router as investigations_router
from app.routes.auth import router as auth_router
from app.routes.dashboard import router as dashboard_router


app = FastAPI(
    title="AI Insider Threat BI API",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


initialize_database()


app.include_router(employee_router)
app.include_router(activity_router)
app.include_router(analytics_router)
app.include_router(alerts_router)
app.include_router(investigations_router)
app.include_router(auth_router)
app.include_router(dashboard_router)


@app.get("/")
def root():
    return {
        "message": "AI Insider Threat BI Backend is running"
    }


@app.get("/health")
def health():
    return {
        "status": "healthy"
    }