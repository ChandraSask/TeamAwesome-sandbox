# Instructions for coding assistants

Read `docs/PROJECT_CONTEXT.md` before making changes. This is a two-day internal hackathon starter for nontechnical participants supported by Enterprise AI. Each team builds its own prototype.

## How to help

- Explain changes in plain language and name the file the participant can edit next.
- Make small, complete changes. Ask about unclear business rules instead of inventing a PFE process.
- Keep React + JavaScript, plain CSS, and FastAPI. Prefer existing components over new libraries.
- Keep UI words friendly. Do not put infrastructure instructions, credentials, or developer controls into product screens.
- Do not implement ratings, employment decisions, or invented enterprise integrations.
- Use fictional information only. The demo profile is not authentication.
- AI/Foundry, organizational sign-in, shared persistence, and additional Azure services are deferred until the facilitator explicitly requests them.
- Do not add NEXUS, module federation, Entra, GitLab CI, or production architecture by default.
- Never place secrets in frontend code, source control, logs, or documentation.

## Structure and checks

- Easy text edits: `frontend/src/appConfig.js`; layout: `frontend/src/App.jsx`; colors: `frontend/src/styles.css`.
- Reusable UI: `frontend/src/components/`; browser API requests: `frontend/src/api.js`.
- API routes: `backend/app/routes/`; register them in `backend/app/main.py` before the static file mount.
- Development uses Vite on 5173 proxying `/api` to FastAPI on 8000. Deployment serves the built frontend and API from one container on 8000.
- Notes use browser localStorage only. Explain this limitation if modifying them.
- Build the frontend with `npm ci && npm run build` in `frontend/`.
- Backend checks: install `backend/requirements-dev.txt`, then run `python -m pytest` from `backend/` using its virtual environment.
- Verify the changed user journey, including loading/error states for API calls. Do not claim Windows or Azure checks passed unless actually run there.
- Update `docs/PROJECT_CONTEXT.md` with agreed decisions and new capabilities, not speculative plans or secrets. Update guides when commands change.
- Deployment is facilitator-led. Do not deploy or create cloud resources unless explicitly requested.

## Participant build workflow

Follow `docs/BUILD_PLAYBOOK.md` for feature work. Read and update `docs/SESSION_HANDOFF.md` at session boundaries. Help participants use `docs/CHECKPOINTS.md` before larger edits; never discard work automatically. `CHECK-SETUP.bat` runs the read-only setup checker.
