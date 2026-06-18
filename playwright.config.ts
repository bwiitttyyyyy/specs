import { defineConfig } from "@playwright/test";

/**
 * E2E config (T006). Boots the backend (mock session adapter) and the built
 * frontend, then runs the journey specs in frontend/tests/e2e. The backend uses
 * a throwaway data dir and the default token so the frontend's default auth works.
 */
const TOKEN = "dev-token";

export default defineConfig({
  testDir: "./frontend/tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "on-first-retry",
  },
  webServer: [
    {
      command: "npx tsx backend/src/index.ts",
      port: 4317,
      reuseExistingServer: false,
      env: {
        SPECKIT_DASHBOARD_TOKEN: TOKEN,
        SPECKIT_DASHBOARD_DATA: "/tmp/speckit-e2e-data",
        PORT: "4317",
      },
    },
    {
      command: "npm run dev --workspace frontend -- --port 5173 --strictPort --host 127.0.0.1",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
