---
description: Start a live log for this task on discerns so teammates and other Claude sessions can watch
argument-hint: [log title]
---

Start narrating this task to a live log on discerns.

1. Resolve the project from the repo's git remote and call `save_item` with `kind: "log"`, `project`, and the title `$ARGUMENTS` (default: a short description of the current task). Give the user the URL immediately so they can open it.
2. From now on, after every meaningful step in this task, call `append_log` with what you ran, what happened, and any error, verbatim and trimmed. One entry per step.
3. Never append secrets, tokens, or env values.
4. When the task ends, append a final entry: what is done, what is left, which files changed.
