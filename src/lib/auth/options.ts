import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { mcp } from "@better-auth/mcp";
import { checkout, dodopayments, portal, webhooks } from "@dodopayments/better-auth";
import type { Subscription } from "@dodopayments/core";
import type { BetterAuthOptions } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";
import DodoPayments from "dodopayments";

import { PRO_PRICES, type BillingInterval } from "../billing/plan.ts";

/**
 * Shared Better Auth configuration. Kept free of `cloudflare:workers` imports so
 * the Better Auth CLI can load it (see auth.cli.ts) to generate the schema.
 */

export const MCP_SCOPES = ["items:read", "items:write"];

const isLoopback = (uri: string) => {
  try {
    const url = new URL(uri);
    return url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  } catch {
    return false;
  }
};

const isPrivateUseScheme = (uri: string) => {
  try {
    return !["http:", "https:"].includes(new URL(uri).protocol);
  } catch {
    return false;
  }
};

/**
 * Agent callbacks that break RFC 8252 (a custom scheme with a naming authority), which client
 * registration rejects. Each registers under a spec-valid alias and is accepted at
 * authorization only as this exact URI, so this is not a general relaxation.
 */
const AGENT_CALLBACK_ALIASES: Record<string, string> = {
  "cursor://anysphere.cursor-mcp/oauth/callback": "com.anysphere.cursor-mcp:/oauth/callback",
};

interface Credentials {
  clientId?: string;
  clientSecret?: string;
}

export interface BillingConfig {
  apiKey: string;
  webhookSecret: string;
  environment: "test_mode" | "live_mode";
  /** Dodo product ids for each Pro price. Yearly is optional until it exists in Dodo. */
  proProductIds: Record<BillingInterval, string | undefined>;
  /** Discount codes the server applies to this user's checkout for this product slug. */
  checkoutDiscounts: (userId: string, slug: string) => Promise<string[]>;
  /** Called for every subscription webhook so the app can store the plan. */
  onSubscription: (event: string, subscription: Subscription) => Promise<void>;
}

export function authOptions(config: {
  baseURL: string;
  secret: string;
  db: Parameters<typeof drizzleAdapter>[0];
  schema?: Record<string, unknown>;
  github: Credentials;
  google: Credentials;
  /** Billing is optional so local dev works without payment keys. */
  billing?: BillingConfig;
}) {
  const { github, google, billing } = config;
  const subscriptionHook = (event: string) => async (payload: { data: Subscription }) => {
    await billing?.onSubscription(event, payload.data);
  };

  return {
    baseURL: config.baseURL,
    secret: config.secret,
    telemetry: { enabled: false },
    database: drizzleAdapter(config.db, { provider: "sqlite", schema: config.schema }),

    // https://better-auth.com/docs/concepts/session-management#session-caching
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 5 * 60, // 5 minutes
      },
    },

    // A provider is only offered once its credentials are set as Worker secrets.
    socialProviders: {
      ...(github.clientId &&
        github.clientSecret && {
          github: { clientId: github.clientId, clientSecret: github.clientSecret },
        }),
      ...(google.clientId &&
        google.clientSecret && {
          google: { clientId: google.clientId, clientSecret: google.clientSecret },
        }),
    },

    // Google and GitHub sign-ins with the same verified email land in one account.
    account: {
      accountLinking: { enabled: true, trustedProviders: ["google", "github"] },
    },

    hooks: {
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path === "/dodopayments/checkout-session") {
          // The plugin forwards the whole request body to Dodo, so a caller could add their own
          // discount codes, free trials, or payment details. Accept only the product slug;
          // discounts are decided here. Returned context is merged into the body, so extra
          // fields must be rejected rather than dropped.
          const body = (ctx.body ?? {}) as Record<string, unknown>;
          if (typeof body.slug !== "string" || Object.keys(body).some((key) => key !== "slug")) {
            throw new APIError("BAD_REQUEST", { message: "Only a product slug is accepted" });
          }
          const session = await getSessionFromCtx(ctx);
          const discountCodes =
            session && billing ? await billing.checkoutDiscounts(session.user.id, body.slug) : [];
          if (discountCodes.length > 0)
            return { context: { body: { discount_codes: discountCodes } } };
          return;
        }
        if (ctx.path !== "/oauth2/register") return;
        const body = (ctx.body ?? {}) as { application_type?: string; redirect_uris?: string[] };
        if (!body.redirect_uris?.length) return;
        const redirectUris = body.redirect_uris.map((uri) => AGENT_CALLBACK_ALIASES[uri] ?? uri);
        // Coding agents register loopback or app-scheme callbacks without application_type,
        // which Better Auth treats as "web" and rejects. They are native apps.
        const native =
          !body.application_type &&
          redirectUris.some((uri) => isLoopback(uri) || isPrivateUseScheme(uri));
        return {
          context: {
            body: {
              ...body,
              redirect_uris: redirectUris,
              ...(native && { application_type: "native" }),
            },
          },
        };
      }),
      after: createAuthMiddleware(async (ctx) => {
        // The MCP resource server fetches this JWKS to verify access tokens; src/server.ts
        // keeps it in the Cache API for this long. Short enough that a new key is picked up
        // quickly, long enough that token checks rarely reach the database.
        if (ctx.path === "/jwks") ctx.setHeader("Cache-Control", "public, max-age=300");
      }),
    },

    plugins: [
      // Signs MCP access tokens and serves /api/auth/jwks.
      jwt(),
      // OAuth 2.1 authorization server for the MCP endpoint at /mcp.
      // https://www.better-auth.com/docs/plugins/mcp
      mcp({
        loginPage: "/login",
        consentPage: "/oauth/consent",
        resource: `${config.baseURL}/mcp`,
        scopes: ["openid", "profile", "email", "offline_access", ...MCP_SCOPES],
        grantTypes: ["authorization_code", "refresh_token"],
        // Accept an aliased agent callback only for clients registered with its alias.
        validateRedirectUri: (uri, registeredUris, defaultResult) =>
          defaultResult ||
          (uri in AGENT_CALLBACK_ALIASES && registeredUris.includes(AGENT_CALLBACK_ALIASES[uri]!)),
        // Agents register themselves with dynamic client registration on every new connection.
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        // Limits are per IP, and every claude.ai token or registration call comes from Anthropic's range.
        rateLimit: { token: { window: 60, max: 120 }, register: { window: 60, max: 30 } },
      }),
      ...(billing
        ? [
            dodopayments({
              client: new DodoPayments({
                bearerToken: billing.apiKey,
                environment: billing.environment,
              }),
              createCustomerOnSignUp: true,
              getCustomerParams: (user) => ({ metadata: { userId: user.id } }),
              use: [
                checkout({
                  products: (Object.keys(PRO_PRICES) as BillingInterval[]).flatMap((interval) => {
                    const productId = billing.proProductIds[interval];
                    return productId ? [{ productId, slug: PRO_PRICES[interval].slug }] : [];
                  }),
                  successUrl: "/app/settings?billing=success",
                  authenticatedUsersOnly: true,
                }),
                portal(),
                webhooks({
                  webhookKey: billing.webhookSecret,
                  onSubscriptionActive: subscriptionHook("active"),
                  onSubscriptionRenewed: subscriptionHook("renewed"),
                  onSubscriptionPlanChanged: subscriptionHook("plan_changed"),
                  onSubscriptionUpdated: subscriptionHook("updated"),
                  onSubscriptionOnHold: subscriptionHook("on_hold"),
                  onSubscriptionPaused: subscriptionHook("paused"),
                  onSubscriptionUnpaused: subscriptionHook("unpaused"),
                  onSubscriptionCancelled: subscriptionHook("cancelled"),
                  onSubscriptionExpired: subscriptionHook("expired"),
                  onSubscriptionFailed: subscriptionHook("failed"),
                }),
              ],
            }),
          ]
        : []),
      // Must stay last so cookies set by the plugins above reach the framework cookie store.
      tanstackStartCookies(),
    ],

    advanced: {
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
      database: {
        // https://better-auth.com/docs/adapters/drizzle#joins
        joins: true,
      },
    },
  } satisfies BetterAuthOptions;
}
