import "@tanstack/react-start/server-only";
import type { Subscription } from "@dodopayments/core";
import { eq, sql } from "drizzle-orm";
import { createError } from "evlog";

import { db } from "#/lib/db/index.ts";
import { item, project, subscription, user } from "#/lib/db/schema/index.ts";
import { serverEnv } from "#/lib/env.server.ts";

import { INTRO_PRICE, LIMITS, PRO_PRICES, planFor, type BillingInterval, type Plan } from "./plan";

/** Payments are optional in local dev; the UI hides upgrade buttons when this is false. */
export function billingEnabled() {
  const env = serverEnv();
  return Boolean(env.DODO_PAYMENTS_API_KEY && env.DODO_PRO_MONTHLY_PRODUCT_ID);
}

export async function getPlan(userId: string): Promise<Plan> {
  const row = await db.select().from(subscription).where(eq(subscription.userId, userId)).get();
  return planFor(row);
}

async function countOwned(userId: string) {
  const row = await db
    .select({
      items: sql<number>`(select count(*) from ${item} where ${item.ownerId} = ${userId})`,
      projects: sql<number>`(select count(*) from ${project} where ${project.ownerId} = ${userId})`,
    })
    .from(sql`(select 1)`)
    .get();
  return { items: row?.items ?? 0, projects: row?.projects ?? 0 };
}

export async function getBilling(userId: string) {
  const [row, usage] = await Promise.all([
    db.select().from(subscription).where(eq(subscription.userId, userId)).get(),
    countOwned(userId),
  ]);
  const plan = planFor(row);
  const env = serverEnv();
  const productIds: Record<BillingInterval, string | undefined> = {
    monthly: env.DODO_PRO_MONTHLY_PRODUCT_ID,
    yearly: env.DODO_PRO_YEARLY_PRODUCT_ID || undefined,
  };
  const introCode = env.DODO_INTRO_DISCOUNT_CODE;
  return {
    enabled: billingEnabled(),
    plan,
    limits: LIMITS[plan],
    usage,
    /** Shown only to people who never subscribed; the row survives cancellation. */
    introOffer: introCode && !row && productIds.monthly ? INTRO_PRICE : null,
    /** Prices the user can pick at checkout; yearly appears once its product is configured. */
    intervals: (Object.keys(productIds) as BillingInterval[]).filter((i) => productIds[i]),
    subscription: row
      ? {
          status: row.status,
          interval: (Object.keys(productIds) as BillingInterval[]).find(
            (i) => productIds[i] === row.productId,
          ),
          currentPeriodEnd: row.currentPeriodEnd,
          cancelAtPeriodEnd: row.cancelAtPeriodEnd,
        }
      : null,
  };
}
export type Billing = Awaited<ReturnType<typeof getBilling>>;

/** Throws a 402 the web toast and agents can show as-is when a free account is full. */
async function assertUnderLimit(userId: string, kind: "items" | "projects") {
  const limit = LIMITS[await getPlan(userId)][kind];
  if (limit === null) return;
  const used = (await countOwned(userId))[kind];
  if (used < limit) return;
  const noun =
    kind === "items" ? (limit === 1 ? "item" : "items") : limit === 1 ? "project" : "projects";
  throw createError({
    message: `The free plan includes ${limit} ${noun}. Upgrade to Pro for unlimited ${kind}.`,
    status: 402,
    why: `This account already owns ${used} ${kind}`,
    fix: "Upgrade in Settings → Billing, or delete something you no longer need",
    link: "/app/settings?tab=billing",
  });
}

export const assertCanCreateItem = (userId: string) => assertUnderLimit(userId, "items");
export const assertCanCreateProject = (userId: string) => assertUnderLimit(userId, "projects");

/**
 * Discount codes to apply at checkout. The intro price is for first-time subscribers on the
 * monthly plan; Dodo enforces the same rule on its side (first-time customers, one use).
 */
export async function checkoutDiscounts(userId: string, slug: string) {
  const code = serverEnv().DODO_INTRO_DISCOUNT_CODE;
  if (!code || slug !== PRO_PRICES.monthly.slug) return [];
  const before = await db
    .select({ userId: subscription.userId })
    .from(subscription)
    .where(eq(subscription.userId, userId))
    .get();
  return before ? [] : [code];
}

/**
 * Mirrors a Dodo subscription webhook into the subscription table. The customer is matched
 * by the id Better Auth stored at sign-up, falling back to the userId we put in metadata.
 */
export async function applySubscriptionEvent(event: string, data: Subscription) {
  const customerId = data.customer.customer_id;
  const metadataUserId =
    typeof data.metadata?.userId === "string" ? data.metadata.userId : undefined;
  const byCustomerId = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.dodoCustomerId, customerId))
    .get();
  // Accounts created before billing have no customer id yet. Checkout uses the signed-in
  // user's email, so the email on the subscription identifies them.
  const owner =
    byCustomerId ??
    (metadataUserId
      ? await db.select({ id: user.id }).from(user).where(eq(user.id, metadataUserId)).get()
      : undefined) ??
    (data.customer.email
      ? await db
          .select({ id: user.id })
          .from(user)
          .where(eq(sql`lower(${user.email})`, data.customer.email.toLowerCase()))
          .get()
      : undefined);
  if (!owner) {
    throw createError({
      message: "Subscription webhook for an unknown customer",
      status: 404,
      internal: { customerId, event, subscriptionId: data.subscription_id },
    });
  }
  if (!byCustomerId) {
    await db.update(user).set({ dodoCustomerId: customerId }).where(eq(user.id, owner.id));
  }

  const values = {
    dodoSubscriptionId: data.subscription_id,
    productId: data.product_id,
    status: event,
    currentPeriodEnd: data.next_billing_date ? new Date(data.next_billing_date) : null,
    cancelAtPeriodEnd: Boolean(data.cancel_at_next_billing_date),
  };
  await db
    .insert(subscription)
    .values({ userId: owner.id, ...values })
    .onConflictDoUpdate({ target: subscription.userId, set: values });
}
