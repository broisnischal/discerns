---
description: Write a handoff note to the project log so the next Claude session can pick up where this one stopped
---

Write a handoff for the next session.

1. Resolve the project from the repo's git remote. Find its latest log with `get_project_context`; if there is none, create one with `save_item` (`kind: "log"`, title "Handoff").
2. Call `append_log` with a short handoff: what was done this session, what is left, the files touched, decisions made, and anything surprising. Plain text, under 40 lines.
3. Save any decision that should outlive the session as a `memory` item in the same project.
4. Reply with the log URL.
