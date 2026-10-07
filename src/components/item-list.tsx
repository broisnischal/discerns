import { Link } from "@tanstack/react-router";
import { GlobeIcon, LinkIcon, LockIcon, UsersIcon } from "lucide-react";

import { KindBadge } from "#/components/kind-badge.tsx";
import { Avatar, AvatarFallback, AvatarImage } from "#/components/ui/avatar.tsx";
import type { ItemVisibility } from "#/lib/db/schema/types.ts";
import { initials, timeAgo } from "#/lib/format.ts";
import type { ItemSummary } from "#/lib/items/service.server.ts";

export const VISIBILITY_META: Record<ItemVisibility, { label: string; icon: typeof LockIcon }> = {
  private: { label: "Private", icon: LockIcon },
  link: { label: "Anyone with the link", icon: LinkIcon },
  public: { label: "Public", icon: GlobeIcon },
};

export function ItemList({ items }: { items: ItemSummary[] }) {
  return (
    <ul className="divide-y rounded-xl border">
      {items.map((item) => (
        <li key={item.id}>
          <ItemRow item={item} />
        </li>
      ))}
    </ul>
  );
}

function ItemRow({ item }: { item: ItemSummary }) {
  const Visibility = VISIBILITY_META[item.visibility].icon;
  const shared = item.access !== "owner";

  return (
    <Link
      to="/p/$id"
      params={{ id: item.id }}
      className="flex flex-col gap-2 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none"
    >
      <div className="flex items-center gap-2">
        <span className="min-w-0 flex-1 truncate font-medium">{item.title}</span>
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
          {timeAgo(item.updatedAt)}
        </span>
      </div>
      {item.preview && (
        <p className="line-clamp-2 font-mono text-xs break-all text-muted-foreground">
          {item.preview}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <KindBadge kind={item.kind} />
        <span className="inline-flex items-center gap-1">
          <Visibility className="size-3.5" aria-hidden="true" />
          {VISIBILITY_META[item.visibility].label}
        </span>
        {item.tags.map((tag) => (
          <span key={tag}>#{tag}</span>
        ))}
        {shared && (
          <span className="ml-auto inline-flex items-center gap-1.5">
            <UsersIcon className="size-3.5" aria-hidden="true" />
            <Avatar size="sm" className="size-4">
              {item.ownerImage && <AvatarImage src={item.ownerImage} alt="" />}
              <AvatarFallback className="text-[0.5rem]">{initials(item.ownerName)}</AvatarFallback>
            </Avatar>
            {item.ownerName}
          </span>
        )}
      </div>
    </Link>
  );
}
