---
name: ewiz-share
description: Save, share, and retrieve prompts, memories, notes, code snippets, and .env files with ewiz share (share.ewiz.app). Use when the user asks to save, store, stash, or remember something for later or for someone else; to share an item with a person by email; to check what someone has shared with them; to find or reuse a saved prompt, memory, or env file; or to see an item's edit history. Requires the ewiz-share MCP server tools (save_item, list_items, get_item, share_item, and friends).
---

# ewiz share

ewiz share is a private pastebin with collaborators. Every item has an owner, a kind, a visibility, collaborators, and a full version history. The MCP tools act as the signed-in user.

## Pick the kind

| Kind     | Use for                                                                                       |
| -------- | --------------------------------------------------------------------------------------------- |
| `prompt` | Reusable prompts, system prompts, instructions for an agent                                   |
| `memory` | Facts, preferences, decisions, or context worth recalling in a later session or by a teammate |
| `env`    | `.env` files, API keys, tokens, credentials. Anything secret goes here and nowhere else       |
| `code`   | Snippets and scripts. Set `language` (e.g. `ts`, `python`, `bash`)                            |
| `text`   | Everything else                                                                               |

`env` items are encrypted at rest and can never be made public. Never put a secret in any other kind.

## Saving

1. Call `save_item` with a short, specific `title`, the exact `content` (do not summarize or reformat unless asked), the `kind`, and 1 to 4 lowercase `tags`.
2. Leave `visibility` as `private` unless the user asks for a link anyone can open (`link`) or a public item (`public`).
3. If the user named people to share with, call `share_item` for each email right after saving.
4. Reply with the item URL from the tool result.

When the user says "remember this" without naming a destination, prefer the built-in memory of the current client. Use ewiz share when they mention sharing, a teammate, another device, or ewiz share by name.

## Sharing

- `share_item` takes `id`, `email`, and `role` (`viewer` by default, `editor` if the user says the person can edit or update it).
- A result with `status: "invited"` means the person has no account yet. Give the user the `inviteUrl` to send; access is granted when that person signs in.
- Confirm the recipient before sharing an `env` item if the email is ambiguous or was inferred rather than stated.
- `unshare_item` removes a collaborator or a pending invite.

## Finding things

- "What has Sam shared with me?" → `list_items` with `scope: "shared"` and `owner: "sam"` (matches name or email).
- "Use my code review prompt" → `list_items` with `kind: "prompt"` and a `query`, then `get_item` on the best match.
- Recall team memories → `list_items` with `kind: "memory"` plus a `query` or `tag`.
- `list_items` returns summaries and a short preview. Call `get_item` for the full content before using it.

## Editing and history

- `update_item` saves a new version. Pass only the fields that change.
- `item_history` lists versions; `get_item` with a `version` reads an old one; `restore_version` brings it back as a new version.
- Only owners and editors can edit. Only the owner can change visibility, share, or delete.

## Handling env items

- When asked to write a stored env into the project, fetch it with `get_item` and write the file directly. Do not echo secret values into the chat unless the user asks to see them.
- Check that `.env` files are gitignored before writing one.

## Errors

- Not authorized: the user needs to connect or sign in to ewiz share in their client's connector settings.
- Not found: the item does not exist or has not been shared with this account.
- Conflict: someone else saved the item at the same time. Fetch it again, reapply the change, and save.
