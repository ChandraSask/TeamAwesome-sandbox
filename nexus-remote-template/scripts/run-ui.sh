#!/usr/bin/env bash
# Launch the remote UI locally (webpack dev server).
#
# Usage:
#   ./scripts/run-ui.sh                 # install deps if needed, serve on :3001
#   ./scripts/run-ui.sh --open          # also open the browser
#   PORT=3005 ./scripts/run-ui.sh       # custom port
#   API_BASE=https://host ./scripts/run-ui.sh
#
# Optional env (baked in at build time by webpack DefinePlugin):
#   API_BASE   backend origin           (default: http://localhost:8080)
#   API_SCOPE  backend Token B scope
#   MSAL_CLIENT_ID / MSAL_AUTHORITY / MSAL_REDIRECT_URI   standalone auth
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"  # repo root (this file lives in scripts/)
UI_DIR="$ROOT/ui"
PORT="${PORT:-3001}"
OPEN=false
for arg in "$@"; do
  case "$arg" in
    --open) OPEN=true ;;
    -h|--help) sed -n '2,13p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg" >&2; exit 1 ;;
  esac
done

# Node >= 20 (see ui/package.json "engines")
if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: node is not installed (need >= 20)." >&2
  exit 1
fi
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo "ERROR: Node $(node -v) found; need >= 20." >&2
  exit 1
fi

cd "$UI_DIR"

if [ ! -d node_modules ]; then
  echo "==> Installing dependencies (npm ci)…"
  npm ci
fi

export API_BASE="${API_BASE:-http://localhost:8080}"

echo "==> Starting UI on http://localhost:${PORT}  (API_BASE=${API_BASE})"
echo "    remoteEntry: http://localhost:${PORT}/remoteEntry.js"

ARGS=(--port "$PORT")
if [ "$OPEN" = true ]; then ARGS+=(--open); fi

exec npx webpack serve --mode development "${ARGS[@]}"
