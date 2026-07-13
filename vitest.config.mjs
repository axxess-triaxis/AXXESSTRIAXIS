import { defineConfig } from "vitest/config";

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
      "@": new URL("./src", import.meta.url).pathname,
      "@axxess/shared": new URL("./packages/shared/src/index.ts", import.meta.url).pathname,
    },
  },
});
