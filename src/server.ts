import handler from "@tanstack/react-start/server-entry";
import { auditRedactPreset, type RequestLogger } from "evlog";
import { initWorkersLogger, withEvlog } from "evlog/workers";

import { loggerStorage } from "#/lib/logger.server.ts";

declare module "@tanstack/react-router" {
  interface Register {
    server: { requestContext: { log: RequestLogger } };
  }
}

initWorkersLogger({ env: { service: "discerns" } });

// One structured wide event per request. The logger is also bound to async storage
// so server code can reach it with useLogger() from lib/logger.server.ts.
/** Hosts from before the rename; they permanently redirect to the same path on the real origin. */
const LEGACY_HOSTS = new Set(["share.ewiz.app"]);
const ORIGIN = new URL(import.meta.env.VITE_BASE_URL);

export default withEvlog<Env>(
  async (request, _env, ctx, log) => {
    const url = new URL(request.url);
    if (LEGACY_HOSTS.has(url.hostname)) {
      url.protocol = ORIGIN.protocol;
      url.host = ORIGIN.host;
      // 308 keeps the method and body, so POSTs to old endpoints are redirected intact.
      return Response.redirect(url.toString(), 308);
    }
    const respond = () =>
      loggerStorage.run(log, () => handler.fetch(request, { context: { log } }));
    // Every MCP call verifies its token against this JWKS. Serving it from the edge cache
    // keeps that self-request off Better Auth and the database.
    if (request.method === "GET" && url.pathname === "/api/auth/jwks") {
      const cache = await caches.open("jwks");
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await respond();
      if (response.ok) ctx.waitUntil(cache.put(request, response.clone()));
      return response;
    }
    return respond();
  },
  {
    redact: {
      ...auditRedactPreset,
      paths: [...(auditRedactPreset.paths ?? []), "cookies"],
    },
    exclude: ["/assets/**", "/favicon.ico", "/downloads/**"],
  },
);
