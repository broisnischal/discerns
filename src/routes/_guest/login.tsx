import { createFileRoute } from "@tanstack/react-router";

import { SocialSignInButtons } from "#/components/sign-in-social-buttons.tsx";

export const Route = createFileRoute("/_guest/login")({
  head: () => ({ meta: [{ title: "Sign in" }] }),
  component: LoginPage,
});

function LoginPage() {
  const { redirectUrl } = Route.useRouteContext();

  return (
    <div className="flex flex-col gap-6 surface p-6 sm:p-8">
      <div className="space-y-1.5 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in</h1>
        <p className="text-sm text-pretty text-muted-foreground">
          New here? Signing in creates your account.
        </p>
      </div>
      <SocialSignInButtons callbackURL={redirectUrl} />
      <p className="text-center text-xs text-pretty text-muted-foreground">
        Everything you save is private until you share it.
      </p>
    </div>
  );
}
