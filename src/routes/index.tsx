import { createFileRoute, Link } from "@tanstack/react-router";
import { BotIcon, HistoryIcon, LockIcon, UsersIcon } from "lucide-react";

import { AppHeader } from "#/components/app-header.tsx";
import { Button } from "#/components/ui/button.tsx";
import { useAuth } from "#/lib/auth/hooks.ts";

export const Route = createFileRoute("/")({
  component: HomePage,
});

const FEATURES = [
  {
    icon: BotIcon,
    title: "Claude reads and writes it",
    body: "Connect once over MCP. Say “save this prompt and share it with Sam” and it happens.",
  },
  {
    icon: UsersIcon,
    title: "Share with people, not links",
    body: "Add collaborators by email as viewers or editors. They see it in their list and in their Claude.",
  },
  {
    icon: LockIcon,
    title: "Env files stay private",
    body: "Env items are encrypted at rest and can only be shared with named people.",
  },
  {
    icon: HistoryIcon,
    title: "Every edit is kept",
    body: "Each save is a version, whether it came from you, a teammate, or Claude. Restore any of them.",
  },
];

function HomePage() {
  const { user } = useAuth();

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-16 px-4 py-16 md:py-24">
        <section className="flex max-w-2xl flex-col gap-6">
          <h1 className="text-4xl font-semibold tracking-tight text-balance md:text-5xl">
            A shared clipboard for you, your team, and Claude
          </h1>
          <p className="text-lg text-balance text-muted-foreground">
            Save prompts, memories, snippets, and env files. Share them with collaborators, and let
            Claude find and update them for you.
          </p>
          <div className="flex flex-wrap gap-2">
            {user ? (
              <Button render={<Link to="/app" />} nativeButton={false} size="lg">
                Open your items
              </Button>
            ) : (
              <Button render={<Link to="/login" />} nativeButton={false} size="lg">
                Sign in with Google or GitHub
              </Button>
            )}
            <Button
              render={<Link to="/app/connect" />}
              nativeButton={false}
              size="lg"
              variant="outline"
            >
              Connect Claude
            </Button>
          </div>
        </section>

        <section className="grid gap-8 sm:grid-cols-2">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="flex gap-4">
              <feature.icon
                className="mt-0.5 size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="space-y-1">
                <h2 className="font-medium">{feature.title}</h2>
                <p className="text-sm text-muted-foreground">{feature.body}</p>
              </div>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
