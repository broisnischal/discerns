---
name: discerns
description: Shared clipboard and memory for teams and their coding agents on discerns (discerns.app). Use when the user wants to save, stash, or remember a prompt, snippet, note, decision, or .env file; share something with a person by email; see what a teammate shared; reuse a saved prompt or env; stream progress, command output, or errors to a live log others can watch; hand work off to a later session; or load a repository's shared context at the start of work. Also use when another Claude session or teammate is working in the same repo and you need to see their log. Requires the discerns MCP tools (get_project_context, save_item, list_items, get_item, append_log, tail_log, share_item, share_project, and friends).
---

# discerns

Items live in **projects**, one per repository. Every item has a kind, an owner, a visibility, collaborators, and history. Logs are append-only streams that people watch live. The MCP tools act as the signed-in user.

## Session start: load the project

Do this once, before saving or searching while working in a repo:

1. The session-start note names this repo's project when the plugin is installed. Otherwise run `git remote get-url origin` and pass it as `project` everywhere. The server normalizes it to `github.com/owner/repo`. No remote: use the folder name.
2. `get_project_context` with that key. Read the memories in full and the tail of the latest log. That is the team's decisions and where the last session stopped.
3. "Project not found" → `create_project` with the repo name and the remote URL as `key`, then continue.
4. Pass `project` on every `save_item` and `list_items` from then on. Omit it only for things unrelated to this repo.

## Kinds

| Kind     | Use for                                                                                |
| -------- | -------------------------------------------------------------------------------------- |
| `prompt` | Reusable prompts, system prompts, agent instructions                                   |
| `memory` | Decisions, conventions, facts a later session or teammate needs. Short, one topic each |
| `env`    | `.env` files, keys, tokens. Encrypted, always private, the only place for secrets      |
| `code`   | Snippets and scripts; set `language` (`ts`, `python`, `bash`)                          |
| `log`    | Append-only, live: progress, command output, test results, errors, handoffs            |
| `text`   | Everything else                                                                        |

Never put a secret in any kind but `env`, and never into a log.

## Saving

- `save_item` with the exact content (no summarizing or reformatting unless asked), the kind, `project`, and 1 to 4 lowercase tags. Title is optional; the first line of the content is used when omitted.
- Default `visibility` is `private`. Use `link` only when the user asks for a link anyone can open, `public` only when asked.
- People named by the user → `share_item` for each email right after saving.
- Reply with the item URL.
- "Remember this" with no destination → the client's own memory. Use discerns when the user mentions a teammate, another device, another session, or discerns by name, or when the fact is about this repo and worth sharing.

## Live logs

A log is for work others should be able to watch.

- Start: `save_item` with `kind: "log"`, `project`, a title like "Deploy run" (content optional). Give the user the URL **before** the work starts.
- Narrate: `append_log` after each meaningful step with the command, its result or error, and the decision you made. Verbatim, trimmed, one entry per step. Not one per word.
- Follow someone else: `tail_log` with `after: 0`, then keep passing the returned `cursor`. `caughtUp: false` means more was already waiting, so call again at once.
- End: append what is done, what is left, and the files touched. That entry is the handoff the next session reads via `get_project_context`.
- Logs are append-only. `update_item` changes title and tags only.

## Sharing

- Whole folder: `share_project` with the project and the person's email (`viewer` or `editor`). They see every item in it, including future ones. Needs an existing account; if not, share one item instead so an invite link is created.
- One item: `share_item` with `id`, `email`, `role`. `status: "invited"` means no account yet; give the user the `inviteUrl` to send.
- Confirm the recipient before sharing an `env` item when the email was inferred.
- `unshare_item` removes a collaborator or a pending invite.

## Finding things

Results are compact JSON with empty fields left out. `list_items` gives short summaries; read several items at once with `get_items` instead of calling `get_item` in a loop.

- Repo context: `get_project_context`, or `list_items` with `project`.
- "What has Sam shared with me?" → `list_items` with `scope: "shared"`, `owner: "sam"`.
- "Use my code review prompt" → `list_items` with `kind: "prompt"` and `query`, then `get_item` on the best match.
- Search is full-text with prefix matching; two or three distinctive words beat a sentence.
- `list_items` returns summaries. Always `get_item` before using content.

## Editing and history

- `update_item` saves a new version; pass only the fields that change. Move an item with `project`, unfile with `project: null`.
- `item_history` lists versions, `get_item` with `version` reads one, `restore_version` brings it back as a new version.
- Owners and editors edit. Only the owner changes visibility, shares, or deletes. Confirm before `delete_item`.

## Env items

- Writing a stored env into the project: `get_item`, then write the file directly. Do not echo values into chat unless asked.
- Check `.env` is gitignored before writing one.

## Errors

- Not authorized: connect or sign in to discerns in the client's connector settings.
- Not found: it does not exist or is not shared with this account.
- Conflict: someone saved at the same time. Fetch again, reapply, save.
- Free plan full (402): the account has reached its item or project limit. Tell the user and point to Settings → Billing; do not retry.
- Subscription required: agent access needs discerns Pro. Relay the upgrade link from the message and stop; do not retry other tools until the user says they upgraded. `whoami` still works and reports `plan` and `agentAccess`.
