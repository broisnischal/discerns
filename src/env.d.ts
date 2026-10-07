/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Public origin, e.g. https://discerns.app. Set in .env.development / .env.production. */
  readonly VITE_BASE_URL: string;
}

declare namespace Cloudflare {
  // Optional secrets aren't listed in wrangler.jsonc `secrets.required`,
  // so `wrangler types` doesn't generate them.
  interface Env {
    GITHUB_CLIENT_ID?: string;
    GITHUB_CLIENT_SECRET?: string;
    GOOGLE_CLIENT_ID?: string;
    GOOGLE_CLIENT_SECRET?: string;
  }
}
