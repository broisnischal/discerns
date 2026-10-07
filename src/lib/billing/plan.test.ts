import { describe, expect, test } from "vite-plus/test";

import { introEligible, planFor, shouldReplaceSubscription } from "./plan";

const day = 24 * 3600 * 1000;
const now = Date.UTC(2026, 9, 7);

describe("planFor", () => {
  test.each([
    ["no subscription", null, "free"],
    ["active and current", { status: "active", currentPeriodEnd: new Date(now + 20 * day) }, "pro"],
    ["active without a period end", { status: "active", currentPeriodEnd: null }, "pro"],
    [
      "active, renewal 2 days late",
      { status: "active", currentPeriodEnd: new Date(now - 2 * day) },
      "pro",
    ],
    [
      "active, renewal never came",
      { status: "active", currentPeriodEnd: new Date(now - 10 * day) },
      "free",
    ],
    ["failed payment", { status: "failed", currentPeriodEnd: new Date(now + 300 * day) }, "free"],
    ["pending checkout", { status: "pending", currentPeriodEnd: null }, "free"],
    ["on hold", { status: "on_hold", currentPeriodEnd: new Date(now + 5 * day) }, "free"],
    ["past due", { status: "past_due", currentPeriodEnd: new Date(now + 5 * day) }, "free"],
    ["cancelled", { status: "cancelled", currentPeriodEnd: new Date(now + 5 * day) }, "free"],
    ["expired", { status: "expired", currentPeriodEnd: null }, "free"],
    // Regression: webhook event names were once stored as the status.
    [
      "event name 'updated'",
      { status: "updated", currentPeriodEnd: new Date(now + 300 * day) },
      "free",
    ],
    [
      "event name 'renewed'",
      { status: "renewed", currentPeriodEnd: new Date(now + 300 * day) },
      "free",
    ],
  ])("%s → %s", (_, subscription, expected) => {
    expect(planFor(subscription, now)).toBe(expected);
  });
});

describe("shouldReplaceSubscription", () => {
  const active = { dodoSubscriptionId: "sub_a", status: "active" };
  test.each([
    ["nothing stored yet", null, { subscriptionId: "sub_b", status: "failed" }, true],
    [
      "same subscription changes state",
      active,
      { subscriptionId: "sub_a", status: "cancelled" },
      true,
    ],
    [
      "failed second checkout keeps the active plan",
      active,
      { subscriptionId: "sub_b", status: "failed" },
      false,
    ],
    [
      "pending second checkout keeps the active plan",
      active,
      { subscriptionId: "sub_b", status: "pending" },
      false,
    ],
    [
      "a new active subscription takes over",
      active,
      { subscriptionId: "sub_b", status: "active" },
      true,
    ],
    [
      "anything replaces an ended plan",
      { dodoSubscriptionId: "sub_a", status: "expired" },
      { subscriptionId: "sub_b", status: "failed" },
      true,
    ],
  ])("%s", (_, stored, incoming, expected) => {
    expect(shouldReplaceSubscription(stored, incoming)).toBe(expected);
  });
});

test.each([
  [null, true],
  [{ status: "failed" }, true],
  [{ status: "pending" }, true],
  [{ status: "active" }, false],
  [{ status: "cancelled" }, false],
])("introEligible(%o) → %s", (stored, expected) => {
  expect(introEligible(stored)).toBe(expected);
});
