# Project context — keep this up to date with your team

## Event

Enterprise AI facilitates a two-day internal hackathon for ten participants in two independent teams of five. Participants are mostly nontechnical and use Windows 11 virtual desktops, VS Code, and GitHub Copilot. Each team develops its own interpretation of a PFE assistant.

## Agreed team scope

- Standalone React frontend and FastAPI backend. No NEXUS dependency.
- SaskTel-branded corporate styling with the user-supplied logo and the product name **PFE Made Easy**.
- A PFE-only employee workspace with Dashboard, Goals, Accomplishments, Refine, History, and PFE Draft.
- Branded demo login with Employee, Manager, and Admin role selections. The username and password fields accept any entered details; this is not authentication or access control.
- Fictional employee data and browser-local create/edit/delete workflows for goals and accomplishments.
- Deterministic PFE completion progress that is never presented as a performance score.
- Browser-local reminder configuration with no email delivery.
- Color-coded dashboard and automatic in-app month-end reminders when fewer than 10 calendar days remain; real email delivery remains deferred.
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
- Which features are intentionally deferred? Real sign-in/authorization, real manager workflows or cross-user data, shared storage, real notifications and calendar invites, Foundry/AI, source connectors, uploads, and cloud deployment.

## Completed prototype features

- PFE employee navigation and responsive SaskTel-styled screens.
- Versioned browser-local PFE store with fictional profile and 2026-2027 cycle data.
- Goal and accomplishment create/edit/delete workflows, relationships, filters, validation, and activity history.
- Deterministic completion dashboard and local reminder configuration.
- Dashboard cards use distinct accent colors. The month-end countdown uses the browser's local calendar: green with 10 or more days left, amber with 1–9 days left, and red on the last day. Today is not counted as a remaining day. The dashboard and reminder configuration show matching in-app prompts independently of the saved demo schedule. The countdown refreshes every minute and when the window regains focus; it resets for the new month and does not run notifications while the app is closed.
- Clearly labeled simulated refinement that requires employee acceptance.
- Evidence-grounded editable draft, Save as Draft, simulated locked submission, and new revision workflow.
- Document-style employee PFE draft with general information and matching section headings; included accomplishments appear automatically in their selected draft section. Manager ratings and decisions remain out of scope.
- Section-by-section employee comments with explicit edit, save, and cancel controls; manager comments display read-only with an empty state when none are provided. Signatures and policy acknowledgements are identified but not collected.
- PFE Draft includes local zoom controls (70%–130%) with reset; zoom affects only the document preview.
- Submitted-version and activity history.
- Fictional Manager demo with team/evidence views, review queue and separate sample feedback, role-filtered candidate goals, and a meeting preview. All Manager demo changes reset on refresh and are not shared.
- Demo login routes Employee to the six employee pages, Manager to the Manager demo, and Admin to a placeholder. Signing out returns to role selection. Credentials are not checked or saved; selecting a role does not restrict direct access or authorize data.
- Shared header notification dropdown shows local workspace guidance on employee pages and the fictional sample evidence awaiting review on the Manager demo. The badge reflects the displayed item count; clicking a Manager item opens the sample review queue. This is in-app demo UI only, not a notification service.
- API greeting and health endpoint remain available as backend examples.
- Windows setup/start helpers, beginner guide, and optional deployment files.

## Prototype limitations

PFE data is available only in the same browser and origin. Clearing browser data removes it, and data does not move between localhost, a deployed URL, devices, or users. “Submitted to Manager” is a local workflow simulation and sends nothing. Manager comments have no manager-side source or editing workflow; the draft displays supplied comments read-only and otherwise says none were provided. Signature and policy acknowledgement workflows, manager ratings, and employment decisions are not collected. Reminder schedules send no email. Source labels do not connect to external systems. The demo profile is not authentication, so this prototype must not contain real employee information.

The Manager demo uses separate fictional sample data. Its review actions and goal edits exist only in component state and reset on refresh; they do not change employee data or create real approvals. The meeting planner prepares a preview but does not connect to Teams/Outlook or send invitations. Its sample manager identity is not authentication or authorization. The header notification dropdown is also local UI: employee items reflect browser-local workspace state, Manager items reflect fictional sample evidence, and no external alerts are sent.

The branded login is a navigation demo only. It accepts arbitrary non-empty username and password values and does not validate, store, or transmit them. Role-based navigation is not security or access control; all prototype data remains fictional and local.

## Repository cleanup

The old NEXUS template and historical event-planning assets have been removed from the current starter. They remain recoverable in earlier Git commits. Use this document for current scope.

## Brand assets

The supplied logo is preserved unchanged at `frontend/src/assets/sasktel-logo.png`. `SaskTelLogo.jsx` frames its transparent margins with CSS. Blue, charcoal, and white form the corporate visual direction; this is a prototype treatment, not a claim of approved brand-guideline compliance.
