@echo off
title ITBIS Windows Endpoint Agent — Log Listener
echo ============================================================
echo   ITBIS WINDOWS ENDPOINT AGENT — LOG LISTENER
echo ============================================================
echo Connecting to ITBIS Backend at http://localhost:8000...
echo.

where python >nul 2>nul
if %errorlevel% equ 0 (
    python agent/windows_agent.py --api http://localhost:8000 --interval 10
    goto done
)

where py >nul 2>nul
if %errorlevel% equ 0 (
    py agent/windows_agent.py --api http://localhost:8000 --interval 10
    goto done
)

echo Python not found in system PATH. Running native PowerShell listener...
powershell -ExecutionPolicy Bypass -File "%~dp0run_log_listener.ps1"

:done
if errorlevel 1 (
    echo.
    echo Collector stopped or encountered an error.
    pause
)
