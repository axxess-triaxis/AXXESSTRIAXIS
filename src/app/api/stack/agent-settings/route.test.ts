import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_AGENT_SETTINGS, type AgentSettings, type AgentSettingsPatch } from "../../../../services/stack/agentSettings";

// Agent settings routes (customer-fireable stack, PR 5, 2026-11-20): an organization's admins change
// their switches and wording; only Triaxis's own Super Admin links numbers and records registrations.
type Session = { accessToken: string; user: { id: string; organizationId: string; role: string } };
const TRIAXIS = "aaaaaaaa-0000-4000-8000-000000000001";
const CUSTOMER = "bbbbbbbb-0000-4000-8000-000000000002";
const state = { session: null as Session | null, claimed: null as string | null };
const saved: Array<{ organizationId: string; patch: AgentSettingsPatch }> = [];
const audits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
const denied: unknown[] = [];

vi.mock("../../../../auth/serverSession", () => ({ getServerAuthSession: async () => state.session }));
vi.mock("../../../../services/audit/auditEvents", () => ({
  recordDeniedAttempt: async (_s: unknown, a: unknown) => { denied.push(a); },
  recordAuditBestEffort: async (_s: unknown, input: { action: string; metadata?: Record<string, unknown> }) => { audits.push(input); },
}));
vi.mock("../../../../repositories/orgAgentSettingsRepository", async (original) => {
  const actual = await original<typeof import("../../../../repositories/orgAgentSettingsRepository")>();
  return {
    NumberClaimedError: actual.NumberClaimedError,
    loadAgentSettings: async (): Promise<AgentSettings> => ({ ...DEFAULT_AGENT_SETTINGS }),
    saveAgentSettings: async (organizationId: string, patch: AgentSettingsPatch): Promise<AgentSettings> => {
      if (state.claimed && state.claimed in patch) throw new actual.NumberClaimedError(state.claimed);
      saved.push({ organizationId, patch });
      return { ...DEFAULT_AGENT_SETTINGS, ...patch };
    },
    listOrganizations: async () => [{ id: CUSTOMER, name: "Sharma Realty" }],
  };
});

import { GET, PATCH } from "./route";
import { GET as operatorGet, PATCH as operatorPatch } from "./[organizationId]/route";
import { GET as listOrgs } from "../organizations/route";

const as = (role: string, organizationId = CUSTOMER) => { state.session = { accessToken: "t", user: { id: "u1", organizationId, role } }; };
const patch = (body: unknown) => new Request("http://localhost/api/stack/agent-settings", { method: "PATCH", body: JSON.stringify(body) });
const forOrg = (organizationId: string) => ({ params: Promise.resolve({ organizationId }) });

describe("agent settings routes", () => {
  beforeEach(() => vi.stubEnv("AXXESS_PLATFORM_OPERATOR_ORGANIZATION_ID", TRIAXIS));
  afterEach(() => {
    vi.unstubAllEnvs();
    saved.length = 0; audits.length = 0; denied.length = 0;
    state.claimed = null;
  });

  it("an organization admin reads its settings with what each agent still needs", async () => {
    as("Organization Admin");
    const body = await (await GET()).json();
    expect(body.organizationId).toBe(CUSTOMER);
    expect(body.operator).toBe(false);
    expect(body.readiness.call).toEqual(["callismatic_off", "caller_id_missing", "call_purpose_missing"]);
  });

  it("an organization admin turns an agent on and writes its call purpose, audited", async () => {
    as("Organization Admin");
    const res = await PATCH(patch({ callismaticEnabled: true, callPurpose: "Ask about the viewing." }));
    expect(res.status).toBe(200);
    expect(saved).toEqual([{ organizationId: CUSTOMER, patch: { callismaticEnabled: true, callPurpose: "Ask about the viewing." } }]);
    expect(audits).toEqual([expect.objectContaining({ action: "stack.agent_settings_updated", metadata: expect.objectContaining({ fields: ["callismaticEnabled", "callPurpose"] }) })]);
  });

  it("an organization admin cannot set its own caller ID or registrations, and the attempt is audited", async () => {
    as("Super Admin");
    for (const body of [{ callerIdE164: "+919800000001" }, { dltIndiaRegistered: true }]) {
      const res = await PATCH(patch(body));
      expect(res.status).toBe(403);
    }
    expect(saved).toEqual([]);
    expect(audits.map((a) => a.action)).toEqual(["access.denied", "access.denied"]);
  });

  it("staff below admin and signed-out callers are refused", async () => {
    as("Manager");
    expect((await GET()).status).toBe(403);
    expect((await PATCH(patch({ callismaticEnabled: true }))).status).toBe(403);
    expect(denied).toHaveLength(1);
    state.session = null;
    expect((await GET()).status).toBe(401);
  });

  it("only Triaxis's own Super Admin may use the operator routes", async () => {
    for (const [role, org] of [["Super Admin", CUSTOMER], ["Organization Admin", TRIAXIS]] as const) {
      as(role, org);
      expect((await operatorGet(new Request("http://localhost"), forOrg(CUSTOMER))).status).toBe(403);
      expect((await operatorPatch(patch({ dltIndiaRegistered: true }), forOrg(CUSTOMER))).status).toBe(403);
      expect((await listOrgs()).status).toBe(403);
    }
    expect(saved).toEqual([]);
  });

  it("fails closed when the operator organization is not configured", async () => {
    vi.stubEnv("AXXESS_PLATFORM_OPERATOR_ORGANIZATION_ID", "");
    as("Super Admin", TRIAXIS);
    expect((await operatorPatch(patch({ dltIndiaRegistered: true }), forOrg(CUSTOMER))).status).toBe(403);
  });

  it("Triaxis links a customer's numbers and records its registrations", async () => {
    as("Super Admin", TRIAXIS);
    const res = await operatorPatch(patch({ callerIdE164: "+919800000001", dltIndiaRegistered: true }), forOrg(CUSTOMER));
    expect(res.status).toBe(200);
    expect(saved).toEqual([{ organizationId: CUSTOMER, patch: { callerIdE164: "+919800000001", dltIndiaRegistered: true } }]);
    expect(audits[0].metadata).toEqual(expect.objectContaining({ organizationId: CUSTOMER, byPlatformOperator: true }));
    expect((await (await listOrgs()).json()).organizations).toEqual([{ id: CUSTOMER, name: "Sharma Realty" }]);
  });

  it("a number another organization holds is refused with 409", async () => {
    as("Super Admin", TRIAXIS);
    state.claimed = "callerIdE164";
    const res = await operatorPatch(patch({ callerIdE164: "+919800000001" }), forOrg(CUSTOMER));
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "number_claimed", field: "callerIdE164" });
  });

  it("rejects a malformed organization id and invalid values", async () => {
    as("Super Admin", TRIAXIS);
    expect((await operatorGet(new Request("http://localhost"), forOrg("not-a-uuid"))).status).toBe(404);
    expect((await operatorPatch(patch({ callerIdE164: "98000" }), forOrg(CUSTOMER))).status).toBe(400);
  });
});
