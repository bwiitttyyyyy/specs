import { defineConfig } from "vitest/config";

// Unit/component tests run under jsdom; e2e journeys run separately via Playwright.
export default defineConfig({
  test: {
    include: ["tests/unit/**/*.test.ts?(x)"],
    environment: "jsdom",
  },
});
