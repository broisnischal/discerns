import { Link } from "@tanstack/react-router";

import { GlobeIcon, LinkIcon, LockIcon } from "#/components/icons.ts";
import { KIND_META, KindIcon } from "#/components/kind-badge.tsx";
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
    <ul className="divide-y overflow-hidden surface">
      {items.map((item) => (
        <li key={item.id}>
          <ItemRow item={item} />
        </li>
      ))}
    </ul>
  );
}

function ItemRow({ item }: { item: ItemSummary }) {
  const visibility = VISIBILITY_META[item.visibility];
  const shared = item.access !== "owner";
  const summary = item.preview.replace(/\s+/g, " ").trim();

  return (
    <Link
      to="/p/$id"
      params={{ id: item.id }}
      className="flex items-center gap-4 px-4 py-3 transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none sm:px-5"
    >
      <KindIcon kind={item.kind} />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{item.title}</span>
        <span className="block truncate text-sm text-muted-foreground">
          {item.projectName && (
            <span className="after:mx-1.5 after:content-['·']">{item.projectName}</span>
          )}
          {summary || KIND_META[item.kind].label}
          {item.tags.length > 0 && (
            <span className="before:mx-1.5 before:content-['·']">
              {item.tags.map((tag) => `#${tag}`).join(" ")}
            </span>
          )}
        </span>
      </span>
      <span className="flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
        {shared && (
          <span className="hidden items-center gap-1.5 sm:inline-flex">
            <Avatar size="sm" className="size-5">
              {item.ownerImage && <AvatarImage src={item.ownerImage} alt="" />}
              <AvatarFallback className="text-[0.55rem]">{initials(item.ownerName)}</AvatarFallback>
            </Avatar>
            {item.ownerName}
          </span>
        )}
        <visibility.icon className="size-4" aria-hidden="true" />
        <span className="sr-only">{visibility.label}</span>
        <span className="w-24 text-end whitespace-nowrap tabular-nums" suppressHydrationWarning>
          {timeAgo(item.updatedAt)}
        </span>
      </span>
    </Link>
  );
}
