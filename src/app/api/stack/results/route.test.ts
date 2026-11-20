// Stack org routing: results land only in the organization that started the job. Repository, audit
// and tools are mocked; organizations and ids are invented.
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "x".repeat(40);
const ORG_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ORG_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CALL_JOB = "11111111-1111-4111-8111-111111111111";
const MSG_JOB = "22222222-2222-4222-8222-222222222222";

type Owner = { organizationId: string; leadId: string; requestedBy: string | null; status: string };
const state = {
  owners: new Map<string, Owner>(),
  settings: new Map<string, { callismaticEnabled: boolean; omnidamusEnabled: boolean }>(),
  closed: new Set<string>(),
  completions: [] as Array<{ org: string; jobId: string }>,
  linked: [] as Array<{ org: string; jobId: string; taskId: string }>,
  audits: [] as Array<{ org: string; toolName: string; success: boolean; errorMessage?: string }>,
  toolCalls: [] as Array<{ tool: string; org: string; args: Record<string, unknown> }>,
};

vi.mock("../../../../repositories/stackJobsRepository", () => ({
  findStackJobOwner: async (_product: string, jobId: string) => state.owners.get(jobId) ?? null,
  getOrgAgentSettings: async (org: string) => state.settings.get(org) ?? { callismaticEnabled: false, omnidamusEnabled: false },
  completeMessageJob: async (org: string, jobId: string) => {
    if (state.closed.has(jobId)) return false;
    state.closed.add(jobId);
    state.completions.push({ org, jobId });
    return true;
  },
  setMessageJobTask: async (org: string, jobId: string, taskId: string) => { state.linked.push({ org, jobId, taskId }); },
}));

vi.mock("../../../../services/agents/agentConnectionRepository", () => ({
  recordAgentToolAuditEvent: async (scope: { organizationId: string }, input: { toolName: string; success: boolean; errorMessage?: string }) => {
    state.audits.push({ org: scope.organizationId, toolName: input.toolName, success: input.success, errorMessage: input.errorMessage });
  },
}));

vi.mock("../../../../services/agents/toolRegistry", () => {
  const tool = (name: string, text: (org: string) => string) => ({
    name,
    handler: async (scope: { organizationId: string }, args: Record<string, unknown>) => {
      state.toolCalls.push({ tool: name, org: scope.organizationId, args });
      return { content: [{ type: "text", text: text(scope.organizationId) }] };
    },
  });
  const tools: Record<string, ReturnType<typeof tool>> = {
    log_agent_call: tool("log_agent_call", () => JSON.stringify({ jobId: CALL_JOB, status: "completed", taskId: "task-call" })),
    create_task: tool("create_task", () => JSON.stringify({ id: "task-msg" })),
  };
  return {
    getAgentTool: (name: string) => tools[name],
    validateAgentToolArguments: (_tool: unknown, args: Record<string, unknown>) => ({ ok: true, args }),
  };
});

import { POST } from "./route";

const post = (body: unknown, auth = `Bearer ${SECRET}`) =>
  POST(new Request("https://example.com/api/stack/results", { method: "POST", headers: auth ? { authorization: auth } : {}, body: JSON.stringify(body) }));

const callEvent = (extra: Record<string, unknown> = {}) => ({
  type: "call.completed.v1",
  data: { job_id: CALL_JOB, status: "completed", outcome: "interested", summary: "Wants a demo.", action_items: ["Send slots"], opted_out: false, ...extra },
});
const conversationEvent = (extra: Record<string, unknown> = {}) => ({
  type: "conversation.completed.v1",
  data: { job_id: MSG_JOB, channel: "whatsapp", summary: "Asked for pricing.", key_facts: { company: "Example Clinic" }, customer_phone: "+910000000000", receipt_sent: false, ...extra },
});

describe("POST /api/stack/results", () => {
  beforeEach(() => {
    process.env.STACK_RESULTS_SECRET = SECRET;
    state.owners.set(CALL_JOB, { organizationId: ORG_B, leadId: "lead-1", requestedBy: "user-b", status: "calling" });
    state.owners.set(MSG_JOB, { organizationId: ORG_B, leadId: "lead-2", requestedBy: "user-b", status: "running" });
    state.settings.set(ORG_B, { callismaticEnabled: true, omnidamusEnabled: true });
  });
  afterEach(() => {
    delete process.env.STACK_RESULTS_SECRET;
    state.owners.clear();
    state.settings.clear();
    state.closed.clear();
    state.completions = [];
    state.linked = [];
    state.audits = [];
    state.toolCalls = [];
  });

  it("refuses a missing, wrong, unset or short secret", async () => {
    expect((await post(callEvent(), "")).status).toBe(401);
    expect((await post(callEvent(), "Bearer wrong")).status).toBe(401);
    process.env.STACK_RESULTS_SECRET = "short";
    expect((await post(callEvent(), "Bearer short")).status).toBe(401);
    delete process.env.STACK_RESULTS_SECRET;
    expect((await post(callEvent())).status).toBe(401);
    expect(state.toolCalls).toEqual([]);
  });

  it("files a call result into the organization that started the job", async () => {
    const response = await post(callEvent());
    expect(response.status).toBe(200);
    expect(state.toolCalls).toEqual([expect.objectContaining({ tool: "log_agent_call", org: ORG_B })]);
    expect(state.toolCalls[0].args).toMatchObject({ jobId: CALL_JOB, status: "completed", outcome: "interested", actionItems: ["Send slots"], optedOut: false });
    expect(state.audits).toEqual([{ org: ORG_B, toolName: "log_agent_call", success: true, errorMessage: undefined }]);
  });

  it("ignores no part of the job's ownership: an event naming another organization is refused and audited in the owner's", async () => {
    const response = await post(callEvent({ organization_id: ORG_A }));
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({ error: "organization_mismatch" });
    expect(state.toolCalls).toEqual([]);
    expect(state.audits).toEqual([{ org: ORG_B, toolName: "log_agent_call", success: false, errorMessage: "organization_mismatch" }]);
  });

  it("accepts an event that names the owner's organization", async () => {
    expect((await post(callEvent({ organization_id: ORG_B }))).status).toBe(200);
    expect(state.toolCalls[0].org).toBe(ORG_B);
  });

  it("refuses a job that does not exist, without touching any organization", async () => {
    const response = await post(callEvent({ job_id: "33333333-3333-4333-8333-333333333333" }));
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "unknown_job" });
    expect(state.toolCalls).toEqual([]);
    expect(state.audits).toEqual([]);
  });

  it("refuses a result when the product is off for the owner's organization", async () => {
    state.settings.set(ORG_B, { callismaticEnabled: false, omnidamusEnabled: true });
    const response = await post(callEvent());
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({ error: "product_disabled" });
    expect(state.toolCalls).toEqual([]);

    state.settings.set(ORG_B, { callismaticEnabled: true, omnidamusEnabled: false });
    expect((await post(conversationEvent())).status).toBe(403);
    expect(state.completions).toEqual([]);
  });

  it("refuses an organization with no settings row: every product starts off", async () => {
    state.settings.clear();
    expect((await post(callEvent())).status).toBe(403);
    expect((await post(conversationEvent())).status).toBe(403);
  });

  it("files a conversation as one task in the owner's organization, without the customer's phone", async () => {
    const response = await post(conversationEvent());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ filed: true, product: "omnidamus", jobId: MSG_JOB, taskId: "task-msg" });
    expect(state.completions).toEqual([{ org: ORG_B, jobId: MSG_JOB }]);
    expect(state.linked).toEqual([{ org: ORG_B, jobId: MSG_JOB, taskId: "task-msg" }]);
    const task = state.toolCalls.find((c) => c.tool === "create_task");
    expect(task?.org).toBe(ORG_B);
    expect(String(task?.args.description)).toContain("company: Example Clinic");
    expect(JSON.stringify(task?.args)).not.toContain("+910000000000");
  });

  it("makes no second task when the same conversation is delivered again", async () => {
    await post(conversationEvent());
    const again = await post(conversationEvent());
    expect(again.status).toBe(200);
    expect(await again.json()).toMatchObject({ alreadyLogged: true });
    expect(state.toolCalls.filter((c) => c.tool === "create_task")).toHaveLength(1);
  });

  it("refuses unknown event types and malformed bodies", async () => {
    expect((await post({ type: "lead.created.v1", data: { job_id: CALL_JOB } })).status).toBe(400);
    expect((await post({ type: "call.completed.v1" })).status).toBe(400);
    expect((await post("nope")).status).toBe(400);
    expect(state.toolCalls).toEqual([]);
  });
});
