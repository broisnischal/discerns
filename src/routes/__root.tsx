import { a11yDevtoolsPlugin } from "@tanstack/devtools-a11y/react";
import { TanStackDevtools } from "@tanstack/react-devtools";
import type { QueryClient } from "@tanstack/react-query";
import { ReactQueryDevtoolsPanel } from "@tanstack/react-query-devtools";
import { createRootRouteWithContext, HeadContent, Scripts } from "@tanstack/react-router";
import { TanStackRouterDevtoolsPanel } from "@tanstack/react-router-devtools";
import { createMiddleware } from "@tanstack/react-start";
import { EvlogError } from "evlog";

import { ThemeProvider } from "#/components/theme-provider.tsx";
import { Toaster } from "#/components/ui/toast.tsx";
import { TooltipProvider } from "#/components/ui/tooltip.tsx";
import { authQueryOptions } from "#/lib/auth/queries.ts";
import { APP_DESCRIPTION, APP_NAME } from "#/lib/site.ts";

import appCss from "#/styles.css?url";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  server: {
    middleware: [
      // Turns structured errors from createError() into JSON responses with their
      // status, and records them on the request's wide event.
      createMiddleware().server(async ({ next, context }) => {
        try {
          return await next();
        } catch (error) {
          if (!EvlogError.isEvlogError(error)) throw error;
          context.log.error(error);
          throw Response.json(error.toJSON(), { status: error.status || 500 });
        }
      }),
    ],
  },
  // Every page renders differently signed in, so resolve the session before the first
  // paint. Served from cache after that; the protected layouts revalidate it.
  beforeLoad: async ({ context }) => {
    await context.queryClient.query({ ...authQueryOptions(), staleTime: "static" });
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: APP_NAME,
      },
      {
        name: "description",
        content: APP_DESCRIPTION,
      },
    ],
    links: [
      { rel: "icon", href: "/favicon.svg", type: "image/svg+xml" },
      { rel: "stylesheet", href: appCss },
    ],
  }),
  shellComponent: RootDocument,
});

function RootDocument({ children }: { readonly children: React.ReactNode }) {
  return (
    // suppress since we're updating the "dark" class in ThemeProvider
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <ThemeProvider>
          <TooltipProvider>{children}</TooltipProvider>
          <Toaster />
        </ThemeProvider>

        <TanStackDevtools
          plugins={[
            {
              name: "TanStack Query",
              render: <ReactQueryDevtoolsPanel />,
            },
            {
              name: "TanStack Router",
              render: <TanStackRouterDevtoolsPanel />,
            },
            a11yDevtoolsPlugin(),
          ]}
        />

        <Scripts />
      </body>
    </html>
  );
}
