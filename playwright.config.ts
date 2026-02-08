import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: "html",
  use: {
    baseURL: "http://localhost:3001",
    trace: "on-first-retry",
  },
  webServer: {
    command: "bun run src/migrate.ts && bun run src/index.ts",
    url: "http://localhost:3001",
    reuseExistingServer: !process.env.CI,
    env: {
      DB_PATH: "test.db",
      PORT: "3001",
    },
  },
});
