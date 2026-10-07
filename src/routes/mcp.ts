import { requireMcpAuth } from "@better-auth/mcp";
import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "#/lib/auth/auth.ts";
import { MCP_SCOPES } from "#/lib/auth/options.ts";
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
    (req, claims) => mcpHandler.fetch(req, { authInfo: toAuthInfo(req, claims, resource) }),
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
