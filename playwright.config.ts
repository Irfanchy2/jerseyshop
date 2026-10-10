import { defineConfig, devices } from "@playwright/test";

/**
 * E2E tests run against a running app (dev or production build) seeded with demo data:
 *   npm run db:seed:demo && npm run dev   (or: npm run build && npm start)
 *   npm run test:e2e
 * Set PLAYWRIGHT_CHROMIUM_PATH to use a preinstalled Chromium.
 */
const executablePath = process.env.PLAYWRIGHT_CHROMIUM_PATH;

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } }, testIgnore: /mobile/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile/ },
  ],
});
