import { createFileRoute, Link, Outlet, redirect } from "@tanstack/react-router";
import { z } from "zod";

import { Logo } from "#/components/app-shell.tsx";
import { ThemeToggle } from "#/components/theme-toggle.tsx";
import { authQueryOptions } from "#/lib/auth/queries.ts";
import { safeRedirect } from "#/lib/format.ts";
import { APP_NAME } from "#/lib/site.ts";

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
    <div className="flex min-h-svh flex-col">
      <header className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-5 sm:px-8">
        <Logo withName />
        <ThemeToggle />
      </header>
      <main className="flex flex-1 items-center justify-center px-5 pb-16 sm:px-8">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </main>
      <footer className="flex justify-center gap-6 px-5 pb-8 text-xs text-muted-foreground">
        <span>
          © {new Date().getFullYear()} {APP_NAME}
        </span>
        <Link to="/terms" className="hover:text-foreground">
          Terms
        </Link>
        <Link to="/privacy" className="hover:text-foreground">
          Privacy
        </Link>
      </footer>
    </div>
  );
}
