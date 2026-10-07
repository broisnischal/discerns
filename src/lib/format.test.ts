import { describe, expect, test } from "vite-plus/test";

import { safeRedirect, timeAgo } from "./format";

describe("safeRedirect", () => {
  test.each([
    ["/invite/abc", "/invite/abc"],
    ["/p/abc?x=1", "/p/abc?x=1"],
    ["//evil.com", "/app"],
    ["https://evil.com", "/app"],
    [undefined, "/app"],
    [42, "/app"],
  ])("%s → %s", (input, expected) => {
    expect(safeRedirect(input)).toBe(expected);
  });
});

test("timeAgo picks the largest whole unit", () => {
  const now = Date.UTC(2026, 9, 7, 12);
  expect(timeAgo(now - 30_000, now)).toBe("just now");
  expect(timeAgo(now - 5 * 60_000, now)).toBe("5 minutes ago");
  expect(timeAgo(now - 26 * 3600_000, now)).toBe("yesterday");
});
