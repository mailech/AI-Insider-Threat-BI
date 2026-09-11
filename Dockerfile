FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .

RUN pip install --no-cache-dir -r requirements.txt

COPY backend ./backend
COPY src ./src
COPY outputs ./outputs
COPY docs ./docs

EXPOSE 8501

CMD ["python", "-m", "streamlit", "run", "src/app.py", "--server.address=0.0.0.0"]