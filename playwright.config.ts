import "dotenv/config";
import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    // iPhone viewport / touch / UA, rendered with Chromium (WebKit is optional in CI)
    { name: "iphone", use: { ...devices["iPhone 13"], browserName: "chromium" } },
    { name: "android", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    // E2E runs against the dedicated test database (npm run test:db:prepare)
    command: `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}/api/health`,
    reuseExistingServer: true,
    timeout: 300_000,
    env: { DATABASE_URL: process.env.TEST_DATABASE_URL ?? "", LLM_PROVIDER: "none", IMPORT_WORKER_MODE: "external" },
  },
});
