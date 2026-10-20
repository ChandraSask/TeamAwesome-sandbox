# Project context — keep this up to date with your team

## Event

Enterprise AI facilitates a two-day internal hackathon for ten participants in two independent teams of five. Participants are mostly nontechnical and use Windows 11 virtual desktops, VS Code, and GitHub Copilot. Each team develops its own interpretation of a PFE assistant.

## Agreed starter scope

- Standalone React frontend and FastAPI backend. No NEXUS dependency.
- SaskTel-branded corporate styling with the user-supplied logo, while keeping “My App” as an editable app name. Participants choose the content, design, and workflows.
- Home, Dashboard, My notes, and About. A basic performance/development starting point, without a finished appraisal workflow.
- Read-only fictional goals, accomplishments, and learning activities; dashboard goal filtering.
- Browser-only reflections and an API greeting example under About.
- Fictional demo profile and data. No real sign-in or authorization claims.
- No Foundry integration now; the facilitator will help later.
- No cloud resources created or deployed as part of starter preparation.
- Day-two hosting: an existing Azure Container App and registry, configured by the facilitator. Cloud Shell builds the image remotely; participants do not need Docker on their VMs.

## How it currently works

React uses Vite for local development. `/api` requests go through Vite to FastAPI. For deployment, a multi-stage Dockerfile builds React and copies it into the Python image. FastAPI serves both the built frontend and API on port 8000. There is no database. Notes persist only in the current browser's localStorage and are not sent to FastAPI.

## Decisions for your team

Fill these in together; ask the participant rather than inventing answers.

- Team name: not chosen
- App name: My App (placeholder)
- Who are we helping?
- What is the one journey we will demonstrate?
- What does a successful demo show?
- Which features are intentionally deferred?

## Completed starter features

- Home, Dashboard, My notes, and About screens with SaskTel styling.
- Fictional dashboard examples in `frontend/src/data/workspace.js`; dashboard UI in `frontend/src/pages/Dashboard.jsx`.
- Add/remove local notes and show helpful empty/error states.
- API greeting and health endpoint.
- Windows setup/start helpers, beginner guide, and optional deployment files.

## Repository cleanup

The old NEXUS template and historical event-planning assets have been removed from the current starter. They remain recoverable in earlier Git commits. Use this document for current scope.

## Brand assets

The supplied logo is preserved unchanged at `frontend/src/assets/sasktel-logo.png`. `SaskTelLogo.jsx` frames its transparent margins with CSS. Blue, charcoal, and white form the corporate visual direction; this is a prototype treatment, not a claim of approved brand-guideline compliance.
