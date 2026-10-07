import {
  BrainIcon,
  CodeIcon,
  FileTextIcon,
  KeyRoundIcon,
  SparklesIcon,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "#/components/ui/badge.tsx";
import type { ItemKind } from "#/lib/db/schema/types.ts";

export const KIND_META: Record<ItemKind, { label: string; icon: LucideIcon }> = {
  text: { label: "Text", icon: FileTextIcon },
  prompt: { label: "Prompt", icon: SparklesIcon },
  memory: { label: "Memory", icon: BrainIcon },
  env: { label: "Env", icon: KeyRoundIcon },
  code: { label: "Code", icon: CodeIcon },
};

export function KindBadge({ kind }: { kind: ItemKind }) {
  const { label, icon: Icon } = KIND_META[kind];
  return (
    <Badge variant="secondary">
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
