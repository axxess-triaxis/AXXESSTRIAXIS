import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import { clearAiTracer, isAiTracingActive, registerAiTracer, traceAi } from "./aiTracing";

describe("AI tracing seam", () => {
  afterEach(() => clearAiTracer());

  it("runs the call and never describes the step when nothing is registered", async () => {
    const spec = vi.fn();
    await expect(traceAi(spec, async () => 7)).resolves.toBe(7);
    expect(spec).not.toHaveBeenCalled();
    expect(isAiTracingActive()).toBe(false);
  });

  it("shares the tracer across separately loaded copies of the module", async () => {
    registerAiTracer({ trace: async (_spec, call) => call() });
    vi.resetModules();
    const copy = await import("./aiTracing");
    expect(copy.isAiTracingActive()).toBe(true);
  });

  // aiRouter.ts is in the browser bundle (TopBar -> serviceProvider -> aiRouter) and the LangSmith SDK
  // imports node:async_hooks, so neither the seam nor its browser-reachable callers may import it.
  it.each([
    "src/services/ai/tracing/aiTracing.ts",
    "src/services/ai/tracing/traceModelCall.ts",
    "src/services/ai/router/aiRouter.ts",
  ])("%s does not import the SDK or the tracer", (path) => {
    expect(readFileSync(path, "utf8")).not.toMatch(/(from|import\()\s*["'](langsmith|[^"']*langsmithTracer)/);
  });
});
