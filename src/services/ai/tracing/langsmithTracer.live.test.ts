// @vitest-environment node
import { existsSync } from "node:fs";
import { Client } from "langsmith";
import { afterAll, describe, expect, it, vi } from "vitest";
import { routeAiRequest } from "../router/aiRouter";
import { clearAiTracer } from "./aiTracing";
import { langsmithTracingStatus, registerLangsmithTracing } from "./langsmithTracer";

// Sends ONE synthetic trace to the LangSmith agent named in .env.local, then reads it back, because an
// accepted write does not prove where it landed. Skipped unless asked for:
//   LANGSMITH_LIVE_TEST=1 pnpm exec vitest run --config vitest.config.mjs --reporter=default --silent=false src/services/ai/tracing/langsmithTracer.live.test.ts
// Uses the local provider, so it needs no model key and no sign-in, and sends made-up text only.
const live = process.env.LANGSMITH_LIVE_TEST === "1";
if (live && existsSync(".env.local")) process.loadEnvFile(".env.local");

describe.skipIf(!live)("LangSmith, live", () => {
  afterAll(() => clearAiTracer());

  it("stores a masked trace under the configured agent's local environment", async () => {
    const env = { ...process.env, NODE_ENV: "development" } as NodeJS.ProcessEnv;
    expect(langsmithTracingStatus(env)).toEqual({ enabled: true });

    const writes: Array<{ method: string; path: string; status: number }> = [];
    const runIds: string[] = [];
    const tracing = registerLangsmithTracing(env, {
      autoBatchTracing: false,
      fetchImplementation: async (input, init) => {
        const response = await fetch(input, init);
        const method = init?.method ?? "GET";
        if (method !== "GET") {
          writes.push({ method, path: new URL(String(input)).pathname, status: response.status });
          if (method === "POST") runIds.push(JSON.parse(typeof init?.body === "string" ? init.body : await new Response(init?.body).text()).id);
        }
        return response;
      },
    });

    await routeAiRequest(
      { prompt: "Synthetic tracing check from a developer machine. Reply to tracing.check@example.com.", task: "general_chat", context: { organizationId: "synthetic-org", userId: "synthetic-user", userRole: "Executive" } },
      { AXXESS_AI_ROUTING_MODE: "demo" } as unknown as NodeJS.ProcessEnv,
    );
    await tracing!.flush();
    // Unbatched writes run in the background: two runs, each created and then completed.
    await vi.waitFor(() => expect(writes.length).toBeGreaterThanOrEqual(4), { timeout: 20_000 }).catch(() => undefined);
    console.info(JSON.stringify(writes));
    expect(writes.length).toBe(4);
    expect(writes.every((write) => write.status >= 200 && write.status < 300)).toBe(true);

    const reader = new Client({ apiUrl: env.LANGSMITH_ENDPOINT, apiKey: env.LANGSMITH_API_KEY, workspaceId: env.LANGSMITH_WORKSPACE_ID });
    const agent = await reader.agents.retrieve(env.LANGSMITH_AGENT_ID!);
    const project = agent.environments.find((entry) => entry.environment === "LOCAL")?.tracer_session_id;
    expect(project).toBeTruthy();

    const stored = await vi.waitFor(async () => {
      const runs = await Promise.all(runIds.map((id) => reader.runs.retrieve(id, {
        project_id: project!,
        selects: ["ID", "NAME", "RUN_TYPE", "STATUS", "IS_ROOT", "PROJECT_ID", "TRACE_ID", "INPUTS", "OUTPUTS", "METADATA"],
      })));
      expect(runs.every((run) => run.outputs)).toBe(true);
      return runs;
    }, { timeout: 60_000, interval: 3_000 });

    const text = JSON.stringify(stored);
    console.info(JSON.stringify(stored.map(({ name, run_type, status, is_root, inputs, metadata }) => ({ name, run_type, status, is_root, inputs, metadata: Object.keys(metadata ?? {}) })), null, 1));
    expect(stored.map((run) => run.name).sort()).toEqual(["axxess-ai-route", "axxess-model:local"]);
    expect(stored.filter((run) => run.is_root)).toHaveLength(1);
    expect(new Set(stored.map((run) => run.trace_id)).size).toBe(1);
    expect(stored.every((run) => run.project_id === project)).toBe(true);
    expect(text).toContain("Synthetic tracing check");
    for (const hidden of ["tracing.check@example.com", "synthetic-org", "synthetic-user", "LANGSMITH_", "LANGCHAIN_"]) expect(text).not.toContain(hidden);
  }, 120_000);
});
