import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { dodopaymentsClient } from "@dodopayments/better-auth/client";
import { createAuthClient } from "better-auth/react";

/**
 * https://better-auth.com/docs/concepts/client
 *
 * Our better-auth server instance lives in the TanStack Start server,
 * so authClient should only be used on the client (event handlers, effects, etc).
 *
 * For server/SSR operations, prefer `auth.api` instead, and wrap in a serverFn if needed.
 *
 * oauthProviderClient carries the signed OAuth query through sign-in and consent,
 * so an agent's MCP authorization resumes after the user signs in.
 */
export const authClient = createAuthClient({
  baseURL: import.meta.env.VITE_BASE_URL,
  plugins: [oauthProviderClient(), dodopaymentsClient()],
});
