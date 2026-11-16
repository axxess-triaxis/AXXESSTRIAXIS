import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AgentScope } from "../../security/agentScope";

const LEAD = "11111111-2222-3333-4444-555555555555";
const CONNECTION = "99999999-8888-7777-6666-555555555555";
const state = {
  lead: null as null | { id: string; ownerUserId?: string; title: string },
  searches: [] as Array<{ org: string; term: string; owner?: string }>,
  upserts: [] as Array<{ org: string; owner?: string; input: Record<string, unknown> }>,
  conversations: [] as Array<{ org: string; connection: string | null; input: Record<string, unknown> }>,
  duplicate: false,
};

vi.mock("../../repositories/leadContextRepository", () => ({
  getContextLead: async (_org: string, id: string) => (state.lead && state.lead.id === id ? state.lead : null),
  loadLeadContext: async (_org: string, id: string) => (state.lead && state.lead.id === id
    ? { lead: state.lead, timeline: [{ kind: "conversation", at: "2026-11-16T09:00:00Z", summary: "Asked for a demo" }] } : null),
  searchContextLeads: async (org: string, term: string, owner?: string) => {
    state.searches.push({ org, term, owner });
    return state.lead ? [{ ...state.lead, stage: "new", status: "open", updatedAt: "2026-11-16T09:00:00Z" }] : [];
  },
  upsertAgentLead: async (org: string, owner: string | undefined, input: Record<string, unknown>) => {
    state.upserts.push({ org, owner, input });
    return { lead: { id: LEAD, stage: "new", status: "open" }, created: true, changed: [] };
  },
  recordConversation: async (org: string, connection: string | null, input: Record<string, unknown>) => {
    state.conversations.push({ org, connection, input });
    return { id: state.duplicate ? "c-old" : "c-new", duplicate: state.duplicate };
  },
}));

import { getAgentTool } from "./toolRegistry";

const stillScope: AgentScope = {
  organizationId: "org-1", agentConnectionId: CONNECTION, provider: "anthropic",
  capabilities: ["get_lead_context", "search_leads", "upsert_lead", "log_conversation"], issuedByUserId: "u-admin", issuedByRole: "Organization Admin",
};
const copilot = (role: string, userId = "u-emp"): AgentScope => ({
  organizationId: "org-1", agentConnectionId: `inapp:${userId}`, provider: "axxess_copilot_inapp",
  capabilities: ["get_lead_context", "search_leads"], issuedByUserId: userId, issuedByRole: role,
});
const call = (name: string, scope: AgentScope, args: Record<string, unknown>) => getAgentTool(name)!.handler(scope, args);
const body = (result: { content: Array<{ text: string }> }) => JSON.parse(result.content[0].text);

describe("lead context tools", () => {
  beforeEach(() => {
    state.lead = { id: LEAD, ownerUserId: "u-owner", title: "Acme - Asha" };
    state.searches.length = 0; state.upserts.length = 0; state.conversations.length = 0; state.duplicate = false;
  });

  it("are auto tools, each behind its own capability", () => {
    for (const name of ["get_lead_context", "search_leads", "upsert_lead", "log_conversation"]) {
      expect(getAgentTool(name)?.criticality).toBe("auto");
      expect(getAgentTool(name)?.requiredCapability).toBe(name);
    }
  });

  it("get_lead_context returns the lead and timeline, and refuses bad or unknown ids", async () => {
    expect(body(await call("get_lead_context", stillScope, { leadId: LEAD }))).toEqual(expect.objectContaining({ lead: expect.objectContaining({ id: LEAD }) }));
    expect((await call("get_lead_context", stillScope, { leadId: "l1" })).isError).toBe(true);
    state.lead = null;
    expect((await call("get_lead_context", stillScope, { leadId: LEAD })).isError).toBe(true);
  });

  it("the copilot shows an Employee only their own leads; a Manager sees every lead", async () => {
    expect((await call("get_lead_context", copilot("Employee"), { leadId: LEAD })).isError).toBe(true);
    expect((await call("get_lead_context", copilot("Employee", "u-owner"), { leadId: LEAD })).isError).toBeFalsy();
    expect((await call("get_lead_context", copilot("Manager"), { leadId: LEAD })).isError).toBeFalsy();

    await call("search_leads", copilot("Employee"), { query: "acme" });
    await call("search_leads", copilot("Manager"), { query: "acme" });
    await call("search_leads", stillScope, { query: "acme" });
    expect(state.searches).toEqual([
      { org: "org-1", term: "acme", owner: "u-emp" },
      { org: "org-1", term: "acme", owner: undefined },
      { org: "org-1", term: "acme", owner: undefined },
    ]);
  });

  it("search_leads needs at least 2 characters", async () => {
    expect((await call("search_leads", stillScope, { query: "a" })).isError).toBe(true);
    expect(state.searches).toEqual([]);
  });

  it("upsert_lead validates first, then creates under the key issuer as owner", async () => {
    expect((await call("upsert_lead", stillScope, { email: "asha@acme.in", source: "callismatic_inbound_call", stage: "won" })).isError).toBe(true);
    expect(state.upserts).toEqual([]);
    const result = body(await call("upsert_lead", stillScope, { phoneE164: "+971501234567", source: "callismatic_inbound_call", contactName: "Omar" }));
    expect(result).toEqual({ leadId: LEAD, created: true, changed: [], stage: "new", status: "open" });
    expect(state.upserts).toEqual([{ org: "org-1", owner: "u-admin", input: expect.objectContaining({ phoneE164: "+971501234567", source: "callismatic_inbound_call" }) }]);
  });

  it("log_conversation needs a lead in the organization and reports a repeat as a duplicate", async () => {
    const args = { leadId: LEAD, channel: "voice", direction: "inbound", source: "callismatic", externalId: "call-42", summary: "Wants pricing." };
    expect(body(await call("log_conversation", stillScope, args))).toEqual({ leadId: LEAD, conversationId: "c-new", duplicate: false });
    expect(state.conversations[0]).toEqual({ org: "org-1", connection: CONNECTION, input: expect.objectContaining({ externalId: "call-42" }) });
    state.duplicate = true;
    expect(body(await call("log_conversation", stillScope, args)).duplicate).toBe(true);
    state.lead = null;
    expect((await call("log_conversation", stillScope, args)).isError).toBe(true);
    expect((await call("log_conversation", stillScope, { ...args, channel: "fax" })).isError).toBe(true);
  });
});
