import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
  suppressed: new Set<string>(),
  existing: new Set<string>(),
};
const inserted: Array<{ organizationId: string; userId: string; count: number; emails: (string | undefined)[] }> = [];
const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
const denied: Array<{ route: string; method: string }> = [];

vi.mock("../../../../../auth/serverSession", () => ({ getServerAuthSession: async () => state.session }));
vi.mock("../../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (u: { id: string; organizationId: string; role: string }) => ({ userId: u.id, organizationId: u.organizationId, role: u.role }),
  auditLogsRepository: { record: async (_s: unknown, entry: { action: string; metadata?: Record<string, unknown> }) => { audits.push(entry); } },
}));
vi.mock("../../../../../services/audit/auditEvents", () => ({
  recordDeniedAttempt: async (_s: unknown, attempt: { route: string; method: string }) => { denied.push(attempt); },
}));
vi.mock("../../../../../repositories/outboundRepository", () => ({
  loadImportContext: async () => ({ suppressed: state.suppressed, existing: state.existing }),
  insertImportedLeads: async (scope: { organizationId: string; userId: string }, leads: Array<{ contactEmail?: string }>) => {
    inserted.push({ organizationId: scope.organizationId, userId: scope.userId, count: leads.length, emails: leads.map((l) => l.contactEmail) });
    return leads.length;
  },
}));

import { POST } from "./route";

const HEADER = "company,contact_name,email,phone,country,consent_basis,source";
const request = (body: unknown) => new Request("http://localhost/api/crm/leads/import", { method: "POST", body: JSON.stringify(body) });
const as = (role: string) => { state.session = { user: { id: "u1", organizationId: "org-1", role }, accessToken: "t" }; };

describe("POST /api/crm/leads/import", () => {
  afterEach(() => {
    state.session = null;
    state.suppressed = new Set();
    state.existing = new Set();
    inserted.length = 0;
    audits.length = 0;
    denied.length = 0;
  });

  it("returns 401 without a session", async () => {
    expect((await POST(request({ csv: HEADER }))).status).toBe(401);
  });

  it("refuses an Employee and logs the denied attempt", async () => {
    as("Employee");
    const response = await POST(request({ csv: HEADER }));
    expect(response.status).toBe(403);
    expect(denied).toEqual([{ route: "/api/crm/leads/import", method: "POST" }]);
    expect(inserted).toEqual([]);
  });

  it("returns 400 for a file without the required columns", async () => {
    as("Organization Admin");
    const response = await POST(request({ csv: "company,email\nA,a@a.in" }));
    expect(response.status).toBe(400);
    expect(inserted).toEqual([]);
  });

  it("imports valid rows into the caller's organization and reports rejected lines", async () => {
    as("Organization Admin");
    state.suppressed = new Set(["stop@a.in"]);
    const csv = [HEADER, "A,Ann,stop@a.in,,IN,opt_in,List", "B,Ben,ben@b.in,,AE,b2b_legitimate_interest,List", "C,Cy,cy@c.in,,IN,,List"].join("\n");
    const response = await POST(request({ csv }));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      imported: 1,
      rejected: [{ line: 2, reason: "suppressed" }, { line: 4, reason: "invalid_consent_basis" }],
    });
    expect(inserted).toEqual([{ organizationId: "org-1", userId: "u1", count: 1, emails: ["ben@b.in"] }]);
    expect(audits).toEqual([{
      action: "crm.leads.imported",
      resourceType: "crm_lead",
      category: "crm",
      metadata: { imported: 1, rejected: 2 },
    }]);
  });
});
