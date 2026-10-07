/**
 * Plans. The website is free; Pro is what lets coding agents use discerns over MCP.
 * Pure so the UI and tests can use it without a database.
 */
export type Plan = "free" | "pro";

/** What each plan can create; null means unlimited. Only creation is blocked, never access. */
export const LIMITS: Record<Plan, { items: number | null; projects: number | null }> = {
  free: { items: 30, projects: 1 },
  pro: { items: null, projects: null },
};

export type BillingInterval = "monthly" | "yearly";

/**
 * What Pro costs. The amounts here are only for display; Dodo charges whatever price is set
 * on each product, so keep the two in sync. `slug` is what the client asks checkout for.
 */
export const PRO_PRICES: Record<
  BillingInterval,
  { slug: string; price: string; amount: number; per: string }
> = {
  monthly: { slug: "pro-monthly", price: "$4", amount: 4, per: "month" },
  yearly: { slug: "pro-yearly", price: "$30", amount: 30, per: "year" },
};

/**
 * First month on the monthly plan for people who never subscribed before. Dodo charges it
 * through a one-cycle discount code (see DODO_INTRO_DISCOUNT_CODE); this is the label.
 */
export const INTRO_PRICE = "$0.99";

/** Yearly against twelve monthly payments, rounded down so the label never overstates. */
export const YEARLY_SAVINGS_PERCENT = Math.floor(
  (1 - PRO_PRICES.yearly.amount / (12 * PRO_PRICES.monthly.amount)) * 100,
);

/** Pro keeps working this long past a renewal date whose renewal never arrived. */
const RENEWAL_GRACE_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Plan from the stored Dodo subscription. Only Dodo's `active` status means it is paid;
 * pending, failed, on hold, past due, paused, cancelled, and expired are all Free.
 */
export function planFor(
  subscription: { status: string; currentPeriodEnd: Date | null } | null | undefined,
  now = Date.now(),
): Plan {
  if (subscription?.status !== "active") return "free";
  const end = subscription.currentPeriodEnd?.getTime();
  // A missed renewal or cancellation webhook must not leave Pro on indefinitely.
  if (end !== undefined && end + RENEWAL_GRACE_MS < now) return "free";
  return "pro";
}

/**
 * Whether an incoming subscription should replace the stored one. A different subscription
 * only takes over when it is active or the stored one no longer is, so a failed second
 * checkout cannot end a plan that is still being paid for.
 */
export function shouldReplaceSubscription(
  stored: { dodoSubscriptionId: string; status: string } | null | undefined,
  incoming: { subscriptionId: string; status: string },
) {
  if (!stored || stored.dodoSubscriptionId === incoming.subscriptionId) return true;
  return incoming.status === "active" || stored.status !== "active";
}

/** The first-month price is for accounts that never paid; a failed attempt does not count. */
export function introEligible(stored: { status: string } | null | undefined) {
  return !stored || stored.status === "failed" || stored.status === "pending";
}
