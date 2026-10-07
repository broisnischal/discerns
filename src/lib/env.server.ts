import "@tanstack/react-start/server-only";
import { env } from "cloudflare:workers";

/**
 * Server configuration. Secrets come from the Worker env (`.dev.vars` locally,
 * `wrangler secret put` in production); the public origin is inlined by Vite
 * from `.env.development` / `.env.production`.
 */
export function serverEnv() {
  return {
    BASE_URL: import.meta.env.VITE_BASE_URL,
    BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET,
    ENCRYPTION_KEY: env.ENCRYPTION_KEY,
    GITHUB_CLIENT_ID: env.GITHUB_CLIENT_ID,
    GITHUB_CLIENT_SECRET: env.GITHUB_CLIENT_SECRET,
    GOOGLE_CLIENT_ID: env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: env.GOOGLE_CLIENT_SECRET,
    DODO_PAYMENTS_API_KEY: env.DODO_PAYMENTS_API_KEY,
    DODO_PAYMENTS_WEBHOOK_SECRET: env.DODO_PAYMENTS_WEBHOOK_SECRET,
    /** "test_mode" or "live_mode". */
    DODO_PAYMENTS_ENVIRONMENT: env.DODO_PAYMENTS_ENVIRONMENT,
    /** The Pro subscription products in Dodo, one per billing interval. */
    DODO_PRO_MONTHLY_PRODUCT_ID: env.DODO_PRO_MONTHLY_PRODUCT_ID,
    DODO_PRO_YEARLY_PRODUCT_ID: env.DODO_PRO_YEARLY_PRODUCT_ID,
    /** Dodo discount code for the first-month intro price; optional. */
    DODO_INTRO_DISCOUNT_CODE: env.DODO_INTRO_DISCOUNT_CODE,
  };
}
