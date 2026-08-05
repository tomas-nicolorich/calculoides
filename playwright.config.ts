import { defineConfig, devices } from "@playwright/test";

// 1b.8 (proposal Phase-1 gate; server-session-auth: "Same session
// authenticates both a Next.js page and a legacy API call"): a dedicated,
// Next.js-scoped Playwright config, distinct from `frontend/playwright.config.ts`
// (which still targets the old Vite SPA on :5173 and is repointed to
// `next start` only in phase 7, task 7.5 — not here). This one runs against
// the Next.js app that now serves both App Router pages and the legacy
// adapter (`app/api/[...legacy]/route.ts`) on the same origin/port.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [["html", { outputFolder: "playwright-report-next" }]],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3210",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    command: process.env.CI
      ? "npm run build:next && npm run start:next -- -p 3210"
      : "npm run dev:next -- -p 3210",
    port: 3210,
    reuseExistingServer: !process.env.CI,
  },
});
