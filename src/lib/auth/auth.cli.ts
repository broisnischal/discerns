// Only for `vpr auth:generate`. The Better Auth CLI runs in Node, where the
// Worker's D1 binding and secrets don't exist.
import { betterAuth } from "better-auth/minimal";

import { authOptions } from "./options";

// mcp() seeds its resource row during setup; without a schema yet that rejects, which is fine here.
process.on("unhandledRejection", () => {});

export const auth = betterAuth(
  authOptions({
    baseURL: "https://discerns.app",
    secret: "cli-only-secret-not-used-for-anything-real",
    db: {} as never,
    github: {},
    google: {},
    // Present only so the generated schema includes the billing fields.
    billing: {
      apiKey: "cli-only",
      webhookSecret: "cli-only",
      environment: "test_mode",
      proProductIds: { monthly: "cli-only", yearly: "cli-only" },
      checkoutDiscounts: async () => [],
      onSubscription: async () => {},
    },
  }),
);
