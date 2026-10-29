#!/bin/bash
set -e
cd "$(dirname "$0")"
if [ ! -x backend/.venv/bin/uvicorn ] || [ ! -d frontend/node_modules ]; then
  echo "Install the backend and frontend dependencies first; see README.md."
  exit 1
fi
trap 'kill "$backend_pid" 2>/dev/null || true' EXIT INT TERM
(cd backend && exec .venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8765) &
backend_pid=$!
cd frontend
npm run dev -- --hostname 127.0.0.1
