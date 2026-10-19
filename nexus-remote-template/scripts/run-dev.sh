#!/usr/bin/env bash
# Launch BOTH halves locally: the API (developer mode) and the UI.
#
#   ./scripts/run-dev.sh        UI  http://localhost:3001   API  http://127.0.0.1:8080
#
# Ctrl+C stops both. Pick a role from the drop-down on the Home page — no Entra ID
# needed. Run the halves separately with ./scripts/run-backend.sh and ./scripts/run-ui.sh if you
# want their logs in different terminals.
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"  # the scripts/ folder
PORT="${API_PORT:-8080}"
export API_PORT="$PORT"

"$HERE/run-backend.sh" &
BACKEND_PID=$!
trap 'kill "$BACKEND_PID" 2>/dev/null || true' EXIT INT TERM

# Wait (up to ~30s) for the API so the UI's first "Check with backend" works.
for _ in $(seq 1 60); do
  if curl -fs "http://127.0.0.1:${PORT}/healthz" >/dev/null 2>&1; then break; fi
  if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
    echo "ERROR: the backend exited — see its output above." >&2
    exit 1
  fi
  sleep 0.5
done

API_BASE="http://127.0.0.1:${PORT}" "$HERE/run-ui.sh" "$@"
