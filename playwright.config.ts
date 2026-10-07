import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  outputDir: ".cache/playwright",
  use: {
    baseURL,
    trace: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Production build served by workerd against the local D1 database.
    // Secrets come from .dev.vars.
    command: `vp run db:migrate:local && vp build && vp preview --port ${PORT} --strictPort`,
    env: {
      // Overrides .env.production so the build points at the local server.
      VITE_BASE_URL: baseURL,
    },
    url: baseURL,
    reuseExistingServer: false,
    gracefulShutdown: { signal: "SIGTERM", timeout: 500 },
    timeout: 120_000,
  },
});
