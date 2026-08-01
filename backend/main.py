from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import auth, employees, activity, alerts, dashboards, reports

app = FastAPI(
    title="AEGIS Insider Threat Behavioral Intelligence System API",
    description="AI-powered Insider Threat Detection, Risk Scoring Engine, UEBA, and Incident Management API.",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(employees.router)
app.include_router(activity.router)
app.include_router(alerts.router)
app.include_router(dashboards.router)
app.include_router(reports.router)

@app.get("/")
def root():
    return {
        "system": "AEGIS Insider Threat Behavioral Intelligence System",
        "status": "OPERATIONAL",
        "version": "1.0.0",
        "docs_url": "/docs"
    }

@app.get("/api/v1/health")
def health_check():
    return {
        "status": "healthy",
        "engines": {
            "risk_scoring_engine": "online",
            "isolation_forest_anomaly_engine": "online",
            "ueba_analytics": "online"
        }
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
