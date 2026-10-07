import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";

import { ArrowRightIcon, LayersIcon, PlugIcon, PlusIcon } from "#/components/icons.ts";
import { ItemList } from "#/components/item-list.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar.tsx";
import { Button } from "#/components/ui/button.tsx";
import { useAuthSuspense } from "#/lib/auth/hooks.ts";
import { initials } from "#/lib/format.ts";
import { itemListQueryOptions } from "#/lib/items/queries.ts";

const recentQuery = () => itemListQueryOptions({ scope: "all", limit: 5 });

export const Route = createFileRoute("/_auth/app/")({
  loader: async ({ context }) => {
    await context.queryClient.query(recentQuery());
  },
  head: () => ({ meta: [{ title: "Overview" }] }),
  component: Overview,
});

function Overview() {
  const { user } = useAuthSuspense();
  const recent = useQuery(recentQuery());
  const firstName = user?.name.split(/\s+/)[0] ?? "there";

  return (
    <div className="flex flex-col gap-8">
      <header className="flex items-center gap-4 border-b pb-6">
        <Avatar className="size-14 rounded-2xl after:rounded-2xl">
          {user?.image && <AvatarImage src={user.image} alt="" className="rounded-2xl" />}
          <AvatarFallback className="rounded-2xl text-base">
            {initials(user?.name ?? "")}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 space-y-1">
          <h1 className="text-xl font-semibold tracking-tight">
            Hello, <span className="text-selected-foreground">{firstName}</span>{" "}
            <span aria-hidden="true">👋</span>
          </h1>
          <p className="text-sm text-pretty text-muted-foreground">
            Everything you save is private until you share it.
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3" aria-labelledby="recent-heading">
        <div className="flex items-center justify-between gap-3">
          <h2 id="recent-heading" className="flex items-center gap-2 font-medium">
            <LayersIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            Recent items
          </h2>
          <Link
            to="/app/items"
            className="inline-flex items-center gap-1 rounded-md text-sm text-muted-foreground hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
          >
            View all
            <ArrowRightIcon className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {recent.isPending ? (
          <div className="h-40 animate-pulse surface" aria-busy="true" aria-label="Loading items" />
        ) : recent.isError ? (
          <p className="surface p-6 text-sm text-destructive">
            Unable to load items. Refresh the page to try again.
          </p>
        ) : recent.data.length === 0 ? (
          <div className="flex flex-col items-center gap-4 surface p-8 text-center">
            <div className="space-y-1">
              <p className="font-medium">Nothing saved yet</p>
              <p className="text-sm text-pretty text-muted-foreground">
                Paste a prompt, a note, or an env file, or ask your agent to save one for you.
              </p>
            </div>
            <Button render={<Link to="/app/new" />} nativeButton={false}>
              <PlusIcon data-icon="inline-start" aria-hidden="true" />
              New item
            </Button>
          </div>
        ) : (
          <ItemList items={recent.data} />
        )}
      </section>

      <section className="flex flex-col items-center gap-5 surface p-8 text-center">
        <div className="space-y-1">
          <h2 className="flex items-center justify-center gap-2 text-lg font-semibold">
            <PlugIcon className="size-5 text-muted-foreground" aria-hidden="true" />
            Connect your agents
          </h2>
          <p className="max-w-md text-sm text-pretty text-muted-foreground">
            Let Claude Code, Cursor, Codex, and other coding agents save, find, share, and stream
            logs here as you work. Included with Pro.
          </p>
        </div>
        <Button render={<Link to="/app/connect" />} nativeButton={false}>
          Set up an agent
          <ArrowRightIcon data-icon="inline-end" aria-hidden="true" />
        </Button>
      </section>
    </div>
  );
}
