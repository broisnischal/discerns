import { expect, test } from "@playwright/test";

test("signed-out visitors see the landing page and sign-in options", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("shared clipboard");
  // Button-styled links render with role="button" (Base UI with nativeButton={false}).
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("button", { name: /continue with github/i })).toBeVisible();
});

test("protected pages send signed-out visitors to sign in and back", async ({ page }) => {
  await page.goto("/app/new");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fapp%2Fnew/);
});

test("the MCP endpoint asks clients to authorize", async ({ request }) => {
  const res = await request.post("/mcp", {
    headers: { accept: "application/json, text/event-stream" },
    data: { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
  });
  expect(res.status()).toBe(401);
  expect(res.headers()["www-authenticate"]).toContain("resource_metadata=");
});
