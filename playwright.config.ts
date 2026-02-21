import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "desktop-chrome",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile-safari",
      use: { ...devices["iPhone 13"] },
    },
  ],
  // Both Next.js and Convex must be running before E2E tests
  // Start them manually or configure webServer entries:
  // webServer: [
  //   {
  //     command: "npx convex dev",
  //     url: "http://localhost:3210",
  //     reuseExistingServer: !process.env.CI,
  //   },
  //   {
  //     command: "npm run dev",
  //     url: "http://localhost:3000",
  //     reuseExistingServer: !process.env.CI,
  //   },
  // ],
});
