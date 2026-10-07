---
description: Search discerns for prompts, memories, snippets, env files, or logs and show the best matches
argument-hint: <what to look for>
---

Find "$ARGUMENTS" in discerns.

1. Call `list_items` with `query` set to two or three distinctive words from the request. If this repo has a git remote, also pass it as `project`; if that returns nothing, search again without `project`.
2. Read the top matches in one call with `get_items` (up to 5 ids).
3. Reply with a short list: title, kind, why it matches, and its URL. Show content only when the user asked for it, and never print env values unless asked.
