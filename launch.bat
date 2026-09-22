@echo off
setlocal

echo.
echo ╔══════════════════════════════════════════════╗
echo ║      🚀  VeritaBox Platform Launcher            ║
echo ╚══════════════════════════════════════════════╝
echo.

:: ── 1. Kill anything holding our ports ───────────────────────
echo 🧹 Clearing ports 5000 ^& 5173...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5000 "') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5173 "') do taskkill /F /PID %%a >nul 2>&1
echo    Port cleanup done.
echo.

:: ── 2. Boot Backend ──────────────────────────────────────────
echo ⚡ Starting Backend  (Express + MongoDB)...
start "VeritaBox — Backend" cmd /k "cd /d %~dp0backend && npm run dev"
echo    Backend window opened.
echo.

:: Brief pause so MongoDB can connect before frontend loads
timeout /t 2 /nobreak >nul

:: ── 3. Boot Frontend ─────────────────────────────────────────
echo 🌐 Starting Frontend (Vite + React/TS)...
start "VeritaBox — Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"
echo    Frontend window opened.
echo.

:: ── 4. Summary ───────────────────────────────────────────────
echo ╔══════════════════════════════════════════════╗
echo ║  ✅  Both servers are running!               ║
echo ║                                              ║
echo ║  📡 Backend  → http://localhost:5000         ║
echo ║  🖥️  Frontend → http://localhost:5173         ║
echo ║  🩺 Health   → http://localhost:5000/api/health ║
echo ║                                              ║
echo ║  Close the two new windows to stop servers   ║
echo ╚══════════════════════════════════════════════╝
echo.
pause
