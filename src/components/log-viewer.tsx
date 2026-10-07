import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { BotIcon, LoaderCircleIcon, SendHorizontalIcon } from "#/components/icons.ts";
import { Button } from "#/components/ui/button.tsx";
import { Input } from "#/components/ui/input.tsx";
import { toast } from "#/components/ui/toast.tsx";
import { timeAgo } from "#/lib/format.ts";
import { $appendLog } from "#/lib/items/functions.ts";
import { logTailQueryOptions } from "#/lib/items/queries.ts";
import type { ItemDetail } from "#/lib/items/service.server.ts";

/** Polls for new entries every two seconds and keeps the view pinned to the newest line. */
export function LogViewer({
  item,
  canAppend,
  actions,
}: {
  item: ItemDetail;
  canAppend: boolean;
  /** Page actions, shown on the trailing side of the status row. */
  actions?: React.ReactNode;
}) {
  const tail = useQuery(logTailQueryOptions(item.id));
  const entries = tail.data?.entries ?? [];
  const scroller = useRef<HTMLDivElement>(null);
  const pinned = useRef(true);

  useEffect(() => {
    const el = scroller.current;
    if (el && pinned.current) el.scrollTop = el.scrollHeight;
  }, [entries.length]);

  const append = useMutation({
    mutationFn: $appendLog,
    onSuccess: () => tail.refetch(),
    onError: (error) => toast.add({ type: "error", description: error.message }),
  });

  const last = entries.at(-1);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-500/60" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          Live
          <span role="status" aria-live="polite" suppressHydrationWarning>
            · {entries.length} {entries.length === 1 ? "entry" : "entries"}
            {last && `, last ${timeAgo(last.createdAt)}`}
          </span>
        </span>
        <span className="flex items-center gap-3">
          {tail.isError && <span className="text-destructive">Connection lost, retrying</span>}
          {actions}
        </span>
      </div>

      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          pinned.current = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
        }}
        className="max-h-[65svh] min-h-40 overflow-auto surface p-1 font-mono text-[13px] leading-relaxed"
        role="log"
        aria-label="Log entries"
      >
        {tail.isPending ? (
          <p className="p-3 text-muted-foreground">Loading log</p>
        ) : entries.length === 0 ? (
          <p className="p-3 text-muted-foreground">
            Nothing here yet. Entries appear the moment they are appended.
          </p>
        ) : (
          <ol>
            {entries.map((entry) => (
              <li
                key={entry.seq}
                className="group flex gap-3 rounded-xl px-3 py-1 hover:bg-muted/50"
              >
                <span className="w-8 shrink-0 text-end text-muted-foreground/60 tabular-nums select-none">
                  {entry.seq}
                </span>
                <span className="min-w-0 flex-1 break-words whitespace-pre-wrap">{entry.body}</span>
                <span
                  className="hidden shrink-0 items-center gap-1 text-xs text-muted-foreground opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:inline-flex"
                  title={new Date(entry.createdAt).toLocaleString()}
                >
                  {entry.source === "mcp" && <BotIcon className="size-3.5" aria-hidden="true" />}
                  {entry.authorName ?? "Deleted user"}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>

      {canAppend && (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const form = e.currentTarget;
            const text = new FormData(form).get("text");
            if (typeof text !== "string" || !text.trim()) return;
            pinned.current = true;
            append.mutate({ data: { id: item.id, text } }, { onSuccess: () => form.reset() });
          }}
        >
          <Input
            name="text"
            placeholder="Add a line"
            aria-label="New log entry"
            autoComplete="off"
            className="h-9 flex-1 font-mono text-[13px]"
          />
          <Button type="submit" size="icon-lg" aria-label="Append" disabled={append.isPending}>
            {append.isPending ? (
              <LoaderCircleIcon className="animate-spin" aria-hidden="true" />
            ) : (
              <SendHorizontalIcon aria-hidden="true" />
            )}
          </Button>
        </form>
      )}
    </div>
  );
}
