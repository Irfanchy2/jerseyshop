import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "tests/support/empty.ts"),
    },
  },
  test: {
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
    environment: "node",
    setupFiles: ["tests/support/setup.ts"],
    globalSetup: ["tests/support/global-setup.ts"],
    fileParallelism: false,
    testTimeout: 30000,
    hookTimeout: 120000,
  },
});
