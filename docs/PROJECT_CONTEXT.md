# Project context — keep this up to date with your team

## Event

Enterprise AI facilitates a two-day internal hackathon for ten participants in two independent teams of five. Participants are mostly nontechnical and use Windows 11 virtual desktops, VS Code, and GitHub Copilot. Each team develops its own interpretation of a PFE assistant.

## Agreed team scope

- Standalone React frontend and FastAPI backend. No NEXUS dependency.
- SaskTel-branded corporate styling with the user-supplied logo and the product name **PFE Made Easy**.
- A PFE-only employee workspace with Dashboard, Goals, Accomplishments, Refine, History, and PFE Draft.
- Fictional employee data and browser-local create/edit/delete workflows for goals and accomplishments.
- Deterministic PFE completion progress that is never presented as a performance score.
- Browser-local reminder configuration with no email delivery.
- Deterministic, fact-preserving demo wording suggestions. No AI service is connected.
- Browser-local draft saving, simulated submission snapshots, and editable new revisions.
- Fictional demo profile and data. No real sign-in or authorization claims.
- No Foundry integration now; the facilitator will help later.
- No cloud resources created or deployed as part of starter preparation.
- Day-two hosting: an existing Azure Container App and registry, configured by the facilitator. Cloud Shell builds the image remotely; participants do not need Docker on their VMs.

## How it currently works

React uses a small WebAssembly-based Node build server for local development, avoiding downloaded native executables that managed Windows policies may block. `/api` requests go through this server to FastAPI. `npm run dev`, `npm run build`, and `npm run preview` use the same tooling without batch files or Vite. For deployment, a multi-stage Dockerfile builds React and copies it into the Python image. FastAPI serves both the built frontend and API on port 8000. There is no database. The PFE workspace persists under a versioned `localStorage` key in the current browser and is not sent to FastAPI.

## Decisions for your team

Fill these in together; ask the participant rather than inventing answers.

- Team name: not chosen
- App name: PFE Made Easy
- Who are we helping? A fictional employee preparing their annual PFE.
- What is the one journey we will demonstrate? Capture goals and accomplishments throughout the year, prepare a draft, and create a simulated submitted version.
- What does a successful demo show? Saved local evidence contributes to transparent completion progress and an employee-controlled draft.
- Which features are intentionally deferred? Real sign-in/authorization, manager/admin interfaces, shared storage, real notifications, Foundry/AI, source connectors, uploads, and cloud deployment.

## Completed prototype features

- PFE employee navigation and responsive SaskTel-styled screens.
- Versioned browser-local PFE store with fictional profile and 2026-2027 cycle data.
- Goal and accomplishment create/edit/delete workflows, relationships, filters, validation, and activity history.
- Deterministic completion dashboard and local reminder configuration.
- Clearly labeled simulated refinement that requires employee acceptance.
- Evidence-grounded editable draft, Save as Draft, simulated locked submission, and new revision workflow.
- Document-style employee PFE draft with general information and matching section headings; included accomplishments appear automatically in their selected draft section. Manager ratings and decisions remain out of scope.
- Submitted-version and activity history.
- API greeting and health endpoint remain available as backend examples.
- Windows setup/start helpers, beginner guide, and optional deployment files.

## Prototype limitations

PFE data is available only in the same browser and origin. Clearing browser data removes it, and data does not move between localhost, a deployed URL, devices, or users. “Submitted to Manager” is a local workflow simulation and sends nothing. Reminder schedules send no email. Source labels do not connect to external systems. The demo profile is not authentication, so this prototype must not contain real employee information.

## Repository cleanup

The old NEXUS template and historical event-planning assets have been removed from the current starter. They remain recoverable in earlier Git commits. Use this document for current scope.

## Brand assets

The supplied logo is preserved unchanged at `frontend/src/assets/sasktel-logo.png`. `SaskTelLogo.jsx` frames its transparent margins with CSS. Blue, charcoal, and white form the corporate visual direction; this is a prototype treatment, not a claim of approved brand-guideline compliance.
