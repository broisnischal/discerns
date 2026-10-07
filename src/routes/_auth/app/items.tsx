import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { z } from "zod";

import {
  FolderIcon,
  LayersIcon,
  PlusIcon,
  SearchIcon,
  UserIcon,
  UsersIcon,
} from "#/components/icons.ts";
import { ItemList } from "#/components/item-list.tsx";
import { KIND_META } from "#/components/kind-badge.tsx";
import { PageHeader } from "#/components/page-header.tsx";
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
import {
  itemListQueryOptions,
  projectsQueryOptions,
  sharersQueryOptions,
} from "#/lib/items/queries.ts";
import { cn } from "#/lib/utils.ts";

const searchSchema = z.object({
  scope: z.enum(["all", "mine", "shared"]).optional().catch(undefined),
  project: z.string().optional().catch(undefined),
  kind: z.enum(ITEM_KINDS).optional().catch(undefined),
  owner: z.string().optional().catch(undefined),
  q: z.string().optional().catch(undefined),
});

export const Route = createFileRoute("/_auth/app/items")({
  validateSearch: searchSchema,
  loaderDeps: ({ search }) => search,
  loader: async ({ context, deps }) => {
    // The list is the whole page, so render it with data: a warmed-but-pending query would
    // leave the server HTML (skeleton) disagreeing with the hydrated client (rows).
    await context.queryClient.query(
      itemListQueryOptions({
        scope: deps.scope ?? "all",
        kind: deps.kind,
        owner: deps.owner,
        query: deps.q,
      }),
    );
  },
  head: () => ({ meta: [{ title: "Items" }] }),
  component: Dashboard,
});

const ALL = "__all";
const KIND_ITEMS = {
  [ALL]: "All kinds",
  ...Object.fromEntries(ITEM_KINDS.map((kind) => [kind, KIND_META[kind].label])),
};

const SCOPES = [
  { value: "all", label: "All", icon: LayersIcon },
  { value: "mine", label: "Mine", icon: UserIcon },
  { value: "shared", label: "Shared with me", icon: UsersIcon },
] as const;

function Dashboard() {
  const { scope = "all", ...search } = Route.useSearch();
  const navigate = useNavigate({ from: Route.fullPath });
  const itemsQuery = useQuery({
    ...itemListQueryOptions({
      scope,
      project: search.project,
      kind: search.kind,
      owner: search.owner,
      query: search.q,
    }),
    placeholderData: keepPreviousData,
  });
  const sharersQuery = useQuery({ ...sharersQueryOptions(), enabled: scope !== "mine" });
  const projects = useQuery(projectsQueryOptions());
  const currentProject = search.project
    ? projects.data?.find((p) => p.id === search.project || p.key === search.project)
    : undefined;

  const setSearch = (patch: Partial<z.infer<typeof searchSchema>>) =>
    navigate({ search: (prev) => ({ ...prev, ...patch }), replace: true });
  const [query, setQuery] = useState(search.q ?? "");
  const debounce = useRef<number>(undefined);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        back={
          currentProject
            ? { to: "/app/items", label: "All items" }
            : { to: "/app", label: "Overview" }
        }
        icon={currentProject ? FolderIcon : LayersIcon}
        title={currentProject?.name ?? "Items"}
        subtitle={
          currentProject
            ? (currentProject.key ?? "No repository linked")
            : "Everything you saved, and everything shared with you."
        }
        actions={
          <Button
            render={<Link to="/app/new" search={{ project: currentProject?.id }} />}
            nativeButton={false}
            size="sm"
          >
            <PlusIcon aria-hidden="true" />
            New item
          </Button>
        }
      />

      {/* Project chips: the folder filter is one tap away without the sidebar. */}
      {projects.data && projects.data.length > 0 && (
        <div className="-mx-5 flex gap-1.5 overflow-x-auto px-5 sm:-mx-8 sm:px-8 md:mx-0 md:flex-wrap md:px-0">
          <Chip active={!search.project} onClick={() => setSearch({ project: undefined })}>
            All
          </Chip>
          {projects.data.map((p) => (
            <Chip
              key={p.id}
              active={search.project === p.id}
              onClick={() => setSearch({ project: p.id })}
            >
              <FolderIcon className="size-3.5" aria-hidden="true" />
              {p.name}
            </Chip>
          ))}
          <Chip
            active={search.project === "unfiled"}
            onClick={() => setSearch({ project: "unfiled" })}
          >
            Unfiled
          </Chip>
        </div>
      )}

      <Tabs
        value={scope}
        onValueChange={(scope) =>
          setSearch({ scope, owner: scope === "mine" ? undefined : search.owner })
        }
      >
        <TabsList variant="line" className="border-b pb-1" aria-label="Which items">
          {SCOPES.map((s) => (
            <TabsTrigger key={s.value} value={s.value} className="gap-2 px-2 text-[15px]">
              <s.icon aria-hidden="true" />
              {s.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap gap-3">
        <div className="relative min-w-48 flex-1" role="search">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => {
              const next = e.target.value;
              setQuery(next);
              // Search as you type, but only hit the server once typing pauses.
              window.clearTimeout(debounce.current);
              debounce.current = window.setTimeout(
                () => setSearch({ q: next.trim() || undefined }),
                250,
              );
            }}
            placeholder="Search titles, tags, and text"
            aria-label="Search items"
            autoComplete="off"
            className="h-9 ps-9"
          />
        </div>
        <Select
          value={search.kind ?? ALL}
          onValueChange={(kind) =>
            setSearch({ kind: kind === ALL ? undefined : (kind as (typeof ITEM_KINDS)[number]) })
          }
          // Labels are known up front, so the server renders the chosen one and hydration matches.
          items={KIND_ITEMS}
        >
          <SelectTrigger className="h-9 w-36" aria-label="Kind">
            <SelectValue />
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
            items={{
              [ALL]: "Anyone",
              ...Object.fromEntries(sharersQuery.data.map((s) => [s.email, s.name])),
            }}
          >
            <SelectTrigger className="h-9 w-44" aria-label="Shared by">
              <SelectValue />
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

      <div role="status" aria-live="polite" className="sr-only" suppressHydrationWarning>
        {itemsQuery.data ? `${itemsQuery.data.length} items` : ""}
      </div>

      {itemsQuery.isPending ? (
        <ListSkeleton />
      ) : itemsQuery.isError ? (
        <p className="surface p-6 text-sm text-destructive">
          Unable to load items. Refresh the page to try again.
        </p>
      ) : itemsQuery.data.length === 0 ? (
        <EmptyState filtered={Boolean(search.q || search.kind || search.owner)} scope={scope} />
      ) : (
        <ItemList items={itemsQuery.data} />
      )}
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs font-medium whitespace-nowrap transition-colors duration-150 focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none",
        active
          ? "bg-selected text-selected-foreground"
          : "bg-muted text-muted-foreground hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function ListSkeleton() {
  return (
    <div className="divide-y surface" aria-busy="true" aria-label="Loading items">
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex items-center gap-4 px-4 py-3 sm:px-5">
          <div className="size-10 animate-pulse rounded-xl bg-muted" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ filtered, scope }: { filtered: boolean; scope: string }) {
  if (filtered) {
    return (
      <p className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Nothing matches these filters.
      </p>
    );
  }
  if (scope === "shared") {
    return (
      <p className="rounded-3xl border border-dashed p-10 text-center text-sm text-muted-foreground">
        Nothing has been shared with you yet.
      </p>
    );
  }
  return (
    <div className="flex flex-col items-center gap-5 rounded-3xl border border-dashed p-10 text-center">
      <span
        aria-hidden="true"
        className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"
      >
        <LayersIcon className="size-7" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">Save your first item</p>
        <p className="text-sm text-pretty text-muted-foreground">
          Paste a prompt, a note, or an env file, or ask your agent to save one for you.
        </p>
      </div>
      <div className="flex gap-3">
        <Button render={<Link to="/app/new" />} nativeButton={false}>
          <PlusIcon data-icon="inline-start" aria-hidden="true" />
          New item
        </Button>
        <Button render={<Link to="/app/connect" />} nativeButton={false} variant="outline">
          Connect an agent
        </Button>
      </div>
    </div>
  );
}
