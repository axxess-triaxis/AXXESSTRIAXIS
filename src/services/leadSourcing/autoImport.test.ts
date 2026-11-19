// Automatic import of discovery runs, with the repositories mocked. Reserved domains, invented names.
import { afterEach, describe, expect, it, vi } from "vitest";
import type { SourcedCandidate, SourcingRun } from "../../repositories/leadSourcingRepository";

const state = {
  candidates: [] as SourcedCandidate[],
  csv: "",
  marked: [] as Array<{ id: string; status: string; leadId?: string; automatic?: boolean }>,
  stats: [] as Array<Record<string, unknown>>,
  audits: [] as Array<{ action: string; metadata: Record<string, unknown> }>,
  owner: "" as string,
  insertFails: false,
  suppressed: new Set<string>(),
};

vi.mock("../../repositories/leadSourcingRepository", () => ({
  getSourcingRun: async (_scope: unknown, id: string) => ({ run: { ...run(), id }, candidates: state.candidates }),
  markCandidates: async (_scope: unknown, updates: typeof state.marked) => {
    state.marked.push(...updates);
  },
  mergeRunStats: async (_run: unknown, extra: Record<string, unknown>) => {
    state.stats.push(extra);
  },
}));
vi.mock("../../repositories/outboundRepository", () => ({
  loadImportContext: async () => ({ suppressed: state.suppressed, existing: new Set<string>() }),
  insertImportedLeadsReturningIds: async (scope: { userId: string }, leads: Array<{ contactEmail?: string }>) => {
    if (state.insertFails) throw new Error("database unavailable");
    state.owner = scope.userId;
    return leads.map((l, i) => ({ id: `lead-${i + 1}`, contactEmail: l.contactEmail ?? null }));
  },
}));
vi.mock("../../repositories/supabaseEnterpriseRepositories", () => ({
  auditLogsRepository: {
    record: async (_scope: unknown, entry: { action: string; metadata: Record<string, unknown> }) => {
      state.audits.push(entry);
    },
  },
}));
vi.mock("../outbound/leadImport", () => ({
  // Accept rows whose email is not suppressed; keep the CSV for the source-label check.
  parseLeadImport: (csv: string, ctx: { suppressed: Set<string> }) => {
    state.csv = csv;
    const rows = csv.trim().split("\n").slice(1).map((line) => line.split(","));
    return {
      accepted: rows.filter((r) => !ctx.suppressed.has(r[2])).map((r) => ({ organizationName: r[0], contactName: r[1], contactEmail: r[2] })),
      rejected: rows.filter((r) => ctx.suppressed.has(r[2])).map((_r, i) => ({ line: i + 2, reason: "suppressed" })),
    };
  },
}));

import { autoImportRun } from "./autoImport";

function run(over: Partial<SourcingRun> = {}): SourcingRun {
  return {
    id: "run-1", organizationId: "org-1", status: "done", segment: "brokerage", country: "AE", seeds: [], seedCount: 2, verifyCap: 0,
    creditsSpent: 0, stats: { Candidates: 2 }, error: null, createdAt: "", finishedAt: null, seedSource: "discovery", requestedByUser: "user-7",
    scheduleId: "sched-1", ...over,
  };
}

const candidate = (id: string, email: string, status: SourcedCandidate["status"] = "pending"): SourcedCandidate => ({
  id, runId: "run-1", company: `Co ${id}`, domain: email.split("@")[1], country: "AE", segment: "brokerage", contactName: "Amara Samplefield",
  role: "Founder", email, emailKind: "published-role", verified: null, score: 1, evidence: [], status, leadId: null,
});

describe("autoImportRun", () => {
  afterEach(() => {
    Object.assign(state, { candidates: [], csv: "", marked: [], stats: [], audits: [], owner: "", insertFails: false, suppressed: new Set<string>() });
  });

  it("imports every pending candidate of a discovery run as the schedule owner, marked automatic, with no enrolment", async () => {
    state.candidates = [candidate("c1", "info@alpha.example"), candidate("c2", "hello@beta.example"), candidate("c3", "x@gamma.example", "imported")];
    state.suppressed = new Set(["hello@beta.example"]);
    const result = await autoImportRun(run());
    expect(result).toEqual({ attempted: true, imported: 1, skipped: 1 });
    expect(state.owner).toBe("user-7");
    expect(state.marked).toEqual([
      { id: "c1", status: "imported", leadId: "lead-1", automatic: true },
      { id: "c2", status: "rejected" },
    ]);
    expect(state.csv).toContain("auto-imported");
    expect(state.csv).not.toContain("approved");
    expect(state.stats.at(-1)).toEqual({ "Leads imported automatically": 1, "Not imported (import rules)": 1 });
    expect(state.audits).toEqual([expect.objectContaining({ action: "lead_sourcing.auto_imported", metadata: expect.objectContaining({ imported: 1, enrolled: 0 }) })]);
  });

  it("leaves agent runs for a person to approve", async () => {
    state.candidates = [candidate("c1", "info@alpha.example")];
    expect(await autoImportRun(run({ seedSource: "agent" }))).toEqual({ attempted: false, imported: 0, skipped: 0 });
    expect(state.marked).toEqual([]);
    expect(state.audits).toEqual([]);
  });

  it("does not import without an owner, and keeps candidates pending when the import fails", async () => {
    state.candidates = [candidate("c1", "info@alpha.example")];
    expect((await autoImportRun(run({ requestedByUser: null }))).reason).toContain("no owner");
    expect(state.marked).toEqual([]);
    state.insertFails = true;
    const failed = await autoImportRun(run());
    expect(failed.reason).toContain("database unavailable");
    expect(state.marked).toEqual([]);
    expect(state.stats.at(-1)?.["Auto-import"]).toContain("not imported");
  });
});
