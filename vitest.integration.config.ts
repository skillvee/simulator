import { defineConfig } from "vitest/config";
import path from "path";

/**
 * Vitest configuration for integration tests.
 * These tests run against the actual database.
 */
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["**/*.integration.test.{ts,tsx}"],
    exclude: ["node_modules", ".next"],
    testTimeout: 120000, // Gemini API + database calls may take a while
    hookTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
