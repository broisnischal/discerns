import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { BotIcon, HistoryIcon, LoaderCircleIcon, MonitorIcon } from "#/components/icons.ts";
import { Button } from "#/components/ui/button.tsx";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "#/components/ui/dialog.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { timeAgo } from "#/lib/format.ts";
import { $restoreVersion } from "#/lib/items/functions.ts";
import { itemKeys, versionQueryOptions, versionsQueryOptions } from "#/lib/items/queries.ts";
import type { ItemDetail } from "#/lib/items/service.server.ts";

export function HistoryPanel({ item }: { item: ItemDetail }) {
  const versions = useQuery(versionsQueryOptions(item.id));
  const [selected, setSelected] = useState<number | null>(null);

  if (versions.isPending) {
    return <p className="p-4 text-sm text-muted-foreground">Loading history</p>;
  }
  if (versions.isError) {
    return <p className="p-4 text-sm text-destructive">Couldn&apos;t load history.</p>;
  }

  return (
    <>
      <ol className="divide-y overflow-hidden surface">
        {versions.data.map((version) => {
          const SourceIcon = version.source === "mcp" ? BotIcon : MonitorIcon;
          return (
            <li key={version.version}>
              <button
                type="button"
                onClick={() => setSelected(version.version)}
                className="flex w-full items-center gap-3 px-4 py-3 text-start text-sm transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
              >
                <span className="w-10 shrink-0 font-mono text-xs text-muted-foreground tabular-nums">
                  v{version.version}
                </span>
                <span className="min-w-0 flex-1 truncate">{version.title}</span>
                <span className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:inline-flex">
                  <SourceIcon className="size-3.5" aria-hidden="true" />
                  {version.authorName ?? "Deleted user"}
                  {version.source === "mcp" && " via an agent"}
                </span>
                <span
                  className="w-24 shrink-0 text-end text-xs text-muted-foreground tabular-nums"
                  suppressHydrationWarning
                >
                  {timeAgo(version.createdAt)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      {selected !== null && (
        <VersionDialog item={item} version={selected} onClose={() => setSelected(null)} />
      )}
    </>
  );
}

function VersionDialog({
  item,
  version,
  onClose,
}: {
  item: ItemDetail;
  version: number;
  onClose: () => void;
}) {
  const query = useQuery(versionQueryOptions(item.id, version));
  const queryClient = useQueryClient();
  const canRestore =
    (item.access === "owner" || item.access === "editor") && version !== item.version;

  const restore = useMutation({
    mutationFn: $restoreVersion,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: itemKeys.detail(item.id) });
      toast.add({ type: "success", description: `Restored version ${version} as a new version.` });
      onClose();
    },
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>
            Version {version}
            {query.data && <span className="font-normal">: {query.data.title}</span>}
          </DialogTitle>
          <DialogDescription>
            {query.data ? `Saved ${timeAgo(query.data.createdAt)}` : "Loading"}
          </DialogDescription>
        </DialogHeader>
        <pre className="max-h-[60svh] overflow-auto rounded-2xl bg-muted p-4 font-mono text-sm break-words whitespace-pre-wrap">
          {query.data?.content}
        </pre>
        {canRestore && (
          <DialogFooter>
            <Button
              disabled={restore.isPending || !query.data}
              onClick={() => restore.mutate({ data: { id: item.id, version } })}
            >
              {restore.isPending ? (
                <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
              ) : (
                <HistoryIcon aria-hidden="true" />
              )}
              Restore this version
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
