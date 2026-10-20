# Starter verification

Checked during starter preparation on macOS:

- Clean frontend dependency install and production build passed.
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

- Run SETUP.bat and START.bat on the actual Windows 11 VM, including corporate package access and Ctrl+C cleanup.
- Run the PowerShell source packaging helper and inspect the ZIP.
- Build the Docker image (Docker is unavailable on the preparation machine).
- Configure the existing Azure Container App/registry, build/deploy from Cloud Shell, and verify the revision and greeting.

The backend test run emitted a third-party Starlette/AnyIO deprecation warning; the tests passed. No Foundry, real sign-in, or shared-data integration is present or claimed as tested.
