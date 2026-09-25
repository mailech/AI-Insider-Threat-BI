FROM python:3.11-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/app ./app
COPY ml/models /models
ENV MODEL_PATH=/models/isolation_forest.joblib
ENV MODEL_METRICS_PATH=/models/model_metrics.json
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
