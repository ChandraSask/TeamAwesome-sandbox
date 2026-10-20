# Facilitator guide

## Before participants arrive

Provide each team with its own copy of this starter and deployment destination. Decide the team's Git collaboration workflow during onboarding; the two teams do not need to coordinate with each other.

On the actual Windows 11 VM image, install Node.js 22 LTS, Python 3.12 with the `py` launcher, Git, VS Code, and GitHub Copilot access. Verify package downloads through the corporate network. No Docker, WSL, VS Code Live Server, or Azure credentials are needed for local work.

Run this dry run using a participant account:

1. Extract a clean copy into a writable folder (including a path with spaces).
2. Run the setup commands in `README.md`, then run `npm run dev` from `frontend/`.
3. Open the local URL and confirm the PFE Dashboard loads.
4. Edit `appConfig.js`, refresh, and confirm the update.
5. Save a fictional goal and accomplishment, refresh, remove them, and confirm the empty states.
6. Press Ctrl+C and confirm a second launch works without port conflicts.
7. Run the read-only setup checker and confirm Copilot reads the repository instructions.

The frontend compiler is WebAssembly-based and does not execute downloaded native build binaries. The commands avoid PowerShell activation and execution-policy changes.

## Local architecture

```text
Browser → WebAssembly dev server :5173 → /api proxy → FastAPI :8000
              React                              Python routes

Azure: Browser → Container App :8000 → FastAPI
                                      ├─ /api/*
                                      ├─ /healthz
                                      └─ built React files
```

React and FastAPI are retained. A small WebAssembly-based Node script replaces native frontend build executables and the old NEXUS-specific Webpack/module-federation build; plain CSS replaces the previous theme stack. One container keeps the day-two deployment small. No database, authentication, AI, or storage service is required by the starter.

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

Supply resource names privately when available. Use managed identity for registry pulls; do not give participants registry passwords or put credentials in a ZIP. Foundry can be introduced through the backend later. Any shared persistent data needs an explicit storage decision; the PFE workspace is deliberately only a browser-local example.

## Historical material

The old NEXUS template, handoff, video, PDF checklist, and PDF generator are removed from the active starter. They remain recoverable from earlier Git commits. Current scope is recorded in PROJECT_CONTEXT.md.
