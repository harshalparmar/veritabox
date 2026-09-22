#!/bin/bash
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
kill_port 5000
kill_port 5173
sleep 1
trap 'echo ""; echo "Shutting down servers..."; kill %1 2>/dev/null; kill %2 2>/dev/null; echo "Goodbye!"; exit 0' SIGINT
cd backend
npm run dev &
BACKEND_PID=$!
cd ..
sleep 3
cd frontend
npm run dev &
FRONTEND_PID=$!
cd ..

wait
