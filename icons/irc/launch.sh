#!/bin/bash

# ═══════════════════════════════════════════════════════════
#   VeritaBox Platform — Launch Script
#   Backend  : Express + MongoDB  → http://localhost:5000
#   Frontend : Vite + React/TS    → http://localhost:5173
# ═══════════════════════════════════════════════════════════

echo ""
echo "╔══════════════════════════════════════════════╗"
echo "║      🚀  VeritaBox Platform Launcher            ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# ── 1. Kill anything still holding our ports ─────────────────
# Works on Git Bash / WSL / Linux / macOS
kill_port() {
  local PORT=$1
  # Try lsof first (Linux/macOS/WSL with lsof installed)
  if command -v lsof &>/dev/null; then
    local PID
    PID=$(lsof -ti tcp:$PORT 2>/dev/null)
    if [ -n "$PID" ]; then
      echo "   Killing PID $PID on port $PORT..."
      kill -9 $PID 2>/dev/null || true
    fi
  fi
  # Also try fuser as fallback
  if command -v fuser &>/dev/null; then
    fuser -k ${PORT}/tcp 2>/dev/null || true
  fi
}

echo "🧹 Clearing ports 5000 & 5173..."
kill_port 5000
kill_port 5173
sleep 1
echo "   ✔ Ports free"
echo ""

# ── 2. Trap Ctrl+C → gracefully kill both servers ────────────
trap 'echo ""; echo "🛑 Shutting down servers..."; kill %1 2>/dev/null; kill %2 2>/dev/null; echo "👋 Goodbye!"; exit 0' SIGINT

# ── 3. Boot Backend ──────────────────────────────────────────
echo "⚡ Starting Backend  (Express + MongoDB)..."
cd backend
npm run dev &
BACKEND_PID=$!
cd ..
echo "   ✔ Backend PID: $BACKEND_PID"
echo ""

# Give the backend 3s head-start so MongoDB connects before frontend boots
sleep 3

# ── 4. Boot Frontend ─────────────────────────────────────────
echo "🌐 Starting Frontend (Vite + React/TS)..."
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..
echo "   ✔ Frontend PID: $FRONTEND_PID"
echo ""

# ── 5. Summary ───────────────────────────────────────────────
echo "╔══════════════════════════════════════════════╗"
echo "║  ✅  Both servers are running!               ║"
echo "║                                              ║"
echo "║  📡 Backend  → http://localhost:5000         ║"
echo "║  🖥️  Frontend → http://localhost:5173         ║"
echo "║  🩺 Health   → http://localhost:5000/api/health║"
echo "║                                              ║"
echo "║  Press  Ctrl+C  to stop everything           ║"
echo "╚══════════════════════════════════════════════╝"
echo ""

# Keep script alive until Ctrl+C
wait
