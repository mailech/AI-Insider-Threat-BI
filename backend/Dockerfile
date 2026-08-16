# ============================================================
# ITBIS — FastAPI Backend Dockerfile
# ============================================================

# ── Stage 1: Base image ──────────────────────────────────────
FROM python:3.11-slim AS base

# Set working directory
WORKDIR /app

# Install system dependencies required by psycopg2-binary
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# ── Stage 2: Dependencies ────────────────────────────────────
FROM base AS deps

# Copy only requirements first to leverage Docker layer caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

# ── Stage 3: Runtime ─────────────────────────────────────────
FROM deps AS runtime

# Copy application source code
COPY ./app ./app

# Set Python environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app

# Expose FastAPI port
EXPOSE 8000

# Health check — polls the /health endpoint
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Run the application with Uvicorn
# --host 0.0.0.0  → listen on all interfaces inside the container
# --port 8000     → match EXPOSE above
# --workers 2     → suitable default; scale via docker-compose replicas
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
