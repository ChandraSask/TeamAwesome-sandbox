#!/usr/bin/env bash
# Rename the template to your app, keeping the three MF values in lock-step.
#
#   ./scaffold.sh <app-id> <mf-scope> <exposed-key>
#
# Example:
#   ./scaffold.sh myapp myAppRemote ./App
#
#   <app-id>      slug used for tile id / container app base name (e.g. "intake")
#   <mf-scope>    webpack MF `name` == host remotes.json ".scope"  (e.g. "intakeRemote")
#   <exposed-key> exposed module key == host remotes.json ".module" (default "./App")
set -euo pipefail

APP_ID="${1:?Usage: ./scaffold.sh <app-id> <mf-scope> [exposed-key]}"
MF_SCOPE="${2:?Usage: ./scaffold.sh <app-id> <mf-scope> [exposed-key]}"
EXPOSED_KEY="${3:-./App}"

echo "→ app-id      : $APP_ID"
echo "→ mf-scope    : $MF_SCOPE"
echo "→ exposed-key : $EXPOSED_KEY"
echo

# Portable in-place sed (macOS BSD sed vs GNU sed).
sedi() {
  if sed --version >/dev/null 2>&1; then sed -i "$@"; else sed -i '' "$@"; fi
}

# 1) webpack MF name + exposed key
sedi "s|const MF_NAME = 'myAppRemote'|const MF_NAME = '${MF_SCOPE}'|" ui/webpack.config.js
sedi "s|const MF_EXPOSED_KEY = './App'|const MF_EXPOSED_KEY = '${EXPOSED_KEY}'|" ui/webpack.config.js

# 2) standalone bootstrap serviceId
sedi "s|serviceId=\"myapp\"|serviceId=\"${APP_ID}\"|" src/bootstrap.jsx 2>/dev/null || \
sedi "s|serviceId=\"myapp\"|serviceId=\"${APP_ID}\"|" ui/src/bootstrap.jsx

# 3) package names
sedi "s|\"name\": \"nexus-remote-ui\"|\"name\": \"${APP_ID}-ui\"|" ui/package.json

echo "✓ Scaffolded. Next steps:"
cat <<EOF

  1. cd ui && npm install && npm run build
  2. cd backend && python -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt
  3. Deploy both to Container Apps (${APP_ID}-ui, ${APP_ID}-be)
  4. In the HOST repo, add this to src/config/remotes.json:

     {
       "id": "${APP_ID}",
       "scope": "${MF_SCOPE}",
       "module": "${EXPOSED_KEY}",
       "origin": "https://ca-demo-${APP_ID}-ui.<suffix>.canadaeast.azurecontainerapps.io",
       "entryPath": "/remoteEntry.js",
       "authScope": "api://<client-id>/access_as_user",
       "healthPath": "/",
       "connectOrigins": [
         "https://ca-demo-${APP_ID}-be.<suffix>.canadaeast.azurecontainerapps.io"
       ]
     }

  5. In the HOST repo:  npm run seed:tiles && (deploy host) && npm run check:tiles
EOF
