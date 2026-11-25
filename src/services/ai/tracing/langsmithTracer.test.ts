// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { clearAiTracer, isAiTracingActive, traceAi } from "./aiTracing";
import { langsmithTestEnv as env, recorder, runsFrom, startRecordedTracing } from "./langsmithTestRecorder";
import { langsmithTracingStatus } from "./langsmithTracer";
import { routeAiRequest } from "../router/aiRouter";

// Nothing here reaches LangSmith: the SDK client gets a fetch that records what would have been sent.
const start = startRecordedTracing;
const context = { organizationId: "11111111-aaaa-4000-8000-000000000001", role: "Executive", task: "general_chat", threadKey: "chat-42" };

describe("LangSmith tracing", () => {
  beforeEach(() => clearAiTracer());
  afterEach(() => {
    clearAiTracer();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  describe("when it stays off", () => {
    it.each([
      ["tracing is not enabled", { LANGSMITH_TRACING: "" }],
      ["the API key is missing", { LANGSMITH_API_KEY: "" }],
      ["the API key is not a single word", { LANGSMITH_API_KEY: "some other pasted text" }],
      ["the agent ID is missing", { LANGSMITH_AGENT_ID: "" }],
      ["the agent ID is malformed", { LANGSMITH_AGENT_ID: "Not A Valid ID" }],
      ["the environment is missing", { LANGSMITH_AGENT_ENVIRONMENT: "" }],
      ["the environment is staging", { LANGSMITH_AGENT_ENVIRONMENT: "staging" }],
      ["the environment is production", { LANGSMITH_AGENT_ENVIRONMENT: "production" }],
      ["it is a production build", { NODE_ENV: "production" }],
      ["it runs on Vercel", { VERCEL: "1" }],
      ["the endpoint is not https", { LANGSMITH_ENDPOINT: "http://example.test" }],
      ["extra destinations are set", { LANGSMITH_RUNS_ENDPOINTS: "{}" }],
      ["extra destinations are set by the legacy name", { LANGCHAIN_RUNS_ENDPOINTS: "{}" }],
    ] as Array<[string, Record<string, string>]>)("sends nothing when %s", async (_case, overrides) => {
      const { sent, tracing } = start(overrides);
      const result = await traceAi(() => ({ name: "x", kind: "chain", inputs: { question: "hi" }, outputs: () => ({}) }), async () => "answer");

      expect(tracing).toBeUndefined();
      expect(isAiTracingActive()).toBe(false);
      expect(result).toBe("answer");
      expect(sent).toEqual([]);
    });

    it("gives a reason that never contains the key", () => {
      const status = langsmithTracingStatus({ ...env, VERCEL: "1" } as NodeJS.ProcessEnv);
      expect(status.enabled).toBe(false);
      expect(JSON.stringify(status)).not.toContain("test-key-not-real");
    });

    it("is on with the requested settings", () => {
      expect(langsmithTracingStatus(env)).toEqual({ enabled: true });
    });
  });

  it("sends one trace to the agent address, with shared metadata on every run", async () => {
    const { sent, tracing } = start();
    await traceAi(() => ({ name: "root", kind: "chain", inputs: { message: "hello" }, outputs: (value: string) => ({ reply: value }), context }), async () => {
      await traceAi(() => ({ name: "child", kind: "tool", inputs: { limit: 5 }, outputs: () => ({ text: "ok" }) }), async () => undefined);
      return "done";
    });
    await tracing!.flush();

    const runs = runsFrom(sent);
    const root = runs.find((run) => run.name === "root")!;
    const child = runs.find((run) => run.name === "child")!;
    expect(runs).toHaveLength(2);
    expect(root.parent_run_id).toBeUndefined();
    expect(child.parent_run_id).toBe(root.id);
    expect(child.trace_id).toBe(root.trace_id);
    expect(child.run_type).toBe("tool");
    expect(root.outputs).toEqual({ reply: "done" });
    expect(sent.every((call) => call.url.startsWith("https://api.smith.langchain.com/"))).toBe(true);
    for (const run of runs) {
      expect(JSON.stringify(run)).toContain("axxess-triaxis");
      expect(JSON.stringify(run).toLowerCase()).toContain("local");
      expect(run.session_name).toBeUndefined();
      expect(run.extra.metadata).toMatchObject({ role: "Executive", task: "general_chat" });
      expect(run.extra.metadata.thread_id).toBe(root.extra.metadata.thread_id);
      expect(run.extra.metadata.thread_id).toBeTruthy();
    }
  });

  it("ignores a leftover LANGSMITH_PROJECT", async () => {
    vi.stubEnv("LANGSMITH_PROJECT", "some-other-project");
    const { sent, tracing } = start();
    await traceAi(() => ({ name: "root", kind: "chain", inputs: {}, outputs: () => ({}) }), async () => 1);
    await tracing!.flush();
    expect(sent.length).toBeGreaterThan(0);
    expect(JSON.stringify(sent)).not.toContain("some-other-project");
  });

  it("sends none of this machine's environment or git details", async () => {
    vi.stubEnv("LANGSMITH_NOTE", "env-note-value");
    vi.stubEnv("LANGCHAIN_NOTE", "legacy-note-value");
    vi.stubEnv("LANGSMITH_REVISION_ID", "revision-value");
    const { sent, tracing } = start();
    await traceAi(() => ({ name: "x", kind: "chain", inputs: {}, outputs: () => ({}), context }), async () => "answer");
    await tracing!.flush();

    expect(sent.length).toBeGreaterThan(0);
    for (const hidden of ["NOTE", "note-value", "revision-value", "LANGSMITH_TRACING"]) expect(JSON.stringify(sent)).not.toContain(hidden);
    expect(runsFrom(sent)[0].extra.metadata).toMatchObject({ role: "Executive", task: "general_chat" });
  });

  it("masks personal data and secrets, and sends no raw organization or conversation ID", async () => {
    const { sent, tracing } = start();
    // Assembled at run time so secret scanners do not flag this file.
    const secret = ["sk", "proj", "A1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q7r8S9t0"].join("-");
    await traceAi(
      () => ({
        name: "root",
        kind: "chain",
        inputs: { message: "mail a.person@example.com or call +91 98765 43210", nested: [{ value: `api_key=${secret}` }] },
        outputs: () => ({ reply: "sent to b.person@example.com" }),
        context,
      }),
      async () => 1,
    );
    await tracing!.flush();

    const wire = JSON.stringify(sent);
    for (const leaked of ["a.person@example.com", "b.person@example.com", "98765 43210", secret, context.organizationId, context.threadKey, "test-key-not-real"]) {
      expect(wire).not.toContain(leaked);
    }
    expect(wire).toContain("[redacted]");
  });

  it("drops content that the sensitivity rules call restricted, and everything after it in the trace", async () => {
    const { sent, tracing } = start();
    await traceAi(() => ({ name: "root", kind: "chain", inputs: { message: "list my files" }, outputs: () => ({ reply: "Quarterly zebra plan" }) }), async () => {
      await traceAi(() => ({ name: "tool", kind: "tool", inputs: {}, outputs: () => ({ text: JSON.stringify({ title: "Zebra merger", classification: "restricted" }) }) }), async () => 1);
      await traceAi(() => ({ name: "model", kind: "llm", inputs: { text: "Zebra merger" }, outputs: () => ({ text: "Zebra merger summary" }) }), async () => 1);
    });
    await tracing!.flush();

    const wire = JSON.stringify(sent);
    expect(runsFrom(sent)).toHaveLength(3);
    expect(wire).toContain("list my files");
    expect(wire).not.toMatch(/zebra/i);
  });

  it("redacts the rest of the trace when a nested step asks for it", async () => {
    const { sent, tracing } = start();
    await traceAi(() => ({ name: "root", kind: "chain", inputs: { message: "ask" }, outputs: () => ({ reply: "zebra reply" }) }), async () => {
      await traceAi(() => ({ name: "answer", kind: "chain", redactContent: true, inputs: { question: "zebra question" }, outputs: () => ({ answer: "zebra answer" }) }), async () => 1);
    });
    await tracing!.flush();
    expect(runsFrom(sent)).toHaveLength(2);
    expect(JSON.stringify(sent)).not.toMatch(/zebra/i);
  });

  it("records nothing for a skipped step or anything inside it, and redacts the rest of the trace", async () => {
    const { sent, tracing } = start();
    await traceAi(() => ({ name: "root", kind: "chain", inputs: { message: "ask" }, outputs: () => ({ reply: "zebra" }) }), async () => {
      await traceAi(() => ({ name: "route", kind: "chain", skip: true, inputs: {}, outputs: () => ({}) }), async () => {
        await traceAi(() => ({ name: "model", kind: "llm", inputs: { text: "zebra" }, outputs: () => ({}) }), async () => 1);
      });
    });
    await tracing!.flush();
    expect(runsFrom(sent).map((run) => run.name)).toEqual(["root"]);
    expect(JSON.stringify(sent)).not.toMatch(/zebra/i);
  });

  it("keeps two simultaneous traces apart", async () => {
    const { sent, tracing } = start();
    const run = (name: string, redactContent: boolean) => traceAi(
      () => ({ name, kind: "chain", redactContent, inputs: { text: `${name} input` }, outputs: () => ({ text: `${name} output` }) }),
      () => new Promise((resolve) => setTimeout(resolve, 5)),
    );
    await Promise.all([run("alpha", true), run("beta", false)]);
    await tracing!.flush();
    const wire = JSON.stringify(sent);
    expect(wire).not.toContain("alpha output");
    expect(wire).toContain("beta output");
    expect(new Set(runsFrom(sent).map((entry) => entry.trace_id)).size).toBe(2);
  });

  it("rethrows the original error and sends only its type", async () => {
    const { sent, tracing } = start();
    class UpstreamError extends Error {
      name = "UpstreamError";
    }
    const original = new UpstreamError("zebra details for a.person@example.com");
    await expect(traceAi(() => ({ name: "root", kind: "chain", inputs: {}, outputs: () => ({}) }), async () => { throw original; })).rejects.toBe(original);
    await tracing!.flush();
    const wire = JSON.stringify(sent);
    expect(wire).toContain("UpstreamError");
    expect(wire).not.toMatch(/zebra|a\.person/);
  });

  it.each([
    ["LangSmith returns 500", async () => new Response("no", { status: 500 })],
    ["the key is rejected", async () => new Response("no", { status: 401 })],
    ["the network fails", async () => { throw new Error("offline"); }],
  ] as Array<[string, () => Promise<Response>]>)("does not change or repeat the AI call when %s", async (_case, respond) => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    start({}, recorder(respond));
    const call = vi.fn(async () => "answer");
    await expect(traceAi(() => ({ name: "root", kind: "chain", inputs: {}, outputs: () => ({}) }), call)).resolves.toBe("answer");
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("does not wait for a LangSmith that never answers", async () => {
    start({}, recorder(() => new Promise<Response>(() => undefined)));
    const outcome = await Promise.race([
      traceAi(() => ({ name: "root", kind: "chain", inputs: {}, outputs: () => ({}) }), async () => "answer"),
      new Promise((resolve) => setTimeout(() => resolve("blocked"), 1000)),
    ]);
    expect(outcome).toBe("answer");
  });

  it("runs the call once when describing the step or its outputs throws", async () => {
    start();
    const first = vi.fn(async () => "answer");
    await expect(traceAi(() => { throw new Error("bad spec"); }, first)).resolves.toBe("answer");
    expect(first).toHaveBeenCalledTimes(1);

    const second = vi.fn(async () => "answer");
    await expect(traceAi(() => ({ name: "x", kind: "chain", inputs: {}, outputs: () => { throw new Error("bad outputs"); } }), second)).resolves.toBe("answer");
    expect(second).toHaveBeenCalledTimes(1);
  });

  describe("routeAiRequest", () => {
    const routing = { organizationId: context.organizationId, userId: "22222222-bbbb-4000-8000-000000000002", userRole: "Executive" };

    it("traces the route and its model call, with tokens and model", async () => {
      vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({
        choices: [{ message: { content: "Backlog fell." } }],
        usage: { prompt_tokens: 10, completion_tokens: 4 },
      }), { status: 200 })));
      const { sent, tracing } = start();
      const result = await routeAiRequest(
        { prompt: "Say how the backlog moved.", task: "general_chat", context: routing },
        { GROQ_API_KEY: "test", AXXESS_AI_ROUTING_MODE: "demo" } as unknown as NodeJS.ProcessEnv,
      );
      await tracing!.flush();

      expect(result.providerUsed).toBe("groq");
      const runs = runsFrom(sent);
      const route = runs.find((run) => run.name === "axxess-ai-route")!;
      const model = runs.find((run) => run.name === "axxess-model:groq")!;
      expect(runs).toHaveLength(2);
      expect(model.parent_run_id).toBe(route.id);
      expect(model.run_type).toBe("llm");
      expect(model.outputs!.usage_metadata).toMatchObject({ input_tokens: 10, output_tokens: 4, total_tokens: 14 });
      expect(model.outputs!.live).toBe(true);
      expect(model.extra.metadata).toMatchObject({ ls_provider: "groq", ls_model_name: "openai/gpt-oss-120b" });
      expect(route.outputs!.answer).toBe("Backlog fell.");
      expect(JSON.stringify(sent)).not.toContain(routing.userId);
      expect(JSON.stringify(sent)).not.toContain(routing.organizationId);
    });

    it("sends nothing for a restricted prompt and returns the same answer", async () => {
      const request = { prompt: "Summarize the salary record.", task: "general_chat" as const, context: routing };
      const routeEnv = { AXXESS_AI_ROUTING_MODE: "demo" } as unknown as NodeJS.ProcessEnv;
      const untraced = await routeAiRequest(request, routeEnv);
      const { sent, tracing } = start();
      const traced = await routeAiRequest(request, routeEnv);
      await tracing!.flush();
      expect(sent).toEqual([]);
      expect(traced.answer).toBe(untraced.answer);
    });
  });
});
