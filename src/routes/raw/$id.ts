import { createFileRoute } from "@tanstack/react-router";

import { getAuth } from "#/lib/auth/auth.ts";
import { getItem } from "#/lib/items/service.server.ts";

// Plain-text view for `curl` and "open raw". Env items are excluded so secrets
// never end up in a browser cache or a proxy log through a shareable URL.
export const Route = createFileRoute("/raw/$id")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        const session = await getAuth().api.getSession({ headers: request.headers });
        const item = await getItem(params.id, session?.user.id ?? null).catch(() => null);
        if (!item || item.kind === "env") {
          return new Response("Not found\n", { status: 404 });
        }
        return new Response(item.content, {
          headers: {
            "Content-Type": "text/plain; charset=utf-8",
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      },
    },
  },
});
