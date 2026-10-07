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

const PAID_STATUSES = new Set([
  "active",
  "renewed",
  "on_hold",
  "plan_changed",
  "updated",
  "unpaused",
]);

/** A subscription keeps Pro while paid, and until the period ends after a cancellation. */
export function planFor(
  subscription: { status: string; currentPeriodEnd: Date | null } | null | undefined,
  now = Date.now(),
): Plan {
  if (!subscription) return "free";
  if (PAID_STATUSES.has(subscription.status)) return "pro";
  if (
    subscription.status === "cancelled" &&
    subscription.currentPeriodEnd &&
    subscription.currentPeriodEnd.getTime() > now
  ) {
    return "pro";
  }
  return "free";
}
