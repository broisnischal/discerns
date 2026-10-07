---
description: Save the last thing we worked on (a prompt, snippet, note, or env) to discerns and return the link
argument-hint: [what to save, optional title]
---

Save to discerns using the discerns MCP tools.

1. Work out what to save: `$ARGUMENTS` if given, otherwise the most recent prompt, snippet, command output, or note from this conversation.
2. Resolve the project from this repo's git remote (`git remote get-url origin`) and pass it as `project`. Create the project with `create_project` if it does not exist.
3. Pick the kind: `env` for anything secret, `code` for code (set `language`), `prompt` for reusable instructions, `memory` for decisions and facts, `text` otherwise.
4. Call `save_item` with the exact content, 1 to 4 lowercase tags, and a short title (or omit the title to use the first line).
5. Reply with the item URL on its own line.
