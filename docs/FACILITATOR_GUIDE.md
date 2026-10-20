# Facilitator guide

## Before participants arrive

Provide each team with its own copy of this starter and deployment destination. Decide the team's Git collaboration workflow during onboarding; the two teams do not need to coordinate with each other.

On the actual Windows 11 VM image, install Node.js 22 LTS, Python 3.12 with the `py` launcher, Git, VS Code, and GitHub Copilot access. Verify package downloads through the corporate network. No Docker, WSL, VS Code Live Server, or Azure credentials are needed for local work.

Run this dry run using a participant account:

1. Extract a clean copy into a writable folder (including a path with spaces).
2. Run `SETUP.bat`, then `START.bat`.
3. Confirm the browser opens and **Try a greeting** succeeds.
4. Edit `appConfig.js` and confirm live updates.
5. Save a note, refresh, remove it, and confirm the empty state.
6. Press Ctrl+C and confirm a second launch works without port conflicts.
7. Confirm Copilot reads the repository instructions.

The scripts avoid PowerShell activation and execution-policy changes. If organizational policy blocks BAT or Python execution, resolve that through your VM administrator before the event.

## Local architecture

```text
Browser → Vite :5173 → /api proxy → FastAPI :8000
              React                  Python routes

Azure: Browser → Container App :8000 → FastAPI
                                      ├─ /api/*
                                      ├─ /healthz
                                      └─ built React files
```

React and FastAPI are retained. Vite replaces the NEXUS-specific Webpack/module-federation build; plain CSS replaces the previous theme stack. One container keeps the day-two deployment small. No database, authentication, AI, or storage service is required by the starter.

## Development on macOS/Linux

```bash
python3 -m venv backend/.venv
backend/.venv/bin/python -m pip install -r backend/requirements-dev.txt
npm ci --prefix frontend
backend/.venv/bin/python scripts/dev.py
```

## Checks

From `frontend/`: `npm run build`.

From `backend/`, using its environment: `python -m pip install -r requirements-dev.txt`, then `python -m pytest`.

With Docker available, from the repository root:

```bash
docker build -f deployment/Dockerfile -t hackathon-starter .
docker run --rm -p 8000:8000 hackathon-starter
```

Open http://localhost:8000 and test the greeting. `/healthz` is the health endpoint. The container runs as a non-root user. `/docs` exposes the small FastAPI reference for development/demo use.

## Day two

Follow [deployment/README.md](../deployment/README.md). Prepare the existing Container App, registry pull permissions, ingress target port 8000, and participant access before the event. The helper updates an existing app; it does not create infrastructure or configure identity.

Supply resource names privately when available. Use managed identity for registry pulls; do not give participants registry passwords or put credentials in a ZIP. Foundry can be introduced through the backend later. Any shared persistent data needs an explicit storage decision; browser notes are deliberately only a local example.

## Historical material

The old NEXUS template, handoff, video, PDF checklist, and PDF generator are removed from the active starter. They remain recoverable from earlier Git commits. Current scope is recorded in PROJECT_CONTEXT.md.
