import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(import.meta.dirname, "src"), "server-only": path.resolve(import.meta.dirname, "tests/stubs/server-only.ts") } },
  test: {
    environment: "node",
    setupFiles: ["tests/setup-env.ts"],
    testTimeout: 120_000,
    hookTimeout: 600_000,
    fileParallelism: false,
    projects: [
      { extends: true, test: { name: "unit", include: ["tests/unit/**/*.test.ts"] } },
      { extends: true, test: { name: "integration", include: ["tests/integration/**/*.test.ts"], setupFiles: ["tests/setup-env.ts", "tests/integration/setup.ts"] } },
    ],
  },
});
