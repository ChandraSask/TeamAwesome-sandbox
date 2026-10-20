# TeamAwesome

Team 1 demo

**Start with a working app. Make it your team's own.**

This repository is the starting folder for our two-day internal hackathon, supported by Enterprise AI. It gives you a simple performance-and-development workspace so you can focus on your idea instead of setting everything up from scratch.

You do not need to understand every file. Start the app, make one small change, and build from there with your facilitator and GitHub Copilot.

## 1. Get your copy

Your facilitator will tell you which team repository to use and where to save it on your Windows 11 virtual desktop.

- If you download a ZIP from GitHub, right-click it and choose **Extract All** before opening anything.
- If your facilitator helps you clone the repository, use that folder directly.
- In VS Code, choose **File → Open Folder** and open the whole starter folder—the one containing this README.

Your desktop needs **Node.js 22**, **Python 3.12 with the Python launcher**, **Git**, **VS Code**, and access to **GitHub Copilot**. Ask your facilitator to provide these. You do not need Docker or Azure credentials to start building locally.

## 2. Open the app

Open **Terminal → New Terminal** in VS Code. Run these setup commands once from the repository folder:

```powershell
py -3.12 -m venv backend\.venv
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements-dev.txt
npm ci --prefix frontend
```

Start the app whenever you want to work:

```powershell
cd frontend
npm run dev
```

Keep this terminal open and visit **http://127.0.0.1:5173**. To stop the app, return to the terminal and press **Ctrl+C**.

The starter uses a WebAssembly frontend compiler so it works on managed Windows computers that block downloaded native executables. If an error appears, leave it visible and show it to your facilitator. Do not start extra copies. You do not need VS Code's Live Server extension.

## 3. Try what already works

- **Home:** a welcome page and links to the workspace.
- **Dashboard:** fictional goals, accomplishments, and learning activities. Try filtering goals by their status.
- **My notes:** write and remove a reflection. Refresh the browser to see that it stays saved there.
- **About:** explains the example. Expand **Starter connection example** and click **Try a greeting** to call the Python backend.

The SaskTel logo and styling are included. The name **My App**, words, colors, and example content are yours to change.

### What is an example, and what is saved?

| Part | How it works today |
| --- | --- |
| Dashboard records | Fictional, read-only examples in a JavaScript file. They are not employee records from a live system. |
| Notes | Saved in this browser only. They survive refresh, but are not shared with teammates or saved by the backend. Clearing browser data can remove them. |
| Demo profile | A fictional name on screen. There is no real sign-in. |
| Backend | A working greeting and health check. There is no database or backend save flow yet. |
| AI assistance inside the app | Not connected yet. Your facilitator can help add Foundry later. |

Use fictional information throughout the hackathon. Appraisal forms, manager workflows, real authentication, and shared storage are features your team can discuss—not finished functionality in this starter.

## 4. Make your first change

1. Open [frontend/src/appConfig.js](frontend/src/appConfig.js) in VS Code.
2. Change **My App** to your team's chosen app name.
3. Save the file.
4. Look at the browser. The name updates automatically.

For help, open Copilot Chat and ask:

> Read AGENTS.md, docs/PROJECT_CONTEXT.md, and docs/SESSION_HANDOFF.md. Help me change the welcome message. Explain which file you changed and how I can see the result.

## 5. Build your idea one small feature at a time

1. **Choose a person and a problem.** Who are you helping, and what do they need to do?
2. **Choose one demo journey.** For example: record an accomplishment and find it again. Start with one complete action.
3. **Describe the result.** What will someone click, enter, and see? Should the result survive refresh or be shared with others?
4. **Save a working checkpoint.** Follow the [checkpoint guide](docs/CHECKPOINTS.md) before a bigger change.
5. **Ask Copilot for the smallest complete change.** Let it clarify missing decisions before building.
6. **Try it yourself.** Check the happy path, empty input, and what happens when a request fails. Ask it to run the relevant build/checks.
7. **Record progress.** Update the [session handoff](docs/SESSION_HANDOFF.md) so the next person or chat can continue.

A useful request to Copilot:

> Help us add [small feature]. The user should be able to [action] and then see [result]. Read our project context and follow the build playbook. Ask us about missing business rules and where data should be saved before implementing it.

For a five-person team, one person can drive the code while others define the journey, check wording, try the feature, and prepare the demo. Agree who is editing a file before making simultaneous changes.

**Aim for one useful journey that works from start to finish.** A two-day prototype does not need every feature or a production-ready system.

## 6. Understand the technology

| Technology | Plain-language purpose | Where you will see it |
| --- | --- | --- |
| **React + JavaScript** | Builds the screens and responds to clicks and typing | `frontend/src/` |
| **CSS** | Controls colors, spacing, and layout | `frontend/src/styles.css` |
| **WebAssembly build tools** | Compile React without running downloaded native executables | `frontend/tooling.mjs` through npm commands |
| **Python + FastAPI** | Handles requests behind the scenes; this is where future shared-data or AI connections belong | `backend/app/` |
| **Git + GitHub** | Keeps versions of the code and lets your team share changes | VS Code Source Control and your team repository |
| **GitHub Copilot** | Helps you understand and change the code | VS Code; it is separate from an AI feature inside your app |
| **Azure Container Apps** | Hosts a packaged version of the app for the final demo | Facilitator-led deployment on day two |
| **Azure Container Registry** | Stores the packaged app image that Azure runs | Used by the deployment script |

### How the parts connect

```text
A person clicks something in the browser
                  ↓
       React displays the screen
                  ↓ when a feature needs the backend
       A request goes to FastAPI
                  ↓
       Python handles the request
                  ↓
       React displays the result
```

The greeting example shows this complete connection. Notes currently use browser storage instead. For a feature that must save shared data or call AI, agree the storage/service choice with your facilitator first. Keep service credentials out of the frontend.

## 7. Find the right file

| I want to… | Start here |
| --- | --- |
| Change the app name or welcome text | [appConfig.js](frontend/src/appConfig.js) |
| Change navigation, Home, or About | [App.jsx](frontend/src/App.jsx) |
| Change the dashboard layout | [Dashboard.jsx](frontend/src/pages/Dashboard.jsx) |
| Change fictional goals and activities | [workspace.js](frontend/src/data/workspace.js) |
| Change notes and reflections | [Notes.jsx](frontend/src/components/Notes.jsx) |
| Change colors and spacing | [styles.css](frontend/src/styles.css) |
| Find the logo | [assets](frontend/src/assets/) |
| Send a request from the screen | [api.js](frontend/src/api.js) |
| Change the backend greeting | [hello.py](backend/app/routes/hello.py) |
| Add a backend route | [main.py](backend/app/main.py) and `backend/app/routes/` |

```text
frontend/       What people see and interact with
backend/        Python requests and application logic
deployment/     Packaging and Azure deployment instructions
docs/           Participant guides and team context
scripts/        Startup, setup checks, and packaging helpers
```

## 8. Help Copilot pick up where you left off

- [AGENTS.md](AGENTS.md): rules for coding assistants working in this repository.
- [.github/copilot-instructions.md](.github/copilot-instructions.md): repository guidance for Copilot.
- [Project context](docs/PROJECT_CONTEXT.md): agreed scope and team decisions.
- [Session handoff](docs/SESSION_HANDOFF.md): what works, what is unfinished, and the next step.
- [Build playbook](docs/BUILD_PLAYBOOK.md): the repeatable process for building and checking a feature.

These files help when the assistant reads them; they do not guarantee perfect memory. Ask a new chat to read the context and handoff before making changes. Keep those files short and current.

## 9. Share your demo on day two

Your facilitator will help package the app and deploy it using Azure Cloud Shell. The starter includes a Dockerfile and a script for an **existing** Container App and registry. Nothing deploys automatically.

You do not need to work through deployment to make your first changes. When ready, use the [deployment guide](deployment/README.md) with your facilitator.

## Need help?

- [Participant guide and troubleshooting](docs/PARTICIPANT_GUIDE.md)
- [Checkpoint and recovery guide](docs/CHECKPOINTS.md)
- [Facilitator setup and Windows dry run](docs/FACILITATOR_GUIDE.md)
- [What has been verified and what remains](docs/VERIFICATION.md)

**Facilitator note:** local build and browser checks have passed. The Windows launchers, source ZIP helper, and Azure deployment still need verification in the actual event environment before participants rely on them.
