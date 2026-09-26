@echo off
title AI Insider Threat Behavioral Intelligence System
echo =========================================================
echo  AI-Powered Insider Threat Behavioral Intelligence Platform
echo  Built on CERT Insider Threat Dataset Release 4.2
echo =========================================================

echo [1/3] Initializing Database & Seed Data...
python -c "from backend.app.db.init_db import init_database; init_database(); print('Database initialized successfully.')"

echo [2/3] Starting FastAPI Backend on http://127.0.0.1:8000 in new window...
start cmd /k "python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"

echo [3/3] Starting Vite React Frontend on http://localhost:5173...
cd frontend
npm run dev
