# ITBIS Windows Endpoint Agent — Log Listener PowerShell Launcher
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  ITBIS WINDOWS ENDPOINT AGENT — LOG LISTENER" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "Starting log listener stream to http://localhost:8000..." -ForegroundColor Yellow
Write-Host "Press Ctrl+C to stop.`n" -ForegroundColor Gray

python agent/windows_agent.py --api http://localhost:8000 --interval 10
