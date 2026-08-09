import { describe, expect, it, vi } from "vitest";

// A-110: GET /api/dashboard/snapshot-periods -- mirrors this repo's other dashboard/*-signals
// route tests in shape: mock getServerAuthSession + the underlying service, exercise the route
// handler directly (no real HTTP server needed for a Next.js route module).
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string } },
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

const buildSnapshotPeriodCalls: Array<{ organizationId: string; period: string }> = [];
const earliestTenantActivityDateCalls: string[] = [];

vi.mock("../../../../services/dashboard/dashboardSnapshotPeriods", () => ({
  buildSnapshotPeriod: async (organizationId: string, period: string) => {
    buildSnapshotPeriodCalls.push({ organizationId, period });
    return {
      period,
      window: { start: "2026-08-08T00:00:00.000Z", end: "2026-08-09T00:00:00.000Z", previousStart: "2026-08-07T00:00:00.000Z", previousEnd: "2026-08-08T00:00:00.000Z" },
      current: { tasksCreated: 1, tasksCompleted: 0, meetingsHeld: 0, aiReviewsCreated: 0, aiReviewsDecided: 0, aiReviewsEscalated: 0, documentsAdded: 0, auditEvents: 0, workflowEvents: 0 },
      previous: { tasksCreated: 0, tasksCompleted: 0, meetingsHeld: 0, aiReviewsCreated: 0, aiReviewsDecided: 0, aiReviewsEscalated: 0, documentsAdded: 0, auditEvents: 0, workflowEvents: 0 },
    };
  },
  earliestTenantActivityDate: async (organizationId: string) => {
    earliestTenantActivityDateCalls.push(organizationId);
    return "2026-07-02T00:00:00.000Z";
  },
}));

import { GET } from "./route";

function request(url: string) {
  return new Request(url);
}

describe("GET /api/dashboard/snapshot-periods (A-110)", () => {
  it("401s when unauthenticated", async () => {
    state.session = null;
    const response = await GET(request("http://localhost/api/dashboard/snapshot-periods?period=daily"));
    expect(response.status).toBe(401);
  });

  it("400s on an unknown period value", async () => {
    state.session = { user: { id: "u1", organizationId: "org-1", role: "Employee" } };
    const response = await GET(request("http://localhost/api/dashboard/snapshot-periods?period=quarterly"));
    expect(response.status).toBe(400);
  });

  it("period=daily/weekly/monthly calls buildSnapshotPeriod with the session's real organization id and returns {snapshot}", async () => {
    state.session = { user: { id: "u1", organizationId: "org-1", role: "Employee" } };
    const response = await GET(request("http://localhost/api/dashboard/snapshot-periods?period=weekly"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { snapshot: { period: string; current: { tasksCreated: number } } };
    expect(body.snapshot.period).toBe("weekly");
    expect(body.snapshot.current.tasksCreated).toBe(1);
    expect(buildSnapshotPeriodCalls).toContainEqual({ organizationId: "org-1", period: "weekly" });
  });

  it("period=yoy calls earliestTenantActivityDate instead, and never calls buildSnapshotPeriod", async () => {
    state.session = { user: { id: "u1", organizationId: "org-1", role: "Employee" } };
    buildSnapshotPeriodCalls.length = 0;
    const response = await GET(request("http://localhost/api/dashboard/snapshot-periods?period=yoy"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as { earliestActivityDate: string };
    expect(body.earliestActivityDate).toBe("2026-07-02T00:00:00.000Z");
    expect(earliestTenantActivityDateCalls).toContain("org-1");
    expect(buildSnapshotPeriodCalls).toHaveLength(0);
  });
});
