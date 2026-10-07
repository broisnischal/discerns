---
description: Load this repo's shared context from discerns (memories, prompts, env list, latest log)
---

Load the project's shared context.

1. Run `git remote get-url origin` and call `get_project_context` with it. If the project does not exist, say so and offer to create it.
2. Read the memories in full and the tail of the latest log. Summarize in a few lines: team decisions that affect this work, where the last session stopped, and which env or prompt items are available.
3. Keep using this project on every `save_item` and `list_items` call for the rest of the session.
