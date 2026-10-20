# Build one small feature

Use this workflow with Copilot. Follow AGENTS.md and PROJECT_CONTEXT.md.

1. Read project context and SESSION_HANDOFF.md. Explain the current state briefly.
2. Ask what the user should be able to do. Clarify missing business rules, data location, and what should happen after refresh. Do not invent answers.
3. Describe the smallest complete change and the files involved. Avoid adding services or libraries unless needed.
4. Before editing, help the participant create a Git checkpoint using CHECKPOINTS.md. Never discard existing work automatically.
5. Implement the agreed change with loading, empty, validation, and failure states where relevant.
6. Run the relevant checks and manually try the changed journey. Report checks that cannot be run honestly.
7. Update PROJECT_CONTEXT.md for agreed decisions and SESSION_HANDOFF.md for current progress.
8. Explain what changed, where to see it, and one next step in plain language.

## A feature is ready to demonstrate when

- A user can complete the intended action and see its result.
- Refresh behavior matches the agreed storage choice.
- Invalid input or a failed request produces a helpful message.
- The team knows what is fictional, simulated, local, or shared.
- No secrets or real employee data were added.
- The relevant build/checks pass, or remaining limitations are clearly recorded.
