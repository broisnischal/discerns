import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { PlusIcon, SearchIcon } from "lucide-react";
import { z } from "zod";

import { ItemList } from "#/components/item-list.tsx";
import { KIND_META } from "#/components/kind-badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select.tsx";
import { Tabs, TabsList, TabsTrigger } from "#/components/ui/tabs.tsx";
import { ITEM_KINDS } from "#/lib/db/schema/types.ts";
import { itemListQueryOptions, sharersQueryOptions } from "#/lib/items/queries.ts";

const searchSchema = z.object({
  scope: z.enum(["all", "mine", "shared"]).optional().catch(undefined),
  kind: z.enum(ITEM_KINDS).optional().catch(undefined),
  owner: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_auth/app/")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: ({ context, deps }) => {
    // The item list is the main thing people come here for, so start it early.
    void context.queryClient
      .query(
        itemListQueryOptions({
          scope: deps.scope ?? "all",
          kind: deps.kind,
          owner: deps.owner,
          query: deps.q,
        }),
      )
      .catch(() => {});
  },
  component: Dashboard,
});

const ALL = "__all";

function Dashboard() {
  const { scope = "all", ...search } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const itemsQuery = useQuery({
    ...itemListQueryOptions({
      scope,
      kind: search.kind,
      owner: search.owner,
      query: search.q,
    }),
    placeholderData: keepPreviousData,
  });
  const sharersQuery = useQuery({ ...sharersQueryOptions(), enabled: scope !== "mine" });

  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Items</h1>
          <p className="text-sm text-muted-foreground">
            Everything you saved, and everything shared with you.
          </p>
        </div>
        <Tabs
          value={scope}
          onValueChange={(scope) =>
            setSearch({ scope, owner: scope === "mine" ? undefined : search.owner })
          }
        >
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="mine">Mine</TabsTrigger>
            <TabsTrigger value="shared">Shared with me</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex flex-wrap gap-2">
        <form
          className="relative min-w-48 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("q");
            setSearch({ q: typeof q === "string" && q ? q : undefined });
          }}
        >
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            name="q"
            type="search"
            defaultValue={search.q}
            placeholder="Search titles, tags, and text"
            aria-label="Search items"
            className="pl-8"
          />
        </form>
        <Select
          value={search.kind ?? ALL}
          onValueChange={(kind) =>
            setSearch({ kind: kind === ALL ? undefined : (kind as (typeof ITEM_KINDS)[number]) })
          }
        >
          <SelectTrigger className="w-36" aria-label="Kind">
            <SelectValue>
              {(value: string) =>
                value === ALL ? "All kinds" : KIND_META[value as (typeof ITEM_KINDS)[number]].label
              }
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All kinds</SelectItem>
            {ITEM_KINDS.map((kind) => (
              <SelectItem key={kind} value={kind}>
                {KIND_META[kind].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {scope !== "mine" && sharersQuery.data && sharersQuery.data.length > 0 && (
          <Select
            value={search.owner ?? ALL}
            onValueChange={(owner) =>
              setSearch({ owner: owner === ALL ? undefined : (owner as string) })
            }
          >
            <SelectTrigger className="w-44" aria-label="Shared by">
              <SelectValue>
                {(value: string) =>
                  value === ALL
                    ? "Anyone"
                    : (sharersQuery.data.find((s) => s.email === value)?.name ?? value)
                }
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Anyone</SelectItem>
              {sharersQuery.data.map((sharer) => (
                <SelectItem key={sharer.id} value={sharer.email}>
                  {sharer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {itemsQuery.isPending ? (
        <ListSkeleton />
      ) : itemsQuery.isError ? (
        <p className="rounded-xl border p-6 text-sm text-destructive">
          Couldn&apos;t load items. Refresh the page to try again.
        </p>
      ) : itemsQuery.data.length === 0 ? (
        <EmptyState filtered={Boolean(search.q || search.kind || search.owner)} scope={scope} />
      ) : (
        <ItemList items={itemsQuery.data} />
      )}
    </div>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y rounded-xl border" aria-busy="true" aria-label="Loading items">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2 px-4 py-4">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filtered, scope }: { filtered: boolean; scope: string }) {
  if (filtered) {
    return (
      <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Nothing matches these filters.
      </p>
    );
  }
  if (scope === "shared") {
    return (
      <p className="rounded-xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Nothing has been shared with you yet.
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center gap-4 rounded-xl border border-dashed p-10 text-center">
      <div className="space-y-1">
        <p className="font-medium">Save your first item</p>
        <p className="text-sm text-balance text-muted-foreground">
          Paste a prompt, a note, or an env file, or ask Claude to save one for you.
        </p>
      </div>
      <div className="flex gap-2">
        <Button render={<Link to="/app/new" />} nativeButton={false}>
          <PlusIcon aria-hidden="true" />
          New item
        </Button>
        <Button render={<Link to="/app/connect" />} nativeButton={false} variant="outline">
          Connect Claude
        </Button>
      </div>
    </div>
  );
}
