import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState } from "react";

import { AppShell } from "#/components/app-shell.tsx";
import { CodeEditor, languageFor } from "#/components/code-editor.tsx";
import { CopyButton } from "#/components/copy-button.tsx";
import { HistoryPanel } from "#/components/history-panel.tsx";
import {
  EllipsisIcon,
  EyeIcon,
  EyeOffIcon,
  FileDownIcon,
  FileTextIcon,
  FolderIcon,
  HistoryIcon,
  LockIcon,
  PencilIcon,
  Trash2Icon,
} from "#/components/icons.ts";
import { VISIBILITY_META } from "#/components/item-list.tsx";
import { KindIcon } from "#/components/kind-badge.tsx";
import { LogViewer } from "#/components/log-viewer.tsx";
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
} from "#/components/ui/alert-dialog.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
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

function ItemPage() {
  const { id } = Route.useParams();
  const { data: item } = useSuspenseQuery(itemQueryOptions(id));
  const isCollaborator = item.access !== "public";
  const canEdit = item.access === "owner" || item.access === "editor";
  const Visibility = VISIBILITY_META[item.visibility].icon;

  return (
    <AppShell>
      <article className="flex flex-col gap-5">
        {/* Title block: icon and text share one top edge; everything else lives in the toolbar. */}
        <header className="flex items-start gap-4">
          <KindIcon kind={item.kind} size="lg" />
          <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
            <h1 className="text-xl leading-tight font-semibold tracking-tight break-words">
              {item.title}
            </h1>
            {/* Each item draws its own dot in the gap before it; the clipped leading edge hides
                the dot of whichever item starts a line, so wrapping never strands one. */}
            <p className="flex flex-wrap items-center gap-x-4 gap-y-1 overflow-x-clip text-sm text-muted-foreground [&>*]:relative [&>*]:before:absolute [&>*]:before:-start-2.5 [&>*]:before:text-muted-foreground/50 [&>*]:before:content-['·']">
              <span className="inline-flex items-center gap-1.5 whitespace-nowrap">
                <Avatar size="sm" className="size-4">
                  {item.owner.image && <AvatarImage src={item.owner.image} alt="" />}
                  <AvatarFallback className="text-[0.5rem]">
                    {initials(item.owner.name)}
                  </AvatarFallback>
                </Avatar>
                {item.owner.name}
              </span>
              {item.project && (
                <Link
                  to="/app/items"
                  search={{ project: item.project.id }}
                  className="inline-flex items-center gap-1 rounded-md whitespace-nowrap hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                >
                  <FolderIcon className="size-3.5" aria-hidden="true" />
                  {item.project.name}
                </Link>
              )}
              <span className="inline-flex items-center gap-1 whitespace-nowrap">
                <Visibility className="size-3.5" aria-hidden="true" />
                {VISIBILITY_META[item.visibility].label}
              </span>
              <span className="whitespace-nowrap tabular-nums" suppressHydrationWarning>
                {item.kind === "log" ? "Updated" : `v${item.version} · updated`}{" "}
                {timeAgo(item.updatedAt)}
              </span>
              {item.access === "editor" && <span className="whitespace-nowrap">You can edit</span>}
              {item.access === "viewer" && (
                <span className="whitespace-nowrap">Shared with you</span>
              )}
            </p>
            {item.tags.length > 0 && (
              <ul className="flex flex-wrap gap-1.5" aria-label="Tags">
                {item.tags.map((tag) => (
                  <li key={tag}>
                    <Link
                      to="/app/items"
                      search={{ scope: "all", q: tag }}
                      className="inline-flex h-6 items-center rounded-md bg-muted px-2 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 focus-visible:outline-none"
                    >
                      #{tag}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </header>

        {item.kind === "log" ? (
          <LogViewer
            item={item}
            canAppend={canEdit}
            actions={<Toolbar item={item} canEdit={canEdit} />}
          />
        ) : isCollaborator ? (
          <Tabs defaultValue="content">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b pb-2">
              <TabsList variant="line" className="pb-0">
                <TabsTrigger value="content" className="gap-2 px-2 text-[15px]">
                  <FileTextIcon aria-hidden="true" />
                  Content
                </TabsTrigger>
                <TabsTrigger value="history" className="gap-2 px-2 text-[15px]">
                  <HistoryIcon aria-hidden="true" />
                  History
                </TabsTrigger>
              </TabsList>
              <Toolbar item={item} canEdit={canEdit} />
            </div>
            <TabsContent value="content" className="pt-4">
              <ItemContent item={item} />
            </TabsContent>
            <TabsContent value="history" className="pt-4">
              <HistoryPanel item={item} />
            </TabsContent>
          </Tabs>
        ) : (
          <>
            <Toolbar item={item} canEdit={canEdit} />
            <ItemContent item={item} />
          </>
        )}
      </article>
    </AppShell>
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
      {item.kind === "code" ? (
        <div className="overflow-hidden surface">
          <CodeEditor
            ariaLabel="Code"
            value={content}
            language={languageFor(item.kind, item.language)}
            readOnly
            minHeight="10rem"
          />
        </div>
      ) : (
        <pre className="min-h-40 overflow-x-auto surface p-4 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap">
          {content}
        </pre>
      )}
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

/** Actions sit on the toolbar row, trailing edge, with one filled button among them. */
function Toolbar({ item, canEdit }: { item: ItemDetail; canEdit: boolean }) {
  return (
    <div className="flex items-center justify-end gap-2">
      <CopyButton value={item.content} />
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
      {item.access === "owner" && <ShareDialog item={item} />}
      <ItemMenu item={item} />
    </div>
  );
}

/** Secondary actions live here so the toolbar keeps one filled button. */
function ItemMenu({ item }: { item: ItemDetail }) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const canRaw = item.kind !== "env" && item.kind !== "log";
  if (!canRaw && item.access !== "owner") return null;

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="outline" size="icon-sm" aria-label="More actions" />}
        >
          <EllipsisIcon aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {canRaw && (
            <DropdownMenuItem
              render={<a href={`/raw/${item.id}`} target="_blank" rel="noreferrer" />}
            >
              <FileDownIcon aria-hidden="true" />
              Open raw text
            </DropdownMenuItem>
          )}
          {item.access === "owner" && (
            <DropdownMenuItem variant="destructive" onClick={() => setConfirmDelete(true)}>
              <Trash2Icon aria-hidden="true" />
              Delete item
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      {confirmDelete && <DeleteDialog item={item} onClose={() => setConfirmDelete(false)} />}
    </>
  );
}

function DeleteDialog({ item, onClose }: { item: ItemDetail; onClose: () => void }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mutation = useMutation({
    mutationFn: $deleteItem,
    onSuccess: async () => {
      queryClient.removeQueries({ queryKey: itemKeys.detail(item.id) });
      await queryClient.invalidateQueries({ queryKey: itemKeys.lists() });
      await navigate({ to: "/app/items" });
      toast.add({ type: "success", description: "Item deleted." });
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  return (
    <AlertDialog open onOpenChange={(open) => !open && onClose()}>
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
            Delete item
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
    <AppShell>
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <span
          aria-hidden="true"
          className="grid size-14 place-items-center rounded-2xl bg-muted text-muted-foreground"
        >
          <LockIcon className="size-7" />
        </span>
        <h1 className="text-xl font-semibold">This item isn&apos;t available</h1>
        <p className="text-sm text-pretty text-muted-foreground">
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
    </AppShell>
  );
}
