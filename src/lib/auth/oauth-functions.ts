import { verifyOAuthQueryParams } from "@better-auth/oauth-provider";
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createError } from "evlog";
import { z } from "zod";

import { getAuth } from "#/lib/auth/auth.ts";
import { authMiddleware } from "#/lib/auth/middleware.ts";

const SCOPE_LABELS: Record<string, string> = {
  "items:read": "Read your items and the items shared with you",
  "items:write": "Create, edit, share, and delete your items",
  offline_access: "Stay connected until you disconnect it",
};

/** What the consent screen shows: who is asking, where the code goes, and for what. */
export const $getConsentDetails = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(z.object({ query: z.string().max(8000) }))
  .handler(async ({ data }) => {
    const auth = getAuth();
    const { secret } = await auth.$context;
    if (!(await verifyOAuthQueryParams(data.query, secret))) {
      throw createError({
        message: "This connection request expired",
        status: 400,
        fix: "Start connecting again from your agent",
      });
    }

    const params = new URLSearchParams(data.query);
    const clientId = params.get("client_id") ?? "";
    const client = await auth.api.getOAuthClientPublic({
      query: { client_id: clientId },
      headers: getRequest().headers,
    });
    const redirectUri = params.get("redirect_uri");

    return {
      clientName: client.client_name || "An application",
      clientUri: client.client_uri ?? null,
      redirectHost: redirectUri ? new URL(redirectUri).host : null,
      permissions: (params.get("scope") ?? "")
        .split(" ")
        .map((scope) => SCOPE_LABELS[scope])
        .filter(Boolean),
    };
  });
