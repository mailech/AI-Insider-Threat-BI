"""FastAPI application for the Insider Threat ML scoring service.

Endpoints:
  GET  /health       — model metadata and service status
  POST /score        — score a single employee
  POST /score/batch  — score a batch of employees (primary endpoint)
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .model_service import model, scaler, feature_cols, log_model_info, score_single, score_batch
from .schemas import (
    EmployeeFeatures,
    BatchScoreRequest,
    SingleScoreResponse,
    BatchScoreResponse,
    HealthResponse,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Run startup self-check when the service boots."""
    log_model_info()
    yield


app = FastAPI(
    title="INSIDER/IQ Risk Scoring Service",
    description="IsolationForest-based insider threat risk scoring API",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the Next.js dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Return model metadata and service status."""
    return HealthResponse(
        status="ok",
        model_loaded=True,
        n_features=int(model.n_features_in_),
        feature_cols=feature_cols,
        model_params=model.get_params(),
    )


@app.post("/score", response_model=SingleScoreResponse)
async def score_employee(request: EmployeeFeatures):
    """Score a single employee's feature vector."""
    features = {
        "logon_count": request.logon_count,
        "after_hours_logon_count": request.after_hours_logon_count,
        "usb_connect_count": request.usb_connect_count,
        "file_copy_count": request.file_copy_count,
        "email_count": request.email_count,
    }
    result = score_single(features)
    return SingleScoreResponse(
        employee_id=request.employee_id,
        **result,
    )


@app.post("/score/batch", response_model=BatchScoreResponse)
async def score_batch_endpoint(request: BatchScoreRequest):
    """Score a batch of employees using percentile-based risk banding.

    This is the primary endpoint used by the dashboard. It ranks employees
    against each other within the batch rather than relying on the model's
    absolute trained cutoff, which mitigates the scale mismatch between
    training data and mock activity counts.
    """
    employees = [
        {
            "employee_id": emp.employee_id,
            "logon_count": emp.logon_count,
            "after_hours_logon_count": emp.after_hours_logon_count,
            "usb_connect_count": emp.usb_connect_count,
            "file_copy_count": emp.file_copy_count,
            "email_count": emp.email_count,
        }
        for emp in request.employees
    ]
    result = score_batch(employees)
    return BatchScoreResponse(
        lookback_days=request.lookback_days,
        total_scored=len(employees),
        results=[SingleScoreResponse(**r) for r in result["results"]],
        band_distribution=result["band_distribution"],
    )
