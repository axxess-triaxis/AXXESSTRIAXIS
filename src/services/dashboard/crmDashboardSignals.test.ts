import { describe, expect, it } from "vitest";
import type { CrmLead } from "../../domain";
import { computeCrmDashboardSignals } from "./crmDashboardSignals";

function lead(overrides: Partial<CrmLead>): CrmLead {
  return {
    id: "lead", organizationId: "org-1", title: "x", stage: "new", priority: "medium",
    status: "open", createdAt: "2026-08-01T00:00:00.000Z", updatedAt: "2026-08-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("computeCrmDashboardSignals", () => {
  it("returns all-zero for an empty tenant, not fabricated pipeline data", () => {
    expect(computeCrmDashboardSignals([])).toEqual({ openLeadsCount: 0, followUpsDueCount: 0, stalledCount: 0 });
  });

  it("counts open leads, due follow-ups, and stalled opportunities independently", () => {
    const now = new Date("2026-08-01T12:00:00.000Z");
    const leads = [
      lead({ id: "1", status: "open" }),
      lead({ id: "2", status: "open", nextFollowUpAt: "2026-08-01T00:00:00.000Z" }),
      lead({ id: "3", status: "open", nextFollowUpAt: "2026-08-10T00:00:00.000Z" }),
      lead({ id: "4", status: "stalled" }),
      lead({ id: "5", status: "won" }),
    ];

    const signals = computeCrmDashboardSignals(leads, now);

    expect(signals.openLeadsCount).toBe(3);
    expect(signals.followUpsDueCount).toBe(1);
    expect(signals.stalledCount).toBe(1);
  });
});
