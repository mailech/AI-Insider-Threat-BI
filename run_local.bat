@echo off
TITLE Activity Management System (AMS) Launcher
COLOR 0B

echo ==============================================================================
echo   ACTIVITY MANAGEMENT SYSTEM (AMS) -- LOCAL RUNNER
echo   AI-Assisted Insider Threat Behavioral Intelligence System
echo ==============================================================================
echo.

:: 1. Check Python
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Python is not installed or not found in system PATH.
    echo Please install Python 3.10+ to run the AMS backend.
    pause
    exit /b 1
)

:: 2. Check Node / npm
where npm >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js / npm is not installed or not found in system PATH.
    echo Please install Node.js 18+ to run the AMS frontend.
    pause
    exit /b 1
)

echo [*] Starting AMS Backend API Server (FastAPI on http://127.0.0.1:8000)...
start "AMS - Backend API (Port 8000)" cmd /k "cd backend && python run.py"

echo [*] Waiting 2 seconds for backend initialization...
timeout /t 2 /nobreak >nul

echo [*] Starting AMS Frontend Web Application (Next.js on http://localhost:4000)...
start "AMS - Frontend UI (Port 4000)" cmd /k "cd frontend && npm run dev"

echo.
echo ==============================================================================
echo   SERVICES LAUNCHED SUCCESSFULLY
echo ==============================================================================
echo   Frontend Dashboard:  http://localhost:4000
echo   Backend REST API:    http://127.0.0.1:8000
echo   API Documentation:   http://127.0.0.1:8000/docs
echo.
echo   Optional Scoped Module (Windows Event Log Listener):
echo     Standalone CLI:    cd backend && python services/windows_event_listener.py
echo     Auto-Background:   Set ENABLE_LIVE_WINDOWS_LISTENER=true in backend/.env
echo.
echo   Demo Evaluation Accounts:
echo     Administrator:     admin@ams.internal     / Admin1234!
echo     Security Manager:  manager@ams.internal   / Manager123!
echo     SOC Engineer:      soc@ams.internal       / SocEng123!
echo     Security Analyst:  analyst@ams.internal   / Analyst123!
echo ==============================================================================
echo.
echo [!] Keep this terminal and the spawned service windows open while evaluating.
echo Press any key to close this launcher window (services will keep running).
pause >nul
