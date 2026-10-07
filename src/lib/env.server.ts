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
  };
}
