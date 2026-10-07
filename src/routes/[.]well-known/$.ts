import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "#/lib/auth/auth.ts";

// OAuth discovery for MCP clients: /.well-known/oauth-protected-resource[/mcp]
// and /.well-known/oauth-authorization-server/api/auth are served by Better Auth.
export const Route = createFileRoute("/.well-known/$")({
  server: {
    handlers: {
      GET: ({ request }) => getAuth().handler(request),
    },
  },
});
