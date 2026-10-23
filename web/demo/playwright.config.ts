import { defineConfig, devices } from "@playwright/test";

// The demo video, not a test suite: `pnpm exec playwright test -c demo` against `pnpm start --port 3300`.
// It talks to the real agent (GapGPT), so a run spends a few cents.
export default defineConfig({
  testDir: ".",
  testMatch: /tour\.demo\.ts/,
  timeout: 20 * 60_000,
  expect: { timeout: 15_000 },
  use: {
    ...devices["Desktop Chrome"],
    baseURL: process.env.DEMO_URL ?? "http://localhost:3300",
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1.5,
    locale: "fa-IR",
    timezoneId: "Asia/Tehran",
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    permissions: [], // no geolocation: distances from the Saadi metro anchor
  },
});
