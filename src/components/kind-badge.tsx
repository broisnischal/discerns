import {
  BrainIcon,
  CodeIcon,
  FileTextIcon,
  KeyRoundIcon,
  ScrollTextIcon,
  SparklesIcon,
  type Icon,
} from "#/components/icons.ts";
import { Badge } from "#/components/ui/badge.tsx";
import type { ItemKind } from "#/lib/db/schema/types.ts";
import { cn } from "#/lib/utils.ts";

/** One hue per kind so a list scans by color as well as by icon. Blue stays reserved for actions. */
export const KIND_META: Record<ItemKind, { label: string; icon: Icon; tint: string }> = {
  text: { label: "Text", icon: FileTextIcon, tint: "bg-muted text-foreground/70" },
  prompt: {
    label: "Prompt",
    icon: SparklesIcon,
    tint: "bg-violet-500/12 text-violet-700 dark:text-violet-300",
  },
  memory: {
    label: "Memory",
    icon: BrainIcon,
    tint: "bg-amber-500/14 text-amber-700 dark:text-amber-300",
  },
  env: {
    label: "Env",
    icon: KeyRoundIcon,
    tint: "bg-rose-500/12 text-rose-700 dark:text-rose-300",
  },
  code: { label: "Code", icon: CodeIcon, tint: "bg-teal-500/12 text-teal-700 dark:text-teal-300" },
  log: {
    label: "Log",
    icon: ScrollTextIcon,
    tint: "bg-orange-500/14 text-orange-700 dark:text-orange-300",
  },
};

const TILE_SIZE = {
  sm: "size-6 rounded-md [&>svg]:size-3.5",
  md: "size-10 rounded-xl [&>svg]:size-5",
  lg: "size-14 rounded-2xl [&>svg]:size-7",
  xl: "size-16 rounded-[20px] [&>svg]:size-8",
};

/** The big tinted icon that identifies an item's kind at a glance. */
export function KindIcon({
  kind,
  size = "md",
  className,
}: {
  kind: ItemKind;
  size?: keyof typeof TILE_SIZE;
  className?: string;
}) {
  const { icon: Icon, label } = KIND_META[kind];
  return (
    <span
      role="img"
      aria-label={label}
      className={cn(
        "grid shrink-0 place-items-center",
        TILE_SIZE[size],
        KIND_META[kind].tint,
        className,
      )}
    >
      <Icon aria-hidden="true" />
    </span>
  );
}

export function KindBadge({ kind }: { kind: ItemKind }) {
  const { label, icon: Icon } = KIND_META[kind];
  return (
    <Badge variant="secondary">
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
