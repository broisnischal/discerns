import { drizzleAdapter } from "@better-auth/drizzle-adapter/relations-v2";
import { mcp } from "@better-auth/mcp";
import type { BetterAuthOptions } from "better-auth";
import { createAuthMiddleware } from "better-auth/api";
import { jwt } from "better-auth/plugins";
import { tanstackStartCookies } from "better-auth/tanstack-start";

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

interface Credentials {
  clientId?: string;
  clientSecret?: string;
}

export function authOptions(config: {
  baseURL: string;
  secret: string;
  db: Parameters<typeof drizzleAdapter>[0];
  schema?: Record<string, unknown>;
  github: Credentials;
  google: Credentials;
}) {
  const { github, google } = config;

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
      // Claude Code registers http://localhost redirect URIs without application_type,
      // which Better Auth treats as "web" and rejects. Loopback-only clients are native apps.
      before: createAuthMiddleware(async (ctx) => {
        if (ctx.path !== "/oauth2/register") return;
        const body = (ctx.body ?? {}) as { application_type?: string; redirect_uris?: string[] };
        if (
          !body.application_type &&
          body.redirect_uris?.length &&
          body.redirect_uris.every(isLoopback)
        ) {
          return { context: { body: { ...body, application_type: "native" } } };
        }
      }),
    },

    plugins: [
      tanstackStartCookies(),
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
        // Claude registers itself with dynamic client registration on every new connection.
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        // Limits are per IP, and every claude.ai token or registration call comes from Anthropic's range.
        rateLimit: { token: { window: 60, max: 120 }, register: { window: 60, max: 30 } },
      }),
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
