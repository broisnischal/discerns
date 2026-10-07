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
  (request, _env, _ctx, log) => {
    const url = new URL(request.url);
    if (LEGACY_HOSTS.has(url.hostname)) {
      url.protocol = ORIGIN.protocol;
      url.host = ORIGIN.host;
      // 308 keeps the method and body, so POSTs to old endpoints are redirected intact.
      return Response.redirect(url.toString(), 308);
    }
    return loggerStorage.run(log, () => handler.fetch(request, { context: { log } }));
  },
  {
    redact: {
      ...auditRedactPreset,
      paths: [...(auditRedactPreset.paths ?? []), "cookies"],
    },
    exclude: ["/assets/**", "/favicon.ico", "/downloads/**"],
  },
);
