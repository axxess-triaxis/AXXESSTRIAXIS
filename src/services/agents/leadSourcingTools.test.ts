// Lead sourcing MCP tools with repositories mocked. Reserved domains and invented names only.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentScope } from "../../security/agentScope";

const RUN = "11111111-1111-4111-8111-111111111111";
const C1 = "22222222-2222-4222-8222-222222222222";
const C2 = "33333333-3333-4333-8333-333333333333";

const state = {
  exclusions: { companies: new Set<string>(), labels: new Set<string>() },
  known: { companies: [] as string[], domains: [] as string[] },
  used: 0,
  createdRuns: [] as Array<Record<string, unknown>>,
  candidates: [] as Array<Record<string, unknown>>,
  suppressed: new Set<string>(),
  inserted: [] as unknown[],
  marked: [] as unknown[],
  audits: [] as Array<Record<string, unknown>>,
};

vi.mock("../../repositories/leadSourcingRepository", () => ({
  loadExclusions: async () => state.exclusions,
  loadKnownLeadCompanies: async () => state.known,
  creditsSpentThisMonth: async () => state.used,
  createSourcingRun: async (_scope: unknown, input: Record<string, unknown>) => {
    state.createdRuns.push(input);
    return { id: RUN, status: "queued" };
  },
  getSourcingRun: async (_scope: unknown, id: string) =>
    id === RUN ? { run: { id: RUN, status: "done", seedCount: 2, verifyCap: 0, creditsSpent: 0, stats: {}, error: null }, candidates: state.candidates } : null,
  getCandidates: async (_scope: unknown, _run: string, ids: string[]) => state.candidates.filter((c) => ids.includes(c.id as string)),
  markCandidates: async (_scope: unknown, updates: unknown[]) => {
    state.marked.push(...updates);
  },
}));

vi.mock("../../repositories/outboundRepository", () => ({
  loadImportContext: async () => ({ suppressed: state.suppressed, existing: new Set<string>() }),
  insertImportedLeadsReturningIds: async (_scope: unknown, leads: Array<{ contactEmail?: string }>) => {
    state.inserted.push(...leads);
    return leads.map((l, i) => ({ id: `lead-${i + 1}`, contactEmail: l.contactEmail ?? null }));
  },
}));

vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  auditLogsRepository: { record: async (_scope: unknown, input: Record<string, unknown>) => state.audits.push(input) },
}));

import { approveSourcedLeadsTool, getSourcingRunTool, sourceLeadsTool } from "./leadSourcingTools";

const external: AgentScope = { organizationId: "org-1", agentConnectionId: "conn-1", provider: "anthropic", capabilities: ["source_leads", "get_sourcing_run", "approve_sourced_leads"], issuedByUserId: "user-1", issuedByRole: "Organization Admin" };
const body = (r: { content: { text: string }[] }) => JSON.parse(r.content[0].text);

const candidate = (id: string, company: string, email: string, status = "pending") => ({
  id, runId: RUN, company, domain: `${company.toLowerCase()}.example`, country: "AE", segment: "brokerage", contactName: "Amara Samplefield",
  role: "Founder", email, emailKind: "published-role", verified: null, score: 60, evidence: ["named on /team"], status, leadId: null,
});

describe("lead sourcing tools", () => {
  afterEach(() => {
    state.exclusions = { companies: new Set(), labels: new Set() };
    state.known = { companies: [], domains: [] };
    state.used = 0;
    state.createdRuns = [];
    state.candidates = [];
    state.suppressed = new Set();
    state.inserted = [];
    state.marked = [];
    state.audits = [];
  });

  it("source_leads queues only new, non-excluded seeds with a capped credit budget", async () => {
    state.exclusions = { companies: new Set(["friend"]), labels: new Set() };
    state.known = { companies: ["Old Lead"], domains: [] };
    state.used = 35;
    const result = await sourceLeadsTool.handler(external, {
      seeds: [
        { company: "Friend LLC", domain: "friend.example" },
        { company: "Old Lead", domain: "old.example" },
        { company: "Fresh", domain: "fresh.example" },
        { company: "Broken" },
      ],
      country: "AE",
      verify_cap: 20,
    });
    expect(result.isError).toBeUndefined();
    expect(body(result)).toMatchObject({ runId: RUN, queued: 1, excluded: 1, alreadyKnownOrDuplicate: 1, verifyCap: 5 });
    expect(body(result).invalid).toHaveLength(1);
    expect(state.createdRuns[0]).toMatchObject({ requestedByConnection: "conn-1", verifyCap: 5 });
    expect((state.createdRuns[0].seeds as Array<{ company: string }>).map((s) => s.company)).toEqual(["Fresh"]);
  });

  it("source_leads refuses when nothing is left to crawl", async () => {
    state.exclusions = { companies: new Set(["friend"]), labels: new Set() };
    const result = await sourceLeadsTool.handler(external, { seeds: [{ company: "Friend", domain: "friend.example", country: "IN" }] });
    expect(result.isError).toBe(true);
    expect(state.createdRuns).toHaveLength(0);
  });

  it("the in-app copilot is refused below senior roles", async () => {
    const employee: AgentScope = { ...external, provider: "axxess_copilot_inapp", issuedByRole: "Employee" };
    expect((await sourceLeadsTool.handler(employee, { seeds: [] })).isError).toBe(true);
    expect((await getSourcingRunTool.handler(employee, { run_id: RUN })).isError).toBe(true);
    expect((await approveSourcedLeadsTool.handler(employee, { run_id: RUN, candidate_ids: [C1] })).isError).toBe(true);
  });

  it("get_sourcing_run returns candidates with evidence and refuses unknown ids", async () => {
    state.candidates = [candidate(C1, "Alpha", "info@alpha.example")];
    const ok = body(await getSourcingRunTool.handler(external, { run_id: RUN }));
    expect(ok.candidates[0]).toMatchObject({ id: C1, company: "Alpha", evidence: ["named on /team"] });
    expect((await getSourcingRunTool.handler(external, { run_id: "nope" })).isError).toBe(true);
    expect((await getSourcingRunTool.handler(external, { run_id: "44444444-4444-4444-8444-444444444444" })).isError).toBe(true);
  });

  it("approve_sourced_leads imports through the importer's rules, marks candidates and audits", async () => {
    state.candidates = [candidate(C1, "Alpha", "info@alpha.example"), candidate(C2, "Beta", "info@beta.example")];
    state.suppressed = new Set(["info@beta.example"]);
    const result = body(await approveSourcedLeadsTool.handler(external, { run_id: RUN, candidate_ids: [C1, C2, C1] }));
    expect(result).toMatchObject({ imported: 1, leadIds: ["lead-1"] });
    expect(result.rejected).toHaveLength(1);
    expect(state.inserted).toHaveLength(1);
    expect(state.marked).toEqual([
      { id: C1, status: "imported", leadId: "lead-1" },
      { id: C2, status: "rejected" },
    ]);
    expect(state.audits[0]).toMatchObject({ action: "crm.leads.sourced_imported", metadata: { runId: RUN, imported: 1, rejected: 1 } });
  });

  it("approve_sourced_leads skips already-imported candidates and needs an issuing user", async () => {
    state.candidates = [candidate(C1, "Alpha", "info@alpha.example", "imported")];
    expect((await approveSourcedLeadsTool.handler(external, { run_id: RUN, candidate_ids: [C1] })).isError).toBe(true);
    state.candidates = [candidate(C1, "Alpha", "info@alpha.example")];
    const noUser = { ...external, issuedByUserId: undefined };
    expect((await approveSourcedLeadsTool.handler(noUser, { run_id: RUN, candidate_ids: [C1] })).isError).toBe(true);
    expect((await approveSourcedLeadsTool.handler(external, { run_id: RUN, candidate_ids: [] })).isError).toBe(true);
    expect(state.inserted).toHaveLength(0);
  });

  it("is critical and always needs a fresh approval", () => {
    expect(approveSourcedLeadsTool.criticality).toBe("critical");
    expect(approveSourcedLeadsTool.requiresFreshApproval).toBe(true);
    expect(sourceLeadsTool.criticality).toBe("auto");
  });
});
