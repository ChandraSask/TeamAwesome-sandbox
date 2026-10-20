# Save a working checkpoint

A Git commit is a local snapshot. It is not an Azure deployment or an automatic upload.

## Before a bigger change

1. Open the whole repo in VS Code and open **Source Control**.
2. Review the changed files. Do not include credentials, environment files, real employee data, or generated ZIPs.
3. Stage only the intended changes.
4. Enter a short description, such as “Working dashboard before adding a form”, and commit.
5. If Git asks for identity or the folder has no Git repository, ask the facilitator to help configure it. Do not invent an identity or switch repositories.

A checkpoint is local until pushed. Follow your facilitator's branch and push process. Avoid simultaneous edits to the same files; one driver at a time is a simple starting arrangement.

## When something breaks

Stop making more changes. Keep the error visible. Ask Copilot to compare the current changes with the last working commit and explain the smallest fix.

Do not click **Discard All Changes**, run a hard reset, force-push, or delete files as a troubleshooting shortcut. Ask the facilitator to help restore specific changes while preserving unfinished work. If a committed change needs undoing, a reviewed revert preserves history.

## Before changing drivers or closing a session

Save your files, run the changed journey, update SESSION_HANDOFF.md, and create a checkpoint. Tell the next person which branch contains the work and whether it has been pushed.
