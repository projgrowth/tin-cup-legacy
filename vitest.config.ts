import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    exclude: ["tests/e2e/**", "**/node_modules/**", "**/.output/**"],
  },
});
