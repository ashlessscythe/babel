import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 600_000,
    hookTimeout: 600_000,
    include: ["src/core/__tests__/heavy-math.test.ts"],
    pool: "forks",
    fileParallelism: false,
  },
});
