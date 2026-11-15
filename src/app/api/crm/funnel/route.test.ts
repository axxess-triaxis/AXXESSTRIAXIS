import { afterEach, describe, expect, it, vi } from "vitest";

type Session = { user: { id: string; organizationId: string; role: string } };
const state = { session: null as Session | null, denied: [] as unknown[], funnelArgs: [] as unknown[] };
let health = { sentPerDay: [20, 20, 20, 20, 0, 0, 0], bounces7d: 1, complaints7d: 0 };

vi.mock("../../../../auth/serverSession", () => ({ getServerAuthSession: async () => state.session }));
vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (u: Session["user"]) => ({ userId: u.id, organizationId: u.organizationId, role: u.role }),
}));
vi.mock("../../../../services/audit/auditEvents", () => ({ recordDeniedAttempt: async (_s: unknown, a: unknown) => { state.denied.push(a); } }));
vi.mock("../../../../repositories/funnelRepository", () => ({
  loadFunnel: async (_scope: unknown, days: number) => {
    state.funnelArgs.push(days);
    return { window: { days, since: "x" }, activity: { emailsSent: 80 }, pipelineNow: { open: 3, byStage: {}, won: 0, lost: 0 }, sources: {}, notTracked: ["meetings", "trials", "paid"] };
  },
}));
vi.mock("../../../../repositories/outboundRepository", () => ({ loadSendHealth: async () => health }));

import { GET } from "./route";

const as = (role: string) => { state.session = { user: { id: "u1", organizationId: "org-1", role } }; };
const get = (query = "") => GET(new Request(`http://localhost/api/crm/funnel${query}`));

describe("GET /api/crm/funnel", () => {
  afterEach(() => {
    state.session = null; state.denied.length = 0; state.funnelArgs.length = 0;
    health = { sentPerDay: [20, 20, 20, 20, 0, 0, 0], bounces7d: 1, complaints7d: 0 };
    delete process.env.OUTREACH_DAILY_SEND_BUDGET; delete process.env.OUTREACH_SENDING_ENABLED;
  });

  it("requires a session and refuses an Employee", async () => {
    expect((await get()).status).toBe(401);
    as("Employee");
    expect((await get()).status).toBe(403);
    expect(state.denied).toHaveLength(1);
  });

  it("gives a Manager the funnel, what is not tracked, and the ramp the sender will use", async () => {
    as("Manager");
    process.env.OUTREACH_DAILY_SEND_BUDGET = "100";
    process.env.OUTREACH_SENDING_ENABLED = "true";
    const body = await (await get("?days=7")).json();
    expect(state.funnelArgs).toEqual([7]);
    expect(body.notTracked).toEqual(["meetings", "trials", "paid"]);
    expect(body.ramp).toMatchObject({ budget: 30, reason: "ramping", sendingEnabled: true, sent7d: 80, bounceRate7d: 1 / 80, complaintRate7d: 0 });
  });

  it("clamps the window and reports a pause", async () => {
    as("Executive");
    health = { sentPerDay: [20, 20, 20, 20, 20, 0, 0], bounces7d: 2, complaints7d: 0 };
    const body = await (await get("?days=9999")).json();
    expect(state.funnelArgs).toEqual([365]);
    expect(body.ramp).toMatchObject({ budget: 0, reason: "paused_bounce_rate", sendingEnabled: false });
  });
});
