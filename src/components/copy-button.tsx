import { useEffect, useState } from "react";

import { CheckIcon, CopyIcon } from "#/components/icons.ts";
import { Button } from "#/components/ui/button.tsx";

export function CopyButton({
  value,
  label = "Copy",
  variant = "outline",
  size = "sm",
}: {
  value: string;
  label?: string;
  variant?: "outline" | "ghost" | "secondary";
  size?: "sm" | "icon-sm";
}) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timeout);
  }, [copied]);

  const Icon = copied ? CheckIcon : CopyIcon;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      aria-label={size === "icon-sm" ? label : undefined}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
      }}
    >
      <Icon aria-hidden="true" />
      {size !== "icon-sm" && (copied ? "Copied" : label)}
    </Button>
  );
}
