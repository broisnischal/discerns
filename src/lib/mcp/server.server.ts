import "@tanstack/react-start/server-only";
import {
  createMcpHandler,
  McpServer,
  ResourceTemplate,
  type AuthInfo,
  type CallToolResult,
  type RegisteredTool,
} from "@modelcontextprotocol/server";
import { z } from "zod";

import { INTRO_PRICE, PRO_PRICES, type Plan } from "#/lib/billing/plan.ts";
import { ITEM_KINDS, ITEM_VISIBILITIES, MEMBER_ROLES } from "#/lib/db/schema/types.ts";
import { serverEnv } from "#/lib/env.server.ts";
import * as items from "#/lib/items/service.server.ts";
import { APP_NAME } from "#/lib/site.ts";

/** Accepts a bare id or a full item URL like https://discerns.app/p/abc123. */
const idOrUrl = z
  .string()
  .trim()
  .transform((value) => /\/p\/([A-Za-z0-9]+)/.exec(value)?.[1] ?? value)
  .describe("Item id, or the item URL");

const json = (value: unknown): CallToolResult => ({
  content: [{ type: "text", text: JSON.stringify(value, null, 2) }],
});

const INSTRUCTIONS = `${APP_NAME} stores prompts, memories, notes, code snippets, env files, and live logs for the signed-in user, and shares them with collaborators by email.
- Use kind "env" for anything secret; env items are encrypted and always private.
- Use kind "log" to narrate work as it happens: save_item once, then append_log for each step, result, or error. People and other agent sessions watch it live at the item URL and read new lines with tail_log.
- Projects are folders, usually one per repository. At the start of a session resolve the project from the repo's git remote (e.g. github.com/acme/api) and call get_project_context; pass that project on save_item and list_items so items land in the right folder.
- list_items returns summaries; call get_item for full content.
- Every update creates a version; item_history and restore_version work with them. Logs are append-only.
- Return the item URL to the user after saving or sharing.`;

/** What a non-Pro caller gets from every tool except whoami: a message the agent can relay. */
function subscriptionRequired(): CallToolResult {
  const billing = new URL("/app/settings?tab=billing", serverEnv().BASE_URL);
  const { monthly, yearly } = PRO_PRICES;
  const intro = serverEnv().DODO_INTRO_DISCOUNT_CODE
    ? ` New subscribers pay ${INTRO_PRICE} for their first month.`
    : "";
  return {
    isError: true,
    content: [
      {
        type: "text",
        text: `Using ${APP_NAME} from a coding agent needs an active Pro subscription (${monthly.price} per ${monthly.per} or ${yearly.price} per ${yearly.per}). Tell the user to upgrade at ${billing.href}. ${intro} The website itself stays free. Do not retry this tool until the user says they have upgraded.`,
      },
    ],
  };
}

/**
 * Builds an MCP server whose tools act as the user with this id. Agent access is the paid
 * part of the product: without Pro the tools are still listed, but calling them explains
 * how to upgrade instead of doing the work.
 */
export function createMcpServer(userId: string, plan: Plan) {
  const server = new McpServer(
    { name: "discerns", title: APP_NAME, version: "0.2.0" },
    { instructions: INSTRUCTIONS },
  );
  const actor = { userId, source: "mcp" as const };
  const paidTools: RegisteredTool[] = [];
  const paid = (tool: RegisteredTool) => {
    paidTools.push(tool);
    return tool;
  };

  server.registerTool(
    "whoami",
    {
      title: "Who am I",
      description: `The ${APP_NAME} account these tools act as.`,
      annotations: { readOnlyHint: true },
    },
    async () =>
      json({
        ...(await items.getProfile(userId)),
        plan,
        agentAccess: plan === "pro",
      }),
  );

  paid(
    server.registerTool(
      "save_item",
      {
        title: "Save item",
        description:
          "Save a new item: a prompt, memory, note, code snippet, env file, or log. Returns its id and URL. Store content exactly as given. For a log, content is the optional first entry; add more with append_log.",
        inputSchema: z.object({
          title: z
            .string()
            .max(200)
            .optional()
            .describe("Short, specific title. Omit to use the first line of the content."),
          content: z.string().describe("The full content, verbatim"),
          project: z
            .string()
            .optional()
            .describe(
              "Project to file it in: id, key like github.com/acme/api, git remote URL, or name",
            ),
          kind: z
            .enum(ITEM_KINDS)
            .default("text")
            .describe(
              "prompt, memory, env (secrets, encrypted), code, log (append-only, live), or text",
            ),
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
    ),
  );

  paid(
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
    ),
  );

  paid(
    server.registerTool(
      "list_items",
      {
        title: "List items",
        description:
          'List or search items the user owns or that were shared with them, newest first. Use scope "shared" with `owner` to see what a specific person shared.',
        inputSchema: z.object({
          scope: z.enum(["all", "mine", "shared"]).default("all"),
          project: z
            .string()
            .optional()
            .describe('Only this project (id, key, remote URL, or name), or "unfiled"'),
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
            project: row.projectId ? { id: row.projectId, name: row.projectName } : null,
            updatedAt: row.updatedAt,
            version: row.version,
            preview: row.preview,
            url: row.url,
          })),
        );
      },
    ),
  );

  paid(
    server.registerTool(
      "update_item",
      {
        title: "Update item",
        description:
          "Change an item. Pass only the fields that change. Content or title changes create a new version. Only the owner can change visibility.",
        inputSchema: z.object({
          id: idOrUrl,
          title: z.string().min(1).max(200).optional(),
          project: z
            .string()
            .nullable()
            .optional()
            .describe("Move to a project, or null to unfile"),
          content: z.string().optional(),
          tags: z.array(z.string()).max(20).optional(),
          visibility: z.enum(ITEM_VISIBILITIES).optional(),
          language: z.string().max(40).optional(),
        }),
        annotations: { idempotentHint: true },
      },
      async (args) => json(await items.updateItem(actor, args)),
    ),
  );

  paid(
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
    ),
  );

  paid(
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
    ),
  );

  paid(
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
    ),
  );

  paid(
    server.registerTool(
      "item_history",
      {
        title: "Item history",
        description:
          "List an item's versions, newest first, with who saved each one and from where.",
        inputSchema: z.object({ id: idOrUrl }),
        annotations: { readOnlyHint: true },
      },
      async ({ id }) => json(await items.listVersions(userId, id)),
    ),
  );

  paid(
    server.registerTool(
      "restore_version",
      {
        title: "Restore version",
        description:
          "Bring back an older version. This saves it as a new version; history is kept.",
        inputSchema: z.object({ id: idOrUrl, version: z.number().int().min(1) }),
      },
      async ({ id, version }) => json(await items.restoreVersion(actor, id, version)),
    ),
  );

  paid(
    server.registerTool(
      "list_projects",
      {
        title: "List projects",
        description:
          "Projects the user owns or belongs to, with their repository key and item count.",
        annotations: { readOnlyHint: true },
      },
      async () => json(await items.listProjects(userId)),
    ),
  );

  paid(
    server.registerTool(
      "create_project",
      {
        title: "Create project",
        description:
          "Create a project folder. Pass the repository's git remote URL as `key` so it can be found from that repo later.",
        inputSchema: z.object({
          name: z.string().min(1).max(100).describe("Short name, usually the repo name"),
          key: z.string().optional().describe("Git remote URL or key like github.com/acme/api"),
        }),
      },
      async (args) => json(await items.createProject(actor, args)),
    ),
  );

  paid(
    server.registerTool(
      "get_project_context",
      {
        title: "Project context",
        description:
          "Everything worth knowing before working in a project: its memories (full text), prompts, env items, code snippets, and the tail of its latest log. Call this first when starting work in a repository.",
        inputSchema: z.object({
          project: z
            .string()
            .describe("Project id, key like github.com/acme/api, git remote URL, or name"),
        }),
        annotations: { readOnlyHint: true },
      },
      async ({ project }) => json(await items.getProjectContext(userId, project)),
    ),
  );

  paid(
    server.registerTool(
      "share_project",
      {
        title: "Share project",
        description:
          "Give someone access to every item in a project by email. They need an account already; otherwise share one item to send an invite link.",
        inputSchema: z.object({
          project: z.string(),
          email: z.string(),
          role: z.enum(MEMBER_ROLES).default("viewer"),
        }),
        annotations: { idempotentHint: true },
      },
      async ({ project, email, role }) =>
        json(await items.shareProject(actor, { id: project, email, role })),
    ),
  );

  paid(
    server.registerTool(
      "append_log",
      {
        title: "Append to log",
        description:
          "Add a line or block to a log item. Everyone it is shared with sees it live. Use it to stream progress, command output, test results, or errors while you work. Keep secrets out of logs.",
        inputSchema: z.object({
          id: idOrUrl,
          text: z.string().min(1).describe("The text to append, verbatim"),
        }),
      },
      async (args) => json(await items.appendLog(actor, args)),
    ),
  );

  paid(
    server.registerTool(
      "tail_log",
      {
        title: "Tail log",
        description:
          "Read a log's entries after a cursor, oldest first. Pass the returned cursor next time to get only what is new. Use it to follow what another agent session or a teammate is doing.",
        inputSchema: z.object({
          id: idOrUrl,
          after: z
            .number()
            .int()
            .min(0)
            .default(0)
            .describe("Cursor from the last call; 0 for the start"),
          limit: z.number().int().min(1).max(1000).default(500),
        }),
        annotations: { readOnlyHint: true },
      },
      async (args) => json(await items.tailLog(userId, args)),
    ),
  );

  paid(
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
    ),
  );

  const itemsResource = server.registerResource(
    "item",
    new ResourceTemplate("discerns://items/{id}", {
      list: async () => {
        const rows = await items.listItems(userId, { limit: 50 });
        return {
          resources: rows.map((row) => ({
            uri: `discerns://items/${row.id}`,
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

  if (plan !== "pro") {
    for (const tool of paidTools) tool.update({ callback: subscriptionRequired });
    itemsResource.disable();
  }

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
  plan: Plan,
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
    extra: { userId: claims.sub, plan },
  };
}

// One stateless server per request; the default legacy mode also serves 2025-era clients like Claude Code and Cursor.
export const mcpHandler = createMcpHandler(({ authInfo }) => {
  const userId = authInfo?.extra?.userId;
  if (typeof userId !== "string")
    throw new Error("MCP request reached the handler without a verified user");
  return createMcpServer(userId, authInfo?.extra?.plan === "pro" ? "pro" : "free");
});
