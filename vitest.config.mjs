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
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
  },
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      "@axxess/shared": fromRoot("./packages/shared/src/index.ts"),
    },
  },
});
