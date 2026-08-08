import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const repositoryRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": repositoryRoot,
    },
  },
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: [
      "lib/**/*.test.{ts,tsx}",
      "tests/**/*.test.{ts,tsx}",
    ],
    passWithNoTests: true,
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
      reporter: ["text", "html", "json-summary"],
    },
  },
});
