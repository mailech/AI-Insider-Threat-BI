# Backend - Flask API serving the ML model + SQLite database
FROM python:3.12-slim

WORKDIR /app

# system deps needed to build scikit-learn/numpy wheels on some platforms
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# database.db lives in this volume so it survives container restarts/rebuilds
VOLUME ["/app/data"]
ENV DB_PATH=/app/data/database.db

EXPOSE 5000

# gunicorn instead of the Flask dev server - 2 workers is plenty for a demo/small deployment
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "60", "app:app"]
