import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

const fromRoot = (path) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  esbuild: {
    jsx: "automatic",
    jsxImportSource: "react",
  },
  test: {
    environment: "jsdom",
    exclude: ["tests/e2e/**", "**/node_modules/**", "node_modules/**", "dist/**", ".next/**"],
    fileParallelism: false,
    globals: true,
    pool: "threads",
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "text-summary", "json-summary", "html"],
      reportsDirectory: "./coverage",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/**/*.d.ts",
        "src/test/**",
      ],
    },
  },
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      "@axxess/shared": fromRoot("./packages/shared/src/index.ts"),
    },
  },
});
