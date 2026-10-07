import "@tanstack/react-start/server-only";
import {
  createMcpHandler,
  McpServer,
  ResourceTemplate,
  type AuthInfo,
  type CallToolResult,
} from "@modelcontextprotocol/server";
import { z } from "zod";

import { ITEM_KINDS, ITEM_VISIBILITIES, MEMBER_ROLES } from "#/lib/db/schema/types.ts";
import * as items from "#/lib/items/service.server.ts";
import { APP_NAME } from "#/lib/site.ts";

/** Accepts a bare id or a full item URL like https://share.ewiz.app/p/abc123. */
const idOrUrl = z
  .string()
  .trim()
  .transform((value) => /\/p\/([A-Za-z0-9]+)/.exec(value)?.[1] ?? value)
  .describe("Item id, or the item URL");

const json = (value: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
});

const INSTRUCTIONS = `${APP_NAME} stores prompts, memories, notes, code snippets, and env files for the signed-in user, and shares them with collaborators by email.
- Use kind "env" for anything secret; env items are encrypted and always private.
- list_items returns summaries; call get_item for full content.
- Every update creates a version; item_history and restore_version work with them.
- Return the item URL to the user after saving or sharing.`;

/** Builds an MCP server whose tools act as the user with this id. */
export function createMcpServer(userId: string) {
  const server = new McpServer(
    { name: "ewiz-share", title: APP_NAME, version: "0.1.0" },
    { instructions: INSTRUCTIONS },
  );
  const actor = { userId, source: "mcp" as const };

  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description: `The ${APP_NAME} account these tools act as.`,
      annotations: { readOnlyHint: true },
    },
    async () => json(await items.getProfile(userId)),
  );

  server.registerTool(
    "save_item",
    {
      title: "Save item",
      description:
        "Save a new item: a prompt, memory, note, code snippet, or env file. Returns its id and URL. Store content exactly as given.",
      inputSchema: z.object({
        title: z.string().min(1).max(200).describe("Short, specific title"),
        content: z.string().describe("The full content, verbatim"),
        kind: z
          .enum(ITEM_KINDS)
          .default("text")
          .describe("prompt, memory, env (secrets, encrypted), code, or text"),
        tags: z.array(z.string()).max(20).optional().describe("1 to 4 lowercase tags"),
        visibility: z
          .enum(ITEM_VISIBILITIES)
          .default("private")
          .describe(
            "private (owner and collaborators), link (anyone with the URL), public. Env items are always private.",
          ),
        language: z.string().max(40).optional().describe("Language for code items, e.g. ts"),
      }),
    },
    async (args) => json(await items.createItem(actor, args)),
  );

  server.registerTool(
    "get_item",
    {
      title: "Get item",
      description:
        "Read an item's full content and metadata. Pass `version` to read an older version from its history.",
      inputSchema: z.object({
        id: idOrUrl,
        version: z.number().int().min(1).optional(),
      }),
      annotations: { readOnlyHint: true },
    },
    async ({ id, version }) => {
      const item = await items.getItem(id, userId);
      if (!version || version === item.version) return json(item);
      const old = await items.getVersion(userId, id, version);
      return json({ ...item, ...old, currentVersion: item.version });
    },
  );

  server.registerTool(
    "list_items",
    {
      title: "List items",
      description:
        'List or search items the user owns or that were shared with them, newest first. Use scope "shared" with `owner` to see what a specific person shared.',
      inputSchema: z.object({
        scope: z.enum(["all", "mine", "shared"]).default("all"),
        kind: z.enum(ITEM_KINDS).optional(),
        owner: z.string().optional().describe("Owner name or email (partial match)"),
        query: z.string().optional().describe("Text to find in titles, tags, and content"),
        tag: z.string().optional(),
        limit: z.number().int().min(1).max(100).default(20),
        offset: z.number().int().min(0).default(0),
      }),
      annotations: { readOnlyHint: true },
    },
    async (args) => {
      const rows = await items.listItems(userId, args);
      return json(
        rows.map((row) => ({
          id: row.id,
          title: row.title,
          kind: row.kind,
          tags: row.tags,
          visibility: row.visibility,
          access: row.access,
          owner: { name: row.ownerName, email: row.ownerEmail },
          updatedAt: row.updatedAt,
          version: row.version,
          preview: row.preview,
          url: row.url,
        })),
      );
    },
  );

  server.registerTool(
    "update_item",
    {
      title: "Update item",
      description:
        "Change an item. Pass only the fields that change. Content or title changes create a new version. Only the owner can change visibility.",
      inputSchema: z.object({
        id: idOrUrl,
        title: z.string().min(1).max(200).optional(),
        content: z.string().optional(),
        tags: z.array(z.string()).max(20).optional(),
        visibility: z.enum(ITEM_VISIBILITIES).optional(),
        language: z.string().max(40).optional(),
      }),
      annotations: { idempotentHint: true },
    },
    async (args) => json(await items.updateItem(actor, args)),
  );

  server.registerTool(
    "share_item",
    {
      title: "Share item",
      description:
        "Give someone access by email. People with an account get access immediately; otherwise the result has an inviteUrl for the user to send them.",
      inputSchema: z.object({
        id: idOrUrl,
        email: z.string().describe("The person's email address"),
        role: z.enum(MEMBER_ROLES).default("viewer").describe("viewer or editor"),
      }),
      annotations: { idempotentHint: true },
    },
    async (args) => json(await items.shareItem(actor, args)),
  );

  server.registerTool(
    "unshare_item",
    {
      title: "Remove access",
      description: "Remove a collaborator or cancel a pending invite by email.",
      inputSchema: z.object({ id: idOrUrl, email: z.string() }),
      annotations: { idempotentHint: true },
    },
    async ({ id, email }) => {
      await items.unshareItem(actor, id, email);
      return json({ removed: email });
    },
  );

  server.registerTool(
    "list_collaborators",
    {
      title: "List collaborators",
      description:
        "Who has access to an item: owner, collaborators with roles, and pending invites.",
      inputSchema: z.object({ id: idOrUrl }),
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => json(await items.listCollaborators(userId, id)),
  );

  server.registerTool(
    "item_history",
    {
      title: "Item history",
      description: "List an item's versions, newest first, with who saved each one and from where.",
      inputSchema: z.object({ id: idOrUrl }),
      annotations: { readOnlyHint: true },
    },
    async ({ id }) => json(await items.listVersions(userId, id)),
  );

  server.registerTool(
    "restore_version",
    {
      title: "Restore version",
      description: "Bring back an older version. This saves it as a new version; history is kept.",
      inputSchema: z.object({ id: idOrUrl, version: z.number().int().min(1) }),
    },
    async ({ id, version }) => json(await items.restoreVersion(actor, id, version)),
  );

  server.registerTool(
    "delete_item",
    {
      title: "Delete item",
      description:
        "Permanently delete an item, its history, and everyone's access. Owner only. Confirm with the user first.",
      inputSchema: z.object({ id: idOrUrl }),
      annotations: { destructiveHint: true },
    },
    async ({ id }) => {
      await items.deleteItem(actor, id);
      return json({ deleted: id });
    },
  );

  server.registerResource(
    "item",
    new ResourceTemplate("ewiz://items/{id}", {
      list: async () => {
        const rows = await items.listItems(userId, { limit: 50 });
        return {
          resources: rows.map((row) => ({
            uri: `ewiz://items/${row.id}`,
            name: row.title,
            description: `${row.kind} by ${row.ownerName}`,
            mimeType: "text/plain",
          })),
        };
      },
    }),
    {
      title: "Items",
      description: "Items you own or that were shared with you",
      mimeType: "text/plain",
    },
    async (uri, { id }) => {
      const item = await items.getItem(String(id), userId);
      return { contents: [{ uri: uri.href, mimeType: "text/plain", text: item.content }] };
    },
  );

  return server;
}

/** Maps verified access-token claims to the MCP SDK's AuthInfo. `sub` is the user id. */
interface AccessTokenClaims {
  sub?: string;
  azp?: unknown;
  client_id?: unknown;
  scope?: unknown;
  exp?: number;
}

export function toAuthInfo(
  request: Request,
  claims: AccessTokenClaims,
  resource: string,
): AuthInfo {
  return {
    token: request.headers.get("authorization")?.replace(/^\S+\s+/, "") ?? "",
    clientId:
      typeof claims.azp === "string"
        ? claims.azp
        : typeof claims.client_id === "string"
          ? claims.client_id
          : "",
    scopes: typeof claims.scope === "string" ? claims.scope.split(" ") : [],
    expiresAt: claims.exp,
    resource: new URL(resource),
    extra: { userId: claims.sub },
  };
}

// One stateless server per request; the default legacy mode also serves 2025-era clients like Claude.
export const mcpHandler = createMcpHandler(({ authInfo }) => {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string")
    throw new Error("MCP request reached the handler without a verified user");
  return createMcpServer(userId);
});
