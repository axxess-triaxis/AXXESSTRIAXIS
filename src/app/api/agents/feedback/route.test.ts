import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
  createCalls: [] as Array<Record<string, unknown>>,
  listCallsByOrg: {} as Record<string, unknown[]>,
  listCalls: [] as Array<{ organizationId: string; options: Record<string, unknown> }>,
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../../services/agents/agentActionFeedbackRepository", () => ({
  createAgentActionFeedback: async (input: Record<string, unknown>) => {
    state.createCalls.push(input);
    return { id: "feedback-1", ...input };
  },
  listAgentActionFeedback: async (organizationId: string, options: Record<string, unknown>) => {
    state.listCalls.push({ organizationId, options });
    return state.listCallsByOrg[organizationId] ?? [];
  },
}));

import { GET, POST } from "./route";

function user(role: string, organizationId = "org-1") {
  return { id: "user-1", organizationId, role };
}

function postRequest(body: Record<string, unknown>) {
  return new Request("https://example.com/api/agents/feedback", { method: "POST", body: JSON.stringify(body) });
}

describe("POST /api/agents/feedback", () => {
  afterEach(() => {
    state.session = null;
    state.createCalls = [];
    state.listCallsByOrg = {};
    state.listCalls = [];
    vi.clearAllMocks();
  });

  it("requires an authenticated admin session", async () => {
    expect((await POST(postRequest({ auditLogId: "a", toolName: "t", provider: "p", rating: 5 }))).status).toBe(401);

    state.session = { user: user("Manager") };
    expect((await POST(postRequest({ auditLogId: "a", toolName: "t", provider: "p", rating: 5 }))).status).toBe(403);
  });

  it("rejects a submission with neither a rating nor a flag", async () => {
    state.session = { user: user("Organization Admin") };
    const response = await POST(postRequest({ auditLogId: "audit-1", toolName: "create_task", provider: "openai" }));
    expect(response.status).toBe(400);
    expect(state.createCalls).toHaveLength(0);
  });

  it("rejects a flag with no reason", async () => {
    state.session = { user: user("Organization Admin") };
    const response = await POST(postRequest({ auditLogId: "audit-1", toolName: "create_task", provider: "openai", flagged: true }));
    expect(response.status).toBe(400);
    expect(state.createCalls).toHaveLength(0);
  });

  it("rejects an out-of-range rating", async () => {
    state.session = { user: user("Organization Admin") };
    const response = await POST(postRequest({ auditLogId: "audit-1", toolName: "create_task", provider: "openai", rating: 9 }));
    expect(response.status).toBe(400);
  });

  it("MCP3-3: accepts a rating, scoping the submission to the caller's own organization and user id", async () => {
    state.session = { user: user("Organization Admin", "org-7") };
    const response = await POST(postRequest({ auditLogId: "audit-1", toolName: "create_task", provider: "openai", rating: 4 }));

    expect(response.status).toBe(201);
    expect(state.createCalls[0]).toMatchObject({ organizationId: "org-7", auditLogId: "audit-1", rating: 4, submittedByUserId: "user-1" });
  });

  it("MCP3-3: accepts a flag with a reason", async () => {
    state.session = { user: user("Organization Admin", "org-7") };
    const response = await POST(postRequest({ auditLogId: "audit-1", toolName: "create_task", provider: "openai", flagged: true, flagReason: "Created the wrong task." }));

    expect(response.status).toBe(201);
    expect(state.createCalls[0]).toMatchObject({ flagged: true, flagReason: "Created the wrong task." });
  });
});

describe("GET /api/agents/feedback", () => {
  afterEach(() => {
    state.session = null;
    state.createCalls = [];
    state.listCallsByOrg = {};
    state.listCalls = [];
    vi.clearAllMocks();
  });

  it("requires an authenticated admin session", async () => {
    const response = await GET(new Request("https://example.com/api/agents/feedback"));
    expect(response.status).toBe(401);

    state.session = { user: user("Manager") };
    const managerResponse = await GET(new Request("https://example.com/api/agents/feedback"));
    expect(managerResponse.status).toBe(403);
  });

  it("MCP3-3: lists feedback scoped to the caller's own organization only", async () => {
    state.session = { user: user("Organization Admin", "org-7") };
    state.listCallsByOrg = {
      "org-7": [{ id: "fb-1", organizationId: "org-7" }],
      "org-8": [{ id: "fb-2", organizationId: "org-8" }],
    };

    const response = await GET(new Request("https://example.com/api/agents/feedback"));
    const body = await response.json() as { feedback: Array<{ id: string }> };

    expect(response.status).toBe(200);
    expect(body.feedback).toEqual([{ id: "fb-1", organizationId: "org-7" }]);
    expect(state.listCalls[0].organizationId).toBe("org-7");
  });

  it("passes flaggedOnly=true through to the repository when requested", async () => {
    state.session = { user: user("Organization Admin", "org-7") };
    await GET(new Request("https://example.com/api/agents/feedback?flaggedOnly=true"));
    expect(state.listCalls[0].options).toEqual({ flaggedOnly: true });
  });
});
