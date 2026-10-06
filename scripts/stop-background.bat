@echo off
echo [Canopy] Stopping background services on ports 3001 and 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3001 "') do (
  taskkill /f /pid %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do (
  taskkill /f /pid %%a >nul 2>&1
)
echo [Canopy] Services stopped cleanly.
