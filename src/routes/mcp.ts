import { requireMcpAuth } from "@better-auth/mcp";
import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "#/lib/auth/auth.ts";
import { MCP_SCOPES } from "#/lib/auth/options.ts";
import { getPlan } from "#/lib/billing/billing.server.ts";
import { mcpHandler, toAuthInfo } from "#/lib/mcp/server.server.ts";

const resource = `${import.meta.env.VITE_BASE_URL}/mcp`;

/**
 * Remote MCP endpoint (Streamable HTTP, stateless). requireMcpAuth verifies the
 * OAuth access token issued by Better Auth and answers unauthenticated requests
 * with a 401 that points clients at /.well-known/oauth-protected-resource.
 */
const handle = (request: Request) =>
  requireMcpAuth(
    getAuth(),
    async (req, claims) => {
      // One primary-key read per request; agent access is what Pro pays for.
      const plan = claims.sub ? await getPlan(claims.sub) : "free";
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
