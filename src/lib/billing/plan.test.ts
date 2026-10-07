import { expect, test } from "vite-plus/test";

import { planFor } from "./plan";

const day = 24 * 3600 * 1000;
const now = Date.UTC(2026, 9, 7);

test.each([
  ["no subscription", null, "free"],
  ["active", { status: "active", currentPeriodEnd: new Date(now + 20 * day) }, "pro"],
  ["renewed", { status: "renewed", currentPeriodEnd: new Date(now + 20 * day) }, "pro"],
  ["on hold keeps access while dunning", { status: "on_hold", currentPeriodEnd: null }, "pro"],
  [
    "cancelled but period not over",
    { status: "cancelled", currentPeriodEnd: new Date(now + 5 * day) },
    "pro",
  ],
  [
    "cancelled and period over",
    { status: "cancelled", currentPeriodEnd: new Date(now - day) },
    "free",
  ],
  ["expired", { status: "expired", currentPeriodEnd: new Date(now + day) }, "free"],
  ["failed", { status: "failed", currentPeriodEnd: null }, "free"],
])("%s → %s", (_, subscription, expected) => {
  expect(planFor(subscription, now)).toBe(expected);
});
