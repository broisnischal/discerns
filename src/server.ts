import handler from "@tanstack/react-start/server-entry";
import { auditRedactPreset, type RequestLogger } from "evlog";
import { initWorkersLogger, withEvlog } from "evlog/workers";

import { loggerStorage } from "#/lib/logger.server.ts";

declare module "@tanstack/react-router" {
  interface Register {
    server: { requestContext: { log: RequestLogger } };
  }
}

initWorkersLogger({ env: { service: "ewiz-share" } });

// One structured wide event per request. The logger is also bound to async storage
// so server code can reach it with useLogger() from lib/logger.server.ts.
export default withEvlog<Env>(
  (request, _env, _ctx, log) =>
    loggerStorage.run(log, () => handler.fetch(request, { context: { log } })),
  {
    redact: {
      ...auditRedactPreset,
      paths: [...(auditRedactPreset.paths ?? []), "cookies"],
    },
    exclude: ["/assets/**", "/favicon.ico", "/downloads/**"],
  },
);
