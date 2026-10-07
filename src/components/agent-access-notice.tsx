import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";

import { SparklesIcon } from "#/components/icons.ts";
import { Button } from "#/components/ui/button.tsx";
import { PRO_PRICES } from "#/lib/billing/plan.ts";
import { billingQueryOptions } from "#/lib/items/queries.ts";

/** Shown wherever agent access is offered, until the user is on Pro. */
export function AgentAccessNotice() {
  const billing = useQuery(billingQueryOptions());
  if (!billing.data || billing.data.plan === "pro" || !billing.data.enabled) return null;
  const { monthly, yearly } = PRO_PRICES;

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl bg-selected p-4 text-sm text-selected-foreground">
      <SparklesIcon className="size-5 shrink-0" aria-hidden="true" />
      <p className="min-w-0 flex-1 text-pretty">
        {billing.data.introOffer
          ? `Coding agent access is part of Pro. Try it for ${billing.data.introOffer} your first month, then ${monthly.price} a ${monthly.per}, or ${yearly.price} a ${yearly.per}.`
          : `Coding agent access is part of Pro, from ${monthly.price} a ${monthly.per} or ${yearly.price} a ${yearly.per}.`}{" "}
        You can connect now; tools start working once you upgrade.
      </p>
      <Button
        render={<Link to="/app/settings" search={{ tab: "billing" }} />}
        nativeButton={false}
        size="sm"
      >
        Upgrade
      </Button>
    </div>
  );
}
