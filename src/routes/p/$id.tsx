import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { EyeIcon, EyeOffIcon, FileDownIcon, PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

import { AppHeader } from "#/components/app-header.tsx";
import { CopyButton } from "#/components/copy-button.tsx";
import { HistoryPanel } from "#/components/history-panel.tsx";
import { VISIBILITY_META } from "#/components/item-list.tsx";
import { KindBadge } from "#/components/kind-badge.tsx";
import { ShareDialog } from "#/components/share-dialog.tsx";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#/components/ui/alert-dialog.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "#/components/ui/tabs.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { useAuth } from "#/lib/auth/hooks.ts";
import { initials, timeAgo } from "#/lib/format.ts";
import { $deleteItem } from "#/lib/items/functions.ts";
import { itemKeys, itemQueryOptions } from "#/lib/items/queries.ts";
import type { ItemDetail } from "#/lib/items/service.server.ts";

export const Route = createFileRoute("/p/$id")({
  loader: async ({ context, params }) => {
    // Missing and not-shared items look the same on purpose, and both answer 404.
    await context.queryClient.query(itemQueryOptions(params.id)).catch(() => {
      throw notFound();
    });
  },
  head: () => ({ meta: [{ name: "robots", content: "noindex" }] }),
  component: ItemPage,
  notFoundComponent: ItemError,
});

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}

function ItemPage() {
  const { id } = Route.useParams();
  const { data: item } = useSuspenseQuery(itemQueryOptions(id));
  const isCollaborator = item.access !== "public";
  const canEdit = item.access === "owner" || item.access === "editor";
  const Visibility = VISIBILITY_META[item.visibility].icon;

  return (
    <Shell>
      <article className="flex flex-col gap-6">
        <header className="flex flex-col gap-4">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <h1 className="min-w-0 text-2xl font-semibold tracking-tight break-words">
              {item.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2">
              <CopyButton value={item.content} />
              {item.kind !== "env" && (
                <Button
                  render={<a href={`/raw/${item.id}`} target="_blank" rel="noreferrer" />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  <FileDownIcon aria-hidden="true" />
                  Raw
                </Button>
              )}
              {canEdit && (
                <Button
                  render={<Link to="/p/$id/edit" params={{ id: item.id }} />}
                  nativeButton={false}
                  variant="outline"
                  size="sm"
                >
                  <PencilIcon aria-hidden="true" />
                  Edit
                </Button>
              )}
              {item.access === "owner" && (
                <>
                  <ShareDialog item={item} />
                  <DeleteButton item={item} />
                </>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-2">
              <Avatar size="sm" className="size-5">
                {item.owner.image && <AvatarImage src={item.owner.image} alt="" />}
                <AvatarFallback className="text-[0.6rem]">
                  {initials(item.owner.name)}
                </AvatarFallback>
              </Avatar>
              {item.owner.name}
            </span>
            <KindBadge kind={item.kind} />
            <span className="inline-flex items-center gap-1">
              <Visibility className="size-3.5" aria-hidden="true" />
              {VISIBILITY_META[item.visibility].label}
            </span>
            <span className="tabular-nums">
              v{item.version}, updated {timeAgo(item.updatedAt)}
            </span>
            {item.access === "editor" && <span>You can edit</span>}
            {item.access === "viewer" && <span>Shared with you</span>}
            {item.tags.map((tag) => (
              <Link
                key={tag}
                to="/app"
                search={{ scope: "all", q: tag }}
                className="hover:text-foreground"
              >
                #{tag}
              </Link>
            ))}
          </div>
        </header>

        {isCollaborator ? (
          <Tabs defaultValue="content">
            <TabsList>
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="history">History</TabsTrigger>
            </TabsList>
            <TabsContent value="content" className="pt-4">
              <ItemContent item={item} />
            </TabsContent>
            <TabsContent value="history" className="pt-4">
              <HistoryPanel item={item} />
            </TabsContent>
          </Tabs>
        ) : (
          <ItemContent item={item} />
        )}
      </article>
    </Shell>
  );
}

function ItemContent({ item }: { item: ItemDetail }) {
  const [revealed, setRevealed] = useState(item.kind !== "env");
  const content = revealed ? item.content : maskEnv(item.content);

  return (
    <div className="relative">
      {item.kind === "env" && (
        <Button
          variant="secondary"
          size="sm"
          className="absolute top-3 right-3"
          onClick={() => setRevealed((value) => !value)}
        >
          {revealed ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
          {revealed ? "Hide values" : "Show values"}
        </Button>
      )}
      <pre
        className="min-h-40 overflow-x-auto rounded-xl border bg-muted/40 p-4 font-mono text-sm leading-relaxed break-words whitespace-pre-wrap"
        data-language={item.language ?? undefined}
      >
        {content}
      </pre>
    </div>
  );
}

/** Keeps env keys and comments readable while hiding the values. */
export function maskEnv(content: string) {
  return content
    .split("\n")
    .map((line) => {
      const match = /^(\s*(?:export\s+)?[\w.-]+\s*=\s*)(.*)$/.exec(line);
      if (!match || line.trimStart().startsWith("#")) return line;
      return match[2] ? `${match[1]}${"•".repeat(Math.min(match[2].length, 24))}` : line;
    })
    .join("\n");
}

function DeleteButton({ item }: { item: ItemDetail }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: $deleteItem,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: itemKeys.detail(item.id) });
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      await navigate({ to: "/app" });
      toast.add({ type: "success", description: "Item deleted." });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" size="sm" />}>
        <Trash2Icon aria-hidden="true" />
        Delete
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete &ldquo;{item.title}&rdquo;?</AlertDialogTitle>
          <AlertDialogDescription>
            This removes the item, its history, and everyone&apos;s access. It can&apos;t be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            variant="destructive"
            disabled={mutation.isPending}
            onClick={() => mutation.mutate({ data: { id: item.id } })}
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function ItemError() {
  const { id } = Route.useParams();
  const { user, isPending } = useAuth();

  return (
    <Shell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <h1 className="text-xl font-semibold">This item isn&apos;t available</h1>
        <p className="text-sm text-balance text-muted-foreground">
          {user
            ? "It doesn't exist, or it hasn't been shared with your account."
            : "It may be private. Sign in with the account it was shared with."}
        </p>
        {!user && !isPending && (
          <Button
            render={<Link to="/login" search={{ redirect: `/p/${id}` }} />}
            nativeButton={false}
          >
            Sign in
          </Button>
        )}
      </div>
    </Shell>
  );
}
