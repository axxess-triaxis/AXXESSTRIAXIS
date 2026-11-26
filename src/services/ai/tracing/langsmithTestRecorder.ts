import { registerLangsmithTracing } from "./langsmithTracer";

// Test helper: registers the real tracer with a fetch that records what would have been sent.

export type Sent = { url: string; method: string; body: Record<string, unknown> };
export type Run = Record<string, unknown> & {
  id: string;
  name: string;
  trace_id: string;
  parent_run_id?: string;
  run_type: string;
  inputs: Record<string, unknown>;
  outputs?: Record<string, unknown>;
  extra: { metadata: Record<string, unknown> };
};

export const langsmithTestEnv = {
  NODE_ENV: "development",
  LANGSMITH_TRACING: "true",
  LANGSMITH_API_KEY: "test-key-not-real",
  LANGSMITH_ENDPOINT: "https://api.smith.langchain.com",
  LANGSMITH_AGENT_ID: "axxess-triaxis",
  LANGSMITH_AGENT_ENVIRONMENT: "local",
} as unknown as NodeJS.ProcessEnv;

export function recorder(respond: () => Promise<Response> = async () => new Response("{}", { status: 200 })) {
  const sent: Sent[] = [];
  const fetchImplementation = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    const method = init?.method ?? "GET";
    if (method !== "GET") {
      const raw = typeof init?.body === "string" ? init.body : await new Response(init?.body).text();
      sent.push({ url, method, body: JSON.parse(raw || "{}") as Record<string, unknown> });
    }
    return respond();
  }) as typeof fetch;
  return { sent, fetchImplementation };
}

export function startRecordedTracing(overrides: Record<string, string> = {}, record = recorder()) {
  const tracing = registerLangsmithTracing({ ...langsmithTestEnv, ...overrides } as NodeJS.ProcessEnv, {
    fetchImplementation: record.fetchImplementation,
    autoBatchTracing: false,
  });
  return { ...record, tracing };
}

// A run is created by POST and completed by PATCH; a later value wins.
export function runsFrom(sent: Sent[]): Run[] {
  const byId = new Map<string, Run>();
  for (const { url, body } of sent) {
    const id = String(body.id ?? url.split("/").pop());
    const defined = Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined && value !== null));
    byId.set(id, { ...byId.get(id), ...defined, id } as Run);
  }
  return [...byId.values()];
}
