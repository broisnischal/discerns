import "@tanstack/react-start/server-only";
import { betterAuth } from "better-auth/minimal";

import { authOptions } from "#/lib/auth/options.ts";
import { applySubscriptionEvent, checkoutDiscounts } from "#/lib/billing/billing.server.ts";
import { db } from "#/lib/db/index.ts";
import * as schema from "#/lib/db/schema/index.ts";
import { serverEnv } from "#/lib/env.server.ts";
import { claimInvites } from "#/lib/items/service.server.ts";

function createAuth() {
  const env = serverEnv();
  return betterAuth({
    ...authOptions({
      baseURL: env.BASE_URL,
      secret: env.BETTER_AUTH_SECRET,
      db,
      schema,
      github: { clientId: env.GITHUB_CLIENT_ID, clientSecret: env.GITHUB_CLIENT_SECRET },
      google: { clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET },
      billing:
        env.DODO_PAYMENTS_API_KEY &&
        env.DODO_PAYMENTS_WEBHOOK_SECRET &&
        env.DODO_PRO_MONTHLY_PRODUCT_ID
          ? {
              apiKey: env.DODO_PAYMENTS_API_KEY,
              webhookSecret: env.DODO_PAYMENTS_WEBHOOK_SECRET,
              environment:
                env.DODO_PAYMENTS_ENVIRONMENT === "live_mode" ? "live_mode" : "test_mode",
              proProductIds: {
                monthly: env.DODO_PRO_MONTHLY_PRODUCT_ID,
                yearly: env.DODO_PRO_YEARLY_PRODUCT_ID || undefined,
              },
              checkoutDiscounts,
              onSubscription: applySubscriptionEvent,
            }
          : undefined,
    }),
    databaseHooks: {
      user: {
        create: {
          // Items shared with this email before the account existed become visible now.
          after: async (user) => {
            await claimInvites(user.id, user.email);
          },
        },
      },
    },
  });
}

let instance: ReturnType<typeof createAuth> | undefined;

/**
 * The Better Auth instance, created on first use. Workers forbid D1 I/O at module
 * scope and the MCP plugin queries D1 during setup, so it can't be a top-level const.
 */
export function getAuth() {
  if (!instance) {
    const created = (instance = createAuth());
    // Don't keep a failed setup around for the life of the isolate.
    created.$context.catch(() => {
      if (instance === created) instance = undefined;
    });
  }
  return instance;
}
