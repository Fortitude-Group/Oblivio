import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@observatory/core": resolve(__dirname, "packages/core/src/index.ts"),
      "@observatory/config": resolve(__dirname, "packages/config/src/index.ts"),
      "@observatory/scoring-engine": resolve(
        __dirname,
        "packages/scoring-engine/src/index.ts",
      ),
      "@observatory/db": resolve(__dirname, "packages/db/src/index.ts"),
      "@web": resolve(__dirname, "apps/web"),
      "@observatory/ingestion": resolve(
        __dirname,
        "packages/ingestion/src/index.ts",
      ),
    },
  },
  test: {
    include: [
      "packages/**/tests/**/*.test.ts",
      "services/**/tests/**/*.test.ts",
      "apps/**/tests/**/*.test.ts",
    ],
    environment: "node",
    // Run test files sequentially so the DB-touching suites don't race on the
    // shared local Postgres (each truncates in beforeAll).
    fileParallelism: false,
  },
});
