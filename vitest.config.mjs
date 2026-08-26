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
    exclude: [
      "tests/e2e/**",
      "**/node_modules/**",
      "node_modules/**",
      "dist/**",
      ".next/**",
      ".cache/**",
      ".claude/**",
      ".agents/**",
      ".pnpm-store/**",
      "coverage/**",
      "playwright-report/**",
      "test-results/**",
    ],
    // 2026-08-01: re-enabled (was `false`, set in sprint-19 commit eff0265 with no documented
    // reason). Serializing every test file despite 8 available CPU cores was the dominant cost
    // in a full-suite run (only ~92s of ~6072s total was actual test execution; the rest was
    // transform/setup/environment overhead paid once per file, back-to-back instead of
    // overlapped). Revert to `false` if this reintroduces or worsens the intermittent
    // "Timeout waiting for worker to respond" / "Failed to start threads worker" flakiness seen
    // on livePlatform.test.ts / pilotCommandCenter.test.ts.
    fileParallelism: true,
    globals: true,
    pool: "threads",
    // 2026-08-25: capped after tracing the recurring "Worker exited unexpectedly" crash (referenced
    // as pre-existing infra debt across multiple prior PRs' bypass justifications) to real memory
    // exhaustion, not a code bug: this machine has 8 CPUs but as little as ~1GB free RAM under normal
    // dev-session load, while the uncapped default spins up to 8 concurrent worker threads (one per
    // core), each loading its own jsdom + transform pipeline. Capping concurrency trades some of the
    // fileParallelism speedup above for not OOM-killing a worker mid-run. Revisit upward if this
    // machine's available memory profile changes.
    poolOptions: {
      threads: {
        minThreads: 2,
        maxThreads: 4,
      },
    },
    // 2026-08-01: paired with re-enabling fileParallelism above. The default 5000ms testTimeout
    // is tight enough that genuine CPU contention across up to 200 concurrently-running test
    // files can push a handful of async-heavy tests (large list renders, waitFor on mocked
    // fetches) past it -- confirmed by re-running the same failing tests in isolation, where
    // they passed cleanly every time. This is not a fix for a real bug; it's giving real
    // parallel execution enough headroom to not trip a timeout tuned for serial execution.
    testTimeout: 15000,
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
      "@axxess/features-lite": fromRoot("./packages/features-lite/src/index.ts"),
      "@axxess/core": fromRoot("./packages/core/src/index.ts"),
    },
  },
});
