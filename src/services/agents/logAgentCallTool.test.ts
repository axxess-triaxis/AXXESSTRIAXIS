import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentScope } from "../../security/agentScope";

const JOB = "11111111-2222-3333-4444-555555555555";
const state = {
  done: null as null | { job: { id: string; leadId: string; status: string }; alreadyDone: boolean },
  completed: [] as unknown[],
  updates: [] as Array<{ id: string; input: Record<string, unknown> }>,
  tasks: [] as Array<Record<string, unknown>>,
  suppressions: [] as Array<Record<string, unknown>>,
  suppressFails: false,
};

vi.mock("../../repositories/agentCallRepository", () => ({
  completeAgentCallJob: async (org: string, jobId: string, result: unknown) => { state.completed.push({ org, jobId, result }); return state.done; },
}));
vi.mock("../../repositories/leadWorkRepository", () => ({
  getLead: async (_s: unknown, id: string) => (id === "l1" ? { id: "l1", title: "Acme - Asha", stage: "new", phoneE164: "+919876543210" } : null),
}));
vi.mock("../../repositories/crmRepository", () => ({
  updateCrmLead: async (_s: unknown, id: string, input: Record<string, unknown>) => { state.updates.push({ id, input }); return { id }; },
}));
vi.mock("../../repositories/supabaseAdmin", () => ({
  supabaseAdminRest: async (table: string, options: { body?: Record<string, unknown> }) => {
    if (table === "contact_suppressions") { if (state.suppressFails) throw new Error("duplicate"); state.suppressions.push(options.body ?? {}); return null; }
    if (table === "tasks") { state.tasks.push(options.body ?? {}); return [{ id: "t1", organization_id: "org-1", title: options.body?.title, priority: options.body?.priority, status: "pending", tags: [] }]; }
    return [];
  },
  isSupabaseAdminConfigured: () => true,
}));

import { getAgentTool, validateAgentToolArguments } from "./toolRegistry";

const scope: AgentScope = { organizationId: "org-1", agentConnectionId: "c1", provider: "custom" as AgentScope["provider"], capabilities: ["log_agent_call"], issuedByUserId: "u1" };
const tool = getAgentTool("log_agent_call")!;
const run = (args: Record<string, unknown>) => tool.handler(scope, args);
const text = (r: Awaited<ReturnType<typeof run>>) => JSON.parse(r.content[0].text);

describe("log_agent_call", () => {
  beforeEach(() => {
    state.done = { job: { id: JOB, leadId: "l1", status: "completed" }, alreadyDone: false };
    state.completed.length = 0; state.updates.length = 0; state.tasks.length = 0; state.suppressions.length = 0; state.suppressFails = false;
  });

  it("is an auto tool behind its own opt-in capability", () => {
    expect(tool.criticality).toBe("auto");
    expect(tool.requiredCapability).toBe("log_agent_call");
    expect(validateAgentToolArguments(tool, { jobId: JOB, status: "completed", transcript: "x" }).ok).toBe(false);
  });

  it("logs an interested call: completes the job, moves the lead to qualifying, sets the follow-up and leaves a task", async () => {
    const result = await run({ jobId: JOB, status: "completed", outcome: "interested", summary: "Wants a demo next week.", actionItems: ["Send deck"], followUpAt: "2026-11-18T05:00:00Z" });
    expect(result.isError).toBeUndefined();
    expect(state.completed).toEqual([{ org: "org-1", jobId: JOB, result: { status: "completed", outcome: "interested", summary: "Wants a demo next week.", actionItems: ["Send deck"] } }]);
    expect(state.updates).toEqual([{ id: "l1", input: { stage: "qualifying", nextFollowUpAt: "2026-11-18T05:00:00.000Z" } }]);
    expect(state.tasks).toEqual([expect.objectContaining({ organization_id: "org-1", title: "Follow up: Acme - Asha", priority: "high", due_date: "2026-11-18" })]);
    expect(String(state.tasks[0].description)).toContain(`Agent call job ${JOB}.`);
    expect(text(result)).toEqual(expect.objectContaining({ status: "completed", leadTitle: "Acme - Asha", taskId: "t1" }));
  });

  it("changes nothing on a replayed event", async () => {
    state.done = { job: { id: JOB, leadId: "l1", status: "completed" }, alreadyDone: true };
    const result = await run({ jobId: JOB, status: "completed", outcome: "interested", summary: "again" });
    expect(text(result)).toEqual({ jobId: JOB, alreadyLogged: true, status: "completed" });
    expect(state.updates).toEqual([]);
    expect(state.tasks).toEqual([]);
  });

  it("records a failed call without touching the lead", async () => {
    const result = await run({ jobId: JOB, status: "failed", failureReason: "provider_unavailable" });
    expect(state.completed).toEqual([expect.objectContaining({ result: { status: "failed", failureReason: "provider_unavailable" } })]);
    expect(text(result)).toEqual({ jobId: JOB, status: "failed" });
    expect(state.updates).toEqual([]);
  });

  it("suppresses the number for human and agent calls when the contact opts out, with no task or follow-up", async () => {
    const result = await run({ jobId: JOB, status: "completed", outcome: "not_interested", summary: "Asked not to be called.", optedOut: true, followUpAt: "2026-11-18T05:00:00Z" });
    expect(state.suppressions).toEqual([
      expect.objectContaining({ organization_id: "org-1", identifier: "+919876543210", channel: "voice_human", reason: "opt_out" }),
      expect.objectContaining({ channel: "voice_ai", reason: "opt_out" }),
    ]);
    expect(state.updates).toEqual([{ id: "l1", input: { status: "lost" } }]);
    expect(state.tasks).toEqual([]);
    expect(text(result)).toEqual(expect.objectContaining({ optedOut: true, suppressed: true }));
  });

  it("reports an error when the opt-out could not be recorded", async () => {
    state.suppressFails = true;
    expect((await run({ jobId: JOB, status: "completed", outcome: "not_interested", optedOut: true })).isError).toBe(true);
  });

  it("creates no task for a no-answer with no action items", async () => {
    await run({ jobId: JOB, status: "completed", outcome: "no_answer", summary: "" });
    expect(state.tasks).toEqual([]);
    expect(state.updates).toEqual([]);
  });

  it("rejects a bad job id, a missing outcome and an unknown job", async () => {
    expect((await run({ jobId: "not-a-uuid", status: "completed", outcome: "interested" })).isError).toBe(true);
    expect((await run({ jobId: JOB, status: "completed" })).isError).toBe(true);
    state.done = null;
    expect((await run({ jobId: JOB, status: "failed" })).isError).toBe(true);
  });
});
