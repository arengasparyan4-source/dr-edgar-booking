import { defineConfig, devices } from "@playwright/test";

const port = 3210;

/**
 * Browser tests. The app runs from a temporary copy with synthetic data
 * (e2e/server.mjs), never on this project's storage/. Run with
 * `npm run test:e2e` (builds first).
 */
export default defineConfig({
  testDir: "./e2e",
  // Tests share one server and its data, so they run one after another.
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  // Screenshots go to test-results/screenshots; keep Playwright's own
  // artifacts in a sibling folder so its cleanup does not remove them.
  outputDir: "test-results/artifacts",
  use: {
    baseURL: `http://localhost:${port}`,
    viewport: { width: 1280, height: 900 },
    timezoneId: "Asia/Yerevan",
    trace: "retain-on-failure"
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 900 } } }],
  webServer: {
    command: "node e2e/server.mjs",
    url: `http://localhost:${port}/api/site-data`,
    reuseExistingServer: false,
    timeout: 120_000,
    stdout: "ignore",
    stderr: "pipe"
  }
});
