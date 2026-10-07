import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { Logo } from "#/components/app-header.tsx";
import { authQueryOptions } from "#/lib/auth/queries.ts";
import { safeRedirect } from "#/lib/format.ts";

export const Route = createFileRoute("/_guest")({
  // Loose so the signed OAuth query survives when an MCP client sends people here to sign in.
  validateSearch: z.looseObject({ redirect: z.string().optional() }),
  beforeLoad: async ({ context, search }) => {
    // Where to go when the user is already signed in, or after signing in
    const redirectUrl = safeRedirect(search.redirect);

    const user = await context.queryClient.query({
      ...authQueryOptions(),
      staleTime: "static",
    });
    void context.queryClient.query(authQueryOptions());

    if (user) {
      throw redirect({ href: redirectUrl });
    }

    return { redirectUrl };
  },
  component: GuestLayout,
});

function GuestLayout() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-8 bg-background p-6 md:p-10">
      <Logo />
      <div className="w-full max-w-sm">
        <Outlet />
      </div>
    </div>
  );
}
