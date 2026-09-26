Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host " AI-Powered Insider Threat Behavioral Intelligence Platform" -ForegroundColor Green
Write-Host " Built on CERT Insider Threat Dataset Release 4.2" -ForegroundColor Yellow
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. Initialize Database
Write-Host "[1/3] Initializing Database & Seed Data..." -ForegroundColor Gray
python -c "from backend.app.db.init_db import init_database; init_database(); print('Database initialized successfully.')"

# 2. Start Backend in Background
Write-Host "[2/3] Starting FastAPI Backend on http://127.0.0.1:8000..." -ForegroundColor Gray
Start-Process powershell -ArgumentList "-NoExit", "-Command", "python -m uvicorn backend.app.main:app --reload --host 127.0.0.1 --port 8000"

# 3. Start Frontend
Write-Host "[3/3] Starting Vite React Frontend on http://localhost:5173..." -ForegroundColor Gray
Set-Location frontend
npm run dev
