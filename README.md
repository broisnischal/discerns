# discerns

A private pastebin for prompts, memories, snippets, and `.env` files that I can share with collaborators and that Claude can read and write over MCP.

Live at **https://discerns.app**.

- Sign in with GitHub or Google.
- Every item is private until I share it. I add people by email as viewers or editors. People without an account get an invite link and gain access when they sign in.
- Five kinds: `text`, `prompt`, `memory`, `env`, `code`. Env items are encrypted at rest (AES-256-GCM) and can never be made public.
- Every save is a version, whether it came from the web, a collaborator, or Claude. Any version can be restored.
- A remote MCP server at `/mcp` exposes the same features to Claude, authenticated with OAuth 2.1 (dynamic client registration, PKCE).

## Connect Claude

**Claude Code**, plugin (server plus the skill that tells Claude when to use it):

```sh
/plugin marketplace add <owner>/<repo>
/plugin install discerns@discerns
```

**Claude Code**, server only:

```sh
claude mcp add --transport http discerns https://discerns.app/mcp
```

Then run `/mcp` and sign in.

**claude.ai, Desktop, mobile:** Settings → Connectors → Add custom connector → `https://discerns.app/mcp`. The skill can be uploaded separately from Settings → Capabilities → Skills using [`discerns-skill.zip`](https://discerns.app/downloads/discerns-skill.zip).

### MCP tools

| Tool                               | What it does                                                          |
| ---------------------------------- | --------------------------------------------------------------------- |
| `save_item`                        | Save a new item; returns its id and URL                               |
| `get_item`                         | Read an item, or an older `version` of it                             |
| `list_items`                       | List or search mine and shared-with-me, filter by kind, tag, or owner |
| `update_item`                      | Change an item; content changes create a version                      |
| `share_item` / `unshare_item`      | Add or remove a collaborator by email                                 |
| `list_collaborators`               | Owner, collaborators, pending invites                                 |
| `item_history` / `restore_version` | Version history                                                       |
| `delete_item`                      | Owner only                                                            |
| `whoami`                           | The account the tools act as                                          |

Items are also exposed as resources at `discerns://items/{id}`.

## Stack

Started from [Cove Stack](https://github.com/mugnavo/cove) by mugnavo.

- TanStack Start (React, Router, Query) on Cloudflare Workers via `@cloudflare/vite-plugin`
- Cloudflare D1 with Drizzle ORM (1.0 RC, relations v2)
- Better Auth: GitHub and Google sign-in, plus `@better-auth/mcp` and `jwt()` as the OAuth server for MCP
- MCP TypeScript SDK v2 (`@modelcontextprotocol/server`), stateless Streamable HTTP
- Tailwind CSS and shadcn/ui on Base UI
- evlog wide events into Workers Logs
- Vite+ (`vp`) for dev, build, lint, format, and tests

## Layout

```
src/lib/items/service.server.ts   item logic shared by the website and the MCP tools
src/lib/items/access.ts           who can view, edit, and manage
src/lib/mcp/server.server.ts      MCP tools and resources
src/lib/auth/options.ts           Better Auth config (providers, MCP OAuth server)
src/routes/mcp.ts                 /mcp, token verification
src/routes/[.]well-known/$.ts     OAuth discovery metadata
src/server.ts                     Worker entry, request logging
plugins/discerns/               Claude plugin: skill + MCP server config
.claude-plugin/marketplace.json   plugin marketplace
```

## Local development

Requirements: Node 24+, pnpm 12 (pinned in `mise.toml`), and optionally the [`vp` CLI](https://viteplus.dev/guide/#install-vp). `vpr x` below is `vp run x`; `pnpm run x` works the same.

1. Install: `pnpm install` (also generates `worker-configuration.d.ts`).
2. Create `.dev.vars` with local secrets:

   ```sh
   BETTER_AUTH_SECRET=<openssl rand -base64 32>
   ENCRYPTION_KEY=<openssl rand -base64 32>
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   ```

   GitHub and Google are optional locally. Their OAuth apps need the callback `http://localhost:3000/api/auth/callback/<provider>`.

3. Apply migrations to the local D1 database: `vpr db:migrate:local`
4. Run: `vpr dev` → http://localhost:3000

The public origin comes from `.env.development` and `.env.production` (`VITE_BASE_URL`).

### Checks

```sh
vpr lint        # type-aware lint + type check
vpr test        # Vitest
vpr test:e2e    # Playwright against a production build on workerd
```

## Schema changes

```sh
vpr auth:generate      # after changing src/lib/auth/options.ts
vpr db:generate        # writes drizzle/<timestamp>_<name>/migration.sql
vpr db:migrate:local
vpr db:migrate:remote
```

## Deploy

Production secrets (once, or when rotating):

```sh
pnpm exec wrangler secret put BETTER_AUTH_SECRET
pnpm exec wrangler secret put ENCRYPTION_KEY       # 32 random bytes, base64. Changing it makes existing env items unreadable.
pnpm exec wrangler secret put GITHUB_CLIENT_ID
pnpm exec wrangler secret put GITHUB_CLIENT_SECRET
pnpm exec wrangler secret put GOOGLE_CLIENT_ID
pnpm exec wrangler secret put GOOGLE_CLIENT_SECRET
```

OAuth callbacks in production: `https://discerns.app/api/auth/callback/github` and `https://discerns.app/api/auth/callback/google`.

Then:

```sh
vpr db:migrate:remote
vpr deploy
```

`wrangler.jsonc` binds the D1 database `discerns` and attaches the Worker to the `discerns.app` custom domain.
