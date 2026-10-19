#!/usr/bin/env bash
# Launch the backend API locally in DEVELOPER MODE (no Entra ID needed).
#
# Usage:
#   ./scripts/run-backend.sh              # http://127.0.0.1:8080
#   API_PORT=8090 ./scripts/run-backend.sh
#
# What "developer mode" means (APP_ENV=local):
#   A request with NO Authorization header is trusted as a dev persona, and the role
#   comes from the X-Dev-Role header that the UI's Home-page drop-down sends.
#   A request WITH a bearer token is always validated for real. The backend refuses to
#   boot with this on inside a container, so it cannot be deployed by accident.
#   (backend/app/roles.py)
#
# To test against REAL Entra tokens instead: APP_ENV=production plus
#   AAD_TENANT_ID, AAD_AUDIENCE and (optionally) AAD_GROUP_* — see INTEGRATION_GUIDE.md §8.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"  # repo root (this file lives in scripts/)
cd "$ROOT/backend"

PORT="${API_PORT:-8080}"
export APP_ENV="${APP_ENV:-local}"
# The standalone UI dev server (./scripts/run-ui.sh) runs on :3001.
export ALLOWED_ORIGINS="${ALLOWED_ORIGINS:-http://localhost:3001}"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is not installed (need 3.11+)." >&2
  exit 1
fi

if [ ! -d .venv ]; then
  echo "==> Creating virtualenv (backend/.venv)…"
  python3 -m venv .venv
fi

# Reinstall only when the requirements change.
STAMP=".venv/.requirements.sha"
SUM="$(cat requirements.txt requirements-dev.txt | shasum | cut -d' ' -f1)"
if [ ! -f "$STAMP" ] || [ "$(cat "$STAMP")" != "$SUM" ]; then
  echo "==> Installing dependencies…"
  .venv/bin/pip install --quiet --disable-pip-version-check -r requirements-dev.txt
  echo "$SUM" > "$STAMP"
fi

if [ "$APP_ENV" != "local" ]; then
  echo "NOTE: APP_ENV=$APP_ENV — the dev role picker will be REJECTED (401). Real tokens only."
fi

echo "==> Starting API on http://127.0.0.1:${PORT}  (APP_ENV=${APP_ENV})"
echo "    try: curl -s -H 'X-Dev-Role: role_1' http://127.0.0.1:${PORT}/api/me"

exec .venv/bin/python -m uvicorn app.main:app --reload --host 127.0.0.1 --port "$PORT"
