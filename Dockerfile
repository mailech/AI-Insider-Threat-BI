# ---------------------------------------------------------------------------
# Insider Threat Behavioral Intelligence System - single-image deployment.
#
# Builds the React console, then serves it from the FastAPI process, so the
# whole platform runs as one container on one port with no CORS to configure.
#
#   docker build -t itbis .
#   docker run -p 8000:8000 -e SECRET_KEY=... -e DATABASE_URL=... itbis
# ---------------------------------------------------------------------------

FROM node:22-alpine AS console
WORKDIR /console
COPY frontend/package*.json ./
RUN npm ci --no-audit --no-fund
COPY frontend/ ./
# No VITE_API_URL: the console calls the API on its own origin.
RUN npm run build


FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential curl libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY backend/ .
COPY --from=console /console/dist ./static

RUN useradd --create-home --uid 10001 appuser \
    && mkdir -p /app/models_store \
    && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
    CMD curl -fsS http://localhost:8000/health || exit 1

# $PORT is honoured so the image drops straight onto Render, Railway, Fly and
# Cloud Run, which all inject it.
CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --workers 2"]
