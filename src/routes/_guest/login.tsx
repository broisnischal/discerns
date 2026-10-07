import { createFileRoute, Link } from "@tanstack/react-router";

import { LogoMark } from "#/components/app-shell.tsx";
import { SocialSignInButtons } from "#/components/sign-in-social-buttons.tsx";
import { APP_NAME } from "#/lib/site.ts";

export const Route = createFileRoute("/_guest/login")({
  head: () => ({ meta: [{ title: `Sign in · ${APP_NAME}` }] }),
  component: LoginPage,
});

function LoginPage() {
  const { redirectUrl } = Route.useRouteContext();
  // An MCP client sends people here mid-authorization with its OAuth query attached.
  const forAgent = "client_id" in Route.useSearch();

  return (
    <div className="flex flex-col items-center gap-8 text-center">
      <LogoMark className="size-12" />
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome to {APP_NAME}</h1>
        <p className="text-sm text-pretty text-muted-foreground">
          {forAgent
            ? "Sign in to connect your coding agent."
            : "Sign in, or create your free account in one step."}
        </p>
      </div>
      <SocialSignInButtons callbackURL={redirectUrl} />
      <p className="max-w-xs text-xs leading-5 text-pretty text-muted-foreground">
        By continuing, you agree to the{" "}
        <Link to="/terms" className="text-foreground underline underline-offset-4">
          Terms of Service
        </Link>{" "}
        and acknowledge the{" "}
        <Link to="/privacy" className="text-foreground underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>
    </div>
  );
}
