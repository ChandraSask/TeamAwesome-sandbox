# Build your first small change

## Start and stop

Follow the one-time setup commands in `README.md`. Whenever you want to work, open VS Code's terminal, run `cd frontend`, then `npm run dev`. Keep the terminal open. To stop both services, press Ctrl+C there.

The app is at http://127.0.0.1:5173. Save a React or CSS file, then refresh the browser to see the change. Python changes restart the backend automatically.

## A first ten minutes

1. Open the whole repository folder in VS Code.
2. Change the app name and welcome words in `frontend/src/appConfig.js`.
3. Change `--accent` and related colors in `frontend/src/styles.css` with Copilot's help.
4. Open **My notes**, save a fictional note, and refresh. The note stays in this browser.
5. In **About**, expand **Starter connection example** and click **Try a greeting**. The response comes from Python.

## Tell Copilot what you want

Describe a small visible outcome, not the entire app in one request.

> Read AGENTS.md and docs/PROJECT_CONTEXT.md. Change the app name to [name] and make the welcome message [message]. Keep everything else working.

> Add a new page called [name] with [fields]. Ask me what should happen when I save before choosing where to store it.

> Explain how the greeting travels from the button to Python. Show me the two files I would change.

> We agreed that [decision]. Update docs/PROJECT_CONTEXT.md so the next coding session remembers it.

These files give the assistant context; they do not guarantee perfect memory. Start a new chat by asking it to read them.

## Your map

| I want to change… | Start here |
| --- | --- |
| Name, greeting, welcome text | `frontend/src/appConfig.js` |
| Pages and navigation | `frontend/src/App.jsx` |
| Colors, spacing, layout | `frontend/src/styles.css` |
| Dashboard screen | `frontend/src/pages/Dashboard.jsx` |
| Fictional goals and development data | `frontend/src/data/workspace.js` |
| Notes example | `frontend/src/components/Notes.jsx` |
| Reusable card | `frontend/src/components/Card.jsx` |
| Request from the browser | `frontend/src/api.js` |
| Python greeting | `backend/app/routes/hello.py` |
| Register a new API route | `backend/app/main.py` |

## If something goes wrong

| What you see | What to do |
| --- | --- |
| Setup asks for Node/Python | Ask your facilitator to install the required tools. |
| Package download fails | Keep the error visible; ask the facilitator to check corporate network/package access. |
| Port already in use | Stop the previous launcher with Ctrl+C. Do not keep opening new launchers. |
| Greeting cannot connect | Check the launcher for a backend error, fix it, then try again. |
| Changes do not appear | Save the file; check the launcher is running; refresh the browser. |
| Notes disappear on another device | Expected: notes are local to this browser and address. They are not shared. |
| Browser says storage cannot save | Copy your note somewhere safe and ask your facilitator to check browser storage settings. |

Use fictional information. The demo user is just a label, and anyone who can reach the deployed app can use its public endpoints.

## Show your idea

Pick one complete journey. Demonstrate what someone enters, what happens, and the result they get. Explain what is real, what is simulated, and what you would build next.
