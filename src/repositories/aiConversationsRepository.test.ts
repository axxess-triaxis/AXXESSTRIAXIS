import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  isConfigured: true,
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
  responses: [] as unknown[],
};

vi.mock("./supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.isConfigured,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    return state.responses.shift();
  },
}));

import { appendConversationMessage, createConversation, listConversationMessages } from "./aiConversationsRepository";

const scope = { organizationId: "org-1", userId: "user-1", role: "Manager" as const };

describe("aiConversationsRepository", () => {
  afterEach(() => {
    state.calls = [];
    state.responses = [];
    state.isConfigured = true;
    vi.clearAllMocks();
  });

  it("creates a conversation row scoped to the organization and returns its id", async () => {
    state.responses = [[{ id: "conv-1" }]];
    const id = await createConversation(scope, "What is the oxygen resilience status?");
    expect(id).toBe("conv-1");
    expect(state.calls[0].table).toBe("ai_conversations");
    expect(state.calls[0].options.method).toBe("POST");
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.organization_id).toBe("org-1");
    expect(body.conversation_type).toBe("rag");
  });

  it("truncates an overlong title to 120 characters rather than sending it unbounded", async () => {
    state.responses = [[{ id: "conv-1" }]];
    await createConversation(scope, "x".repeat(500));
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect((body.title as string).length).toBe(120);
  });

  it("returns undefined rather than throwing when Supabase admin isn't configured", async () => {
    state.isConfigured = false;
    const id = await createConversation(scope, "question");
    expect(id).toBeUndefined();
    expect(state.calls).toHaveLength(0);
  });

  it("lists a conversation's messages ordered oldest-first, mapped to the real record shape", async () => {
    state.responses = [[
      { id: "m1", conversation_id: "conv-1", role: "user", content: "Q1", ai_output_audit_id: null, citations: [], created_at: "2026-08-16T08:00:00.000Z" },
      { id: "m2", conversation_id: "conv-1", role: "assistant", content: "A1", ai_output_audit_id: "audit-1", citations: [{ sourceType: "document", sourceId: "d1", title: "Doc", score: 0.9, excerpt: "..." }], created_at: "2026-08-16T08:00:05.000Z" },
    ]];
    const messages = await listConversationMessages(scope, "conv-1");
    expect(messages).toEqual([
      { id: "m1", conversationId: "conv-1", role: "user", content: "Q1", aiOutputAuditId: undefined, citations: [], createdAt: "2026-08-16T08:00:00.000Z" },
      { id: "m2", conversationId: "conv-1", role: "assistant", content: "A1", aiOutputAuditId: "audit-1", citations: [{ sourceType: "document", sourceId: "d1", title: "Doc", score: 0.9, excerpt: "..." }], createdAt: "2026-08-16T08:00:05.000Z" },
    ]);
    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("conversation_id")).toBe("eq.conv-1");
    expect(query.get("order")).toBe("created_at.asc");
  });

  it("returns an empty list without calling supabaseAdminRest when conversationId is empty", async () => {
    const messages = await listConversationMessages(scope, "");
    expect(messages).toEqual([]);
    expect(state.calls).toHaveLength(0);
  });

  it("appends a message with citations and the linked ai_output_audit id", async () => {
    state.responses = [[]];
    await appendConversationMessage(scope, {
      conversationId: "conv-1",
      role: "assistant",
      content: "Answer text",
      aiOutputAuditId: "audit-1",
      citations: [{ sourceType: "document", sourceId: "d1", title: "Doc", score: 0.9, excerpt: "..." }],
    });
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body).toMatchObject({
      organization_id: "org-1",
      conversation_id: "conv-1",
      role: "assistant",
      content: "Answer text",
      ai_output_audit_id: "audit-1",
    });
  });

  it("never throws when appending fails -- caller degrades honestly rather than crashing the turn", async () => {
    state.responses = [Promise.reject(new Error("network down"))];
    await expect(appendConversationMessage(scope, { conversationId: "conv-1", role: "user", content: "q" })).resolves.toBeUndefined();
  });
});
