import { defineConfig, devices } from "@playwright/test";

const PORT = 3010;
const BASE = `http://localhost:${PORT}`;

/**
 * E2E runs against the running dev server (started separately with a populated
 * database). CWV thresholds are dev-tolerant here; the production p75 gate
 * (SC-007) is a Lighthouse run against `next start`, tracked as a follow-up.
 */
export default defineConfig({
  testDir: "./e2e",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: BASE,
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm --filter @observatory/web dev",
    url: BASE,
    reuseExistingServer: true,
    timeout: 120_000,
    env: {
      DATABASE_URL:
        process.env.DATABASE_URL ??
        "postgres://observatory:observatory@localhost:5433/observatory",
    },
  },
});
