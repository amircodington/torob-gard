import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.E2E_PORT ?? "3100"; // the redesign worktree runs on 3200
const BASE = `http://localhost:${PORT}`;

// ponytail: e2e hits the real dev server and the compose API; no mocks, no CI yet.
export default defineConfig({
  testDir: "e2e",
  use: { baseURL: BASE, locale: "fa-IR", timezoneId: "Asia/Tehran" },
  projects: [
    { name: "phone", use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true } },
    { name: "tablet", use: { ...devices["Desktop Chrome"], viewport: { width: 768, height: 1024 } } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } },
    // The edge widths (360 / 1024 / 1920) run only the honesty and shots specs.
    { name: "phone360", testMatch: /(honesty|shots)\.spec/, use: { ...devices["Desktop Chrome"], viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true } },
    { name: "laptop", testMatch: /(honesty|shots)\.spec/, use: { ...devices["Desktop Chrome"], viewport: { width: 1024, height: 768 } } },
    { name: "wide", testMatch: /(honesty|shots)\.spec/, use: { ...devices["Desktop Chrome"], viewport: { width: 1920, height: 1080 } } },
  ],
  webServer: { command: `PORT=${PORT} pnpm dev`, url: BASE, reuseExistingServer: true, timeout: 120_000 },
});
