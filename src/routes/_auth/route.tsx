import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

import { AppShell } from "#/components/app-shell.tsx";
import { authQueryOptions } from "#/lib/auth/queries.ts";

/**
 * This is the _auth layout, which enables 'protected routes'
 * for all child routes under _auth (e.g. _auth/app/*)
 */
export const Route = createFileRoute("/_auth")({
  beforeLoad: async ({ context, location }) => {
    /**
     * beforeLoad runs on every navigation and prefetch, so we use TanStack Query
     * for client-side caching to speed up navigation, reducing client-to-server calls.
     *
     * This is NOT a server-side security guarantee. Server functions enforce auth
     * with authMiddleware, see `/lib/auth/middleware.ts`.
     */
    const user = await context.queryClient.query({
      ...authQueryOptions(),
      staleTime: "static",
    });
    void context.queryClient.query(authQueryOptions());

    if (!user) {
      throw redirect({ to: "/login", search: { redirect: location.href } });
    }
  },
  component: AuthLayout,
});

function AuthLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
