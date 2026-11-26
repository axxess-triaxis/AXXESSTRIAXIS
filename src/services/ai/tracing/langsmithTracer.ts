// LangSmith tracing for a developer machine. Server only: loaded from instrumentation.ts, never from code
// that reaches the browser (see aiTracing.ts).
//
// Local only, enforced here and not by settings: every tenant's AI policy defaults to
// zeroDataRetentionRequired (tenantModelPolicy.ts), and LangSmith stores what it receives. Content is
// masked, but names and business details are not, so use it with test data.
import { AsyncLocalStorage } from "node:async_hooks";
import { randomBytes } from "node:crypto";
import { AgentAddress, Client } from "langsmith";
import { createSecretAnonymizer } from "langsmith/anonymizer";
import { getCurrentRunTree, traceable } from "langsmith/traceable";
import { maskPii, tokenizePersonalValue } from "../../../privacy/privacyEngine";
import { classifyAiPrompt } from "../prompt-classifier";
import { registerAiTracer, type AiTraceSpec } from "./aiTracing";

const DEFAULT_ENDPOINT = "https://api.smith.langchain.com";
const REDACTED = { redacted: "Content not sent: restricted, or not known to be unrestricted." };

type ClientOptions = NonNullable<ConstructorParameters<typeof Client>[0]>;
type TraceState = { metadata: Record<string, string>; redact: boolean; suppressed: boolean };

// Wrapper for the error the SDK sees, so the real message and stack are never uploaded.
class TracedStepError extends Error {
  constructor(type: string) {
    super(`AI step failed (${type})`);
    this.name = "TracedStepError";
    this.stack = undefined;
  }
}

export function langsmithTracingStatus(env: NodeJS.ProcessEnv): { enabled: true } | { enabled: false; reason: string } {
  const off = (reason: string) => ({ enabled: false as const, reason });
  if (env.LANGSMITH_TRACING !== "true") return off("LANGSMITH_TRACING is not \"true\".");
  if (!env.LANGSMITH_API_KEY) return off("LANGSMITH_API_KEY is not set.");
  if (/[\s"']/.test(env.LANGSMITH_API_KEY)) return off("LANGSMITH_API_KEY holds spaces or quotes, so it is not a key.");
  if (!env.LANGSMITH_AGENT_ID) return off("LANGSMITH_AGENT_ID is not set.");
  if (env.LANGSMITH_AGENT_ENVIRONMENT !== "local") return off("LANGSMITH_AGENT_ENVIRONMENT is not \"local\".");
  if (env.NODE_ENV === "production") return off("This is a production build.");
  if (env.VERCEL) return off("This is running on Vercel.");
  if (!(env.LANGSMITH_ENDPOINT || DEFAULT_ENDPOINT).startsWith("https://")) return off("LANGSMITH_ENDPOINT is not https.");
  // These would send every run to further destinations.
  if (env.LANGSMITH_RUNS_ENDPOINTS || env.LANGCHAIN_RUNS_ENDPOINTS) return off("Extra run endpoints are set.");
  return { enabled: true };
}

function isRestricted(content: unknown) {
  const text = JSON.stringify(content) ?? "";
  return classifyAiPrompt({ prompt: text, context: { organizationId: "", userId: "", userRole: "" } }).sensitivity === "restricted";
}

const maskSecrets = createSecretAnonymizer();

function mask(value: unknown): unknown {
  if (typeof value === "string") return maskPii(maskSecrets({ value }).value);
  if (Array.isArray(value)) return value.map(mask);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, mask(entry)]));
  return value;
}

// Content is cleaned here, before the SDK holds it, so no SDK setting can send the original.
function clean(state: TraceState, content: Record<string, unknown>): Record<string, unknown> {
  try {
    const plain = JSON.parse(JSON.stringify(content)) as Record<string, unknown>;
    const { usage_metadata: usage, live, ...text } = plain;
    if (!state.redact && isRestricted(text)) state.redact = true;
    return {
      ...(state.redact ? REDACTED : mask(text) as Record<string, unknown>),
      ...(usage === undefined ? {} : { usage_metadata: usage }),
      ...(live === undefined ? {} : { live }),
    };
  } catch {
    return { ...REDACTED };
  }
}

export function registerLangsmithTracing(env: NodeJS.ProcessEnv = process.env, options: ClientOptions = {}): { flush: () => Promise<void> } | undefined {
  if (!langsmithTracingStatus(env).enabled) return undefined;

  let address: AgentAddress;
  let client: Client;
  try {
    address = new AgentAddress(env.LANGSMITH_AGENT_ID!, "local");
    client = new Client({
      apiUrl: env.LANGSMITH_ENDPOINT || DEFAULT_ENDPOINT,
      apiKey: env.LANGSMITH_API_KEY,
      workspaceId: env.LANGSMITH_WORKSPACE_ID,
      // Already cleaned above; hideMetadata stays off because masking would break IDs made of digits.
      hideInputs: false,
      hideOutputs: false,
      hideMetadata: false,
      blockOnRootRunFinalization: false,
      // Otherwise the SDK adds every LANGSMITH_* and LANGCHAIN_* variable it does not think secret, and git SHAs.
      omitTracedRuntimeInfo: true,
      callerOptions: { maxRetries: 1 },
      ...options,
    });
  } catch {
    console.warn("LangSmith tracing is off: the agent ID or client settings are not valid.");
    return undefined;
  }

  const states = new AsyncLocalStorage<TraceState>();
  const salt = randomBytes(16).toString("hex");
  const token = (value: string) => tokenizePersonalValue(value, salt);

  function metadataFor(spec: AiTraceSpec<never>): Record<string, string> {
    const { organizationId, role, task, sensitivity, threadKey } = spec.context ?? {};
    return Object.fromEntries(Object.entries({
      app_version: env.NEXT_PUBLIC_AXXESS_APP_VERSION,
      organization: organizationId && token(organizationId),
      thread_id: threadKey && token(`${organizationId ?? ""}:${threadKey}`),
      role,
      task,
      sensitivity,
    }).filter((entry): entry is [string, string] => Boolean(entry[1])));
  }

  registerAiTracer({
    async trace<T>(describe: () => AiTraceSpec<T>, call: () => Promise<T>): Promise<T> {
      const parent = states.getStore();
      if (parent?.suppressed) return call();

      let spec: AiTraceSpec<T>;
      let state: TraceState;
      let inputs: Record<string, unknown>;
      try {
        spec = describe();
        state = parent ?? { metadata: metadataFor(spec as AiTraceSpec<never>), redact: false, suppressed: false };
        if (spec.redactContent || spec.skip) state.redact = true;
        inputs = clean(state, spec.inputs);
      } catch {
        // Cannot tell what this step holds, so record nothing for it.
        if (parent) parent.redact = true;
        return states.run({ metadata: {}, redact: true, suppressed: true }, call);
      }
      if (spec.skip) return states.run({ ...state, suppressed: true }, call);

      let started = false;
      let settled: { ok: true; value: T } | { ok: false; error: unknown } | undefined;

      const step = traceable<(stepInputs: Record<string, unknown>) => Promise<Record<string, unknown>>>(
        async () => {
          started = true;
          try {
            const value = await call();
            settled = { ok: true, value };
          } catch (error) {
            settled = { ok: false, error };
            throw new TracedStepError(error instanceof Error ? error.name : "unknown");
          }
          try {
            const model = spec.model?.(settled.value);
            const run = getCurrentRunTree(true);
            if (model && run) run.metadata = { ...run.metadata, ls_model_name: model };
            return clean(state, spec.outputs(settled.value));
          } catch {
            return { ...REDACTED };
          }
        },
        {
          name: spec.name,
          run_type: spec.kind,
          client,
          address,
          tracingEnabled: true,
          metadata: { ...state.metadata, ...(spec.provider ? { ls_provider: spec.provider } : {}) },
        },
      );

      return states.run(state, async () => {
        try {
          await step(inputs);
        } catch {
          // Either the step failed (rethrown below) or the SDK did (the result stands).
        }
        if (settled?.ok) return settled.value;
        if (settled) throw settled.error;
        if (started) throw new Error("AI step did not finish.");
        return call();
      });
    },
  });

  return { flush: () => client.awaitPendingTraceBatches().then(() => undefined) };
}
