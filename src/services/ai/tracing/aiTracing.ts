// Seam between the AI code and an optional tracer (LangSmith, langsmithTracer.ts). No imports on
// purpose: aiRouter.ts reaches the browser bundle (TopBar -> serviceProvider -> aiRouter), and the SDK
// imports node:async_hooks. With no tracer registered, traceAi only runs the call.

export type AiTraceContext = {
  organizationId?: string;
  role?: string;
  task?: string;
  sensitivity?: string;
  // Groups the runs of one conversation. Never sent as is.
  threadKey?: string;
};

export type AiTraceSpec<T> = {
  name: string;
  kind: "chain" | "llm" | "tool";
  inputs: Record<string, unknown>;
  outputs: (value: T) => Record<string, unknown>;
  // Used from the outermost step only; nested steps inherit it.
  context?: AiTraceContext;
  // Keep the step, send no content for it or for the rest of its trace.
  redactContent?: boolean;
  // Record nothing for this step or inside it, and send no content for the rest of its trace.
  skip?: boolean;
  provider?: string;
  model?: (value: T) => string | undefined;
};

export interface AiTracer {
  trace<T>(spec: () => AiTraceSpec<T>, call: () => Promise<T>): Promise<T>;
}

// On globalThis because Next can load instrumentation.ts and a route handler as separate module copies.
const TRACER_KEY = Symbol.for("axxess.ai.tracer");
const holder = globalThis as { [TRACER_KEY]?: AiTracer };

export function registerAiTracer(tracer: AiTracer) {
  holder[TRACER_KEY] = tracer;
}

export function clearAiTracer() {
  delete holder[TRACER_KEY];
}

export function isAiTracingActive() {
  return Boolean(holder[TRACER_KEY]);
}

export async function traceAi<T>(spec: () => AiTraceSpec<T>, call: () => Promise<T>): Promise<T> {
  const tracer = holder[TRACER_KEY];
  return tracer ? tracer.trace(spec, call) : call();
}
