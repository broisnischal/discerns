import { requireMcpAuth } from "@better-auth/mcp";
import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "#/lib/auth/auth.ts";
import { MCP_SCOPES } from "#/lib/auth/options.ts";
import { getPlan } from "#/lib/billing/billing.server.ts";
import type { Plan } from "#/lib/billing/plan.ts";
import { mcpHandler, toAuthInfo } from "#/lib/mcp/server.server.ts";

const resource = `${import.meta.env.VITE_BASE_URL}/mcp`;

/**
 * Plans change rarely, but every MCP call checks one, so each Worker instance remembers
 * them briefly. An upgrade or cancellation reaches agents within PLAN_TTL_MS.
 */
const PLAN_TTL_MS = 30_000;
const planCache = new Map<string, { plan: Plan; until: number }>();

async function planForAgent(userId: string): Promise<Plan> {
  const hit = planCache.get(userId);
  if (hit && hit.until > Date.now()) return hit.plan;
  const plan = await getPlan(userId);
  planCache.set(userId, { plan, until: Date.now() + PLAN_TTL_MS });
  return plan;
}

/**
 * Remote MCP endpoint (Streamable HTTP, stateless). requireMcpAuth verifies the
 * OAuth access token issued by Better Auth and answers unauthenticated requests
 * with a 401 that points clients at /.well-known/oauth-protected-resource.
 */
const handle = (request: Request) =>
  requireMcpAuth(
    getAuth(),
    async (req, claims) => {
      const plan = claims.sub ? await planForAgent(claims.sub) : "free";
      return mcpHandler.fetch(req, { authInfo: toAuthInfo(req, claims, resource, plan) });
    },
    { resource, requiredScopes: MCP_SCOPES },
  )(request);

export const Route = createFileRoute("/mcp")({
  server: {
    handlers: {
      POST: ({ request }) => handle(request),
      GET: ({ request }) => handle(request),
      DELETE: ({ request }) => handle(request),
    },
  },
});
