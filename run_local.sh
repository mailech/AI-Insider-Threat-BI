#!/usr/bin/env bash
# ==============================================================================
# Activity Management System (AMS) — Bash / macOS / Linux Local Launcher
# ==============================================================================

set -e

echo "=============================================================================="
echo "  ACTIVITY MANAGEMENT SYSTEM (AMS) -- LOCAL RUNNER"
echo "  AI-Assisted Insider Threat Behavioral Intelligence System"
echo "=============================================================================="
echo ""

# Check Python
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "[ERROR] Python is not installed or not in PATH."
    exit 1
fi
PYTHON_BIN=$(command -v python3 || command -v python)

# Check npm
if ! command -v npm &> /dev/null; then
    echo "[ERROR] Node.js / npm is not installed or not in PATH."
    exit 1
fi

echo "[*] Starting AMS Backend API Server..."
(cd backend && "$PYTHON_BIN" run.py) &
BACKEND_PID=$!

echo "[*] Starting AMS Frontend Web Application..."
(cd frontend && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "=============================================================================="
echo "  SERVICES LAUNCHED SUCCESSFULLY"
echo "=============================================================================="
echo "  Frontend Dashboard:  http://localhost:4000"
echo "  Backend REST API:    http://127.0.0.1:8000"
echo "  API Documentation:   http://127.0.0.1:8000/docs"
echo ""
echo "  Press CTRL+C to stop all services."
echo "=============================================================================="

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null || true; exit 0" SIGINT SIGTERM
wait
