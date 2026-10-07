import { createFileRoute } from "@tanstack/react-router";

import { SocialSignInButtons } from "#/components/sign-in-social-buttons.tsx";

export const Route = createFileRoute("/_guest/login")({
  component: LoginPage,
});

function LoginPage() {
  const { redirectUrl } = Route.useRouteContext();

  return (
    <div className="flex flex-col gap-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-balance text-muted-foreground">
          New here? Signing in creates your account.
        </p>
      </div>
      <SocialSignInButtons callbackURL={redirectUrl} />
      <p className="text-center text-xs text-balance text-muted-foreground">
        Everything you save is private until you share it.
      </p>
    </div>
  );
}
