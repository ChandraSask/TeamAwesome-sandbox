# Starter verification

Checked during starter preparation on macOS and the managed Windows VM:

- Clean frontend dependency install and WebAssembly production build passed on Windows without invoking blocked native executables.
- Development and production previews served the React UI and proxied successful API requests on Windows.
- npm audit reported no known vulnerabilities in the installed frontend dependency tree.
- Two backend tests passed: health/greeting, name validation, and unknown API route behavior.
- Python dependency consistency check passed.
- Browser: notes save, persist after refresh, and remove; blank notes cannot be saved.
- Browser: API failure message with backend stopped, successful greeting with backend running.
- Built React UI served by FastAPI and greeting worked on port 8000.
- Narrow and desktop layouts inspected; desktop document had no horizontal overflow.
- Shared Python launcher starts both servers, waits for readiness, and stops/restarts cleanly on macOS.
- Deployment Bash syntax checked. No Azure commands were executed.

Still required on the facilitator's environment:

- Install the required Python 3.12 runtime and repeat the full README setup from a clean participant account; the current Windows verification used Python 3.11 because 3.12 is not installed.
- Run the PowerShell source packaging helper and inspect the ZIP.
- Build the Docker image (Docker is unavailable on the preparation machine).
- Configure the existing Azure Container App/registry, build/deploy from Cloud Shell, and verify the revision and greeting.

The backend test run emitted a third-party Starlette/AnyIO deprecation warning; the tests passed. No Foundry, real sign-in, or shared-data integration is present or claimed as tested.

## PFE employee MVP verification

Checked on the managed Windows VM after the PFE Made Easy change:

- Frontend WebAssembly production build passed.
- Local development URL returned HTTP 200.
- Both existing FastAPI tests passed under Python 3.12 after the declared development requirements were installed.
- The backend test run still emits the known Starlette `httpx` deprecation warning.
- Source and UI wording explicitly identify browser-local data, fictional profile/content, simulated refinement, no reminder delivery, and no manager notification.

Still required:

- Complete a facilitator-observed browser walkthrough covering goal and accomplishment CRUD, filtering, refresh persistence, reminder configuration, refinement acceptance/rejection, draft saving, simulated submission, locked history snapshot, new revision, validation, empty states, and narrow layout.
- Repeat the clean participant-account dry run with the updated PFE journey.
