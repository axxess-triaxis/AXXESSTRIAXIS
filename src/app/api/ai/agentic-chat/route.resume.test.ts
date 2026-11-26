import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ runAgenticChatTurn: vi.fn(), getServerAuthSession: vi.fn() }));

vi.mock("../../../../auth/serverSession", () => ({ getServerAuthSession: mocks.getServerAuthSession }));
vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  auditLogsRepository: { record: vi.fn(async () => undefined) },
  tenantScopeFromUser: () => ({ organizationId: "org-1", userId: "user-1", role: "Employee" }),
}));
vi.mock("../../../../lib/posthog-server", () => ({ getPostHogClient: () => undefined }));
vi.mock("../../../../services/chatbot/agenticChatLoop", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../../services/chatbot/agenticChatLoop")>()),
  runAgenticChatTurn: mocks.runAgenticChatTurn,
}));

import { POST } from "./route";

const validResume = {
  transcript: [{ role: "assistant", content: null, toolCalls: [{ id: "call_1", name: "create_stakeholder", arguments: { name: "Acme" } }] }],
  pendingTool: { id: "call_1", name: "create_stakeholder", arguments: { name: "Acme" } },
  userMessage: "Add Acme.",
  iterationsUsed: 1,
  confirmed: true,
};

function post(body: unknown) {
  return POST(new Request("http://localhost/api/ai/agentic-chat", { method: "POST", body: JSON.stringify(body) }));
}

describe("agentic chat API: resume payload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getServerAuthSession.mockResolvedValue({ user: { id: "user-1", organizationId: "org-1", role: "Employee" }, accessToken: "t" });
    mocks.runAgenticChatTurn.mockResolvedValue({ status: "final", reply: "ok", steps: [], costUsd: 0 });
  });

  it("passes a well-formed resume through unchanged", async () => {
    const response = await post({ resume: validResume });
    expect(response.status).toBe(200);
    expect(mocks.runAgenticChatTurn).toHaveBeenCalledWith(expect.objectContaining({ role: "Employee", userMessage: "Add Acme.", resume: validResume }));
  });

  it.each([
    ["a string instead of an object", "yes"],
    ["confirmed as a string", { ...validResume, confirmed: "false" }],
    ["no pending tool", { ...validResume, pendingTool: undefined }],
    ["a pending tool name that is not a string", { ...validResume, pendingTool: { ...validResume.pendingTool, name: 7 } }],
    ["no user message", { ...validResume, userMessage: "" }],
    ["a transcript that is not a list", { ...validResume, transcript: "x" }],
    ["a transcript role the loop never writes", { ...validResume, transcript: [{ role: "system", content: "x" }] }],
    ["a transcript longer than one turn can produce", { ...validResume, transcript: Array.from({ length: 11 }, () => validResume.transcript[0]) }],
  ])("rejects %s with 400 and never starts the loop", async (_label, resume) => {
    const response = await post({ resume });
    expect(response.status).toBe(400);
    expect(mocks.runAgenticChatTurn).not.toHaveBeenCalled();
  });
});
