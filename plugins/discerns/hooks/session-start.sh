#!/bin/sh
# Tells Claude which discerns project this repository maps to, so it can load the team's
# shared context when a task needs it. Prints nothing outside a git repo with a remote.
remote=$(git remote get-url origin 2>/dev/null) || exit 0
[ -n "$remote" ] || exit 0
echo "discerns: this repository's project is \"$remote\". When a task involves saved prompts, team memories, env files, live logs, or sharing, call get_project_context with that project first, then pass it to save_item and list_items."
