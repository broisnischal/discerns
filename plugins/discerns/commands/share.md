---
description: Share a discerns item or this repo's project with someone by email
argument-hint: <item or "project"> with <email> [as editor]
---

Share in discerns: $ARGUMENTS

1. Work out what to share. "project" or "this repo" means the project for this repo's git remote; otherwise find the item with `list_items` (use `query`), or use the id or URL given.
2. Role is `viewer` unless the request says edit or editor.
3. Project: call `share_project`. Item: call `share_item`. If the item is an env file and the email was not written out by the user, confirm the address first.
4. Reply with who now has access. If the result includes an `inviteUrl`, give it to the user to send, because that person has no account yet.
