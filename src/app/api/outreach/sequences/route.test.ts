import { afterEach, describe, expect, it, vi } from "vitest";

const state = { session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string } };
const calls = { create: [] as unknown[], approve: [] as unknown[], enroll: [] as unknown[], denied: [] as unknown[], audits: [] as Array<{ action: string }> };
let approveResult = true;
let enrollResult = { sequenceFound: true, enrolled: 1, skipped: [{ leadId: "l2", reason: "no_email" }] };

vi.mock("../../../../auth/serverSession", () => ({ getServerAuthSession: async () => state.session }));
vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (u: { id: string; organizationId: string; role: string }) => ({ userId: u.id, organizationId: u.organizationId, role: u.role }),
  auditLogsRepository: { record: async (_s: unknown, e: { action: string }) => { calls.audits.push(e); } },
}));
vi.mock("../../../../services/audit/auditEvents", () => ({ recordDeniedAttempt: async (_s: unknown, a: unknown) => { calls.denied.push(a); } }));
vi.mock("../../../../repositories/outboundRepository", () => ({
  createSequence: async (scope: { organizationId: string }, def: unknown) => { calls.create.push({ org: scope.organizationId, def }); return "seq-1"; },
  approveSequence: async (_scope: unknown, id: string) => { calls.approve.push(id); return approveResult; },
  enrollLeads: async (_scope: unknown, id: string, leadIds: string[]) => { calls.enroll.push({ id, leadIds }); return enrollResult; },
}));

import { POST as create } from "./route";
import { POST as act } from "./[id]/route";

const as = (role: string) => { state.session = { user: { id: "u1", organizationId: "org-1", role }, accessToken: "t" }; };
const req = (body: unknown) => new Request("http://localhost/api/outreach/sequences", { method: "POST", body: JSON.stringify(body) });
const params = (id: string) => ({ params: Promise.resolve({ id }) });
const valid = { name: "Founders IN", steps: [{ dayOffset: 0, subject: "Hi {{first_name}}", body: "Hello {{company}}" }] };

describe("outreach sequence routes", () => {
  afterEach(() => {
    state.session = null;
    for (const list of Object.values(calls)) list.length = 0;
    approveResult = true;
    enrollResult = { sequenceFound: true, enrolled: 1, skipped: [{ leadId: "l2", reason: "no_email" }] };
  });

  it("require a session and a senior role", async () => {
    expect((await create(req(valid))).status).toBe(401);
    as("Employee");
    expect((await create(req(valid))).status).toBe(403);
    expect((await act(req({ action: "approve" }), params("seq-1"))).status).toBe(403);
    expect(calls.denied).toHaveLength(2);
    expect(calls.create).toEqual([]);
  });

  it("creates a draft sequence from a valid definition", async () => {
    as("Organization Admin");
    const response = await create(req(valid));
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({ id: "seq-1", status: "draft" });
    expect(calls.create).toEqual([{ org: "org-1", def: valid }]);
    expect(calls.audits.map((a) => a.action)).toEqual(["outreach.sequence.created"]);
  });

  it("rejects an invalid definition with the reason", async () => {
    as("Organization Admin");
    const response = await create(req({ name: "A", steps: [{ dayOffset: 0, subject: "{{revenue}}", body: "x" }] }));
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Step 1 uses an unknown merge field: revenue." });
  });

  it("approves a draft, and returns 404 when there is no draft with that id", async () => {
    as("Super Admin");
    expect((await act(req({ action: "approve" }), params("seq-1"))).status).toBe(200);
    approveResult = false;
    expect((await act(req({ action: "approve" }), params("seq-x"))).status).toBe(404);
    expect(calls.approve).toEqual(["seq-1", "seq-x"]);
  });

  it("enrolls leads and reports skipped ones", async () => {
    as("Organization Admin");
    const response = await act(req({ action: "enroll", leadIds: ["l1", "l2"] }), params("seq-1"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ enrolled: 1, skipped: [{ leadId: "l2", reason: "no_email" }] });
    expect(calls.enroll).toEqual([{ id: "seq-1", leadIds: ["l1", "l2"] }]);
  });

  it("refuses enrollment into a sequence that is not approved, and bad lead lists", async () => {
    as("Organization Admin");
    enrollResult = { sequenceFound: false, enrolled: 0, skipped: [] };
    expect((await act(req({ action: "enroll", leadIds: ["l1"] }), params("seq-1"))).status).toBe(404);
    expect((await act(req({ action: "enroll", leadIds: [] }), params("seq-1"))).status).toBe(400);
    expect((await act(req({ action: "enroll", leadIds: Array.from({ length: 501 }, (_, i) => `l${i}`) }), params("seq-1"))).status).toBe(400);
    expect((await act(req({ action: "nope" }), params("seq-1"))).status).toBe(400);
  });
});
