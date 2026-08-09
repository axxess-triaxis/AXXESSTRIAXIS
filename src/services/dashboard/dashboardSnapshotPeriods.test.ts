import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildSnapshotPeriod,
  deriveSnapshotInsights,
  earliestTenantActivityDate,
  fetchSnapshotPeriodCounts,
  periodWindow,
  type SnapshotPeriodCounts,
} from "./dashboardSnapshotPeriods";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

function counts(overrides: Partial<SnapshotPeriodCounts> = {}): SnapshotPeriodCounts {
  return {
    tasksCreated: 0,
    tasksCompleted: 0,
    meetingsHeld: 0,
    aiReviewsCreated: 0,
    aiReviewsDecided: 0,
    aiReviewsEscalated: 0,
    documentsAdded: 0,
    auditEvents: 0,
    workflowEvents: 0,
    ...overrides,
  };
}

describe("periodWindow (pure date math, A-110)", () => {
  it("daily: today's start to now, vs. yesterday's full day", () => {
    const now = new Date("2026-08-09T15:30:00.000Z");
    const window = periodWindow("daily", now);
    expect(window.start).toBe("2026-08-09T00:00:00.000Z");
    expect(window.end).toBe(now.toISOString());
    expect(window.previousStart).toBe("2026-08-08T00:00:00.000Z");
    expect(window.previousEnd).toBe("2026-08-09T00:00:00.000Z");
  });

  it("weekly: last 7 days vs. the 7 days before that", () => {
    const now = new Date("2026-08-09T12:00:00.000Z");
    const window = periodWindow("weekly", now);
    expect(window.start).toBe("2026-08-02T12:00:00.000Z");
    expect(window.previousStart).toBe("2026-07-26T12:00:00.000Z");
    expect(window.previousEnd).toBe(window.start);
  });

  it("monthly: month-to-date vs. the same elapsed span of the prior month", () => {
    const now = new Date("2026-08-09T12:00:00.000Z");
    const window = periodWindow("monthly", now);
    expect(window.start).toBe("2026-08-01T00:00:00.000Z");
    expect(window.previousStart).toBe("2026-07-01T00:00:00.000Z");
    // 9 days elapsed in August (Aug 1 through Aug 9 inclusive) -> previousEnd is 9 days into July.
    expect(window.previousEnd).toBe("2026-07-10T00:00:00.000Z");
  });
});

describe("fetchSnapshotPeriodCounts / buildSnapshotPeriod (A-110)", () => {
  it("returns honest zero counts, not demo numbers, when Supabase admin isn't configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const result = await fetchSnapshotPeriodCounts("org-1", { start: "2026-08-01T00:00:00.000Z", end: "2026-08-09T00:00:00.000Z" });

    expect(result).toEqual(counts());
  });

  it("queries each source table with real gte./lt. range filters on the correct column", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      // tasksCompleted returns 2 rows, everything else empty -- proves per-table counts are real,
      // not just structurally present.
      const url = String(input);
      if (url.includes("/rest/v1/tasks") && url.includes("status=eq.completed")) {
        return new Response(JSON.stringify([{ id: "t1" }, { id: "t2" }]), { status: 200 });
      }
      return new Response(JSON.stringify([]), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchSnapshotPeriodCounts("org-1", { start: "2026-08-01T00:00:00.000Z", end: "2026-08-09T00:00:00.000Z" });

    expect(result.tasksCompleted).toBe(2);
    expect(result.tasksCreated).toBe(0);

    const tasksCreatedCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/rest/v1/tasks") && !String(input).includes("status=eq.completed"));
    expect(tasksCreatedCall).toBeDefined();
    const [tasksCreatedUrl] = tasksCreatedCall!;
    expect(String(tasksCreatedUrl)).toContain("created_at=gte.2026-08-01T00%3A00%3A00.000Z");
    expect(String(tasksCreatedUrl)).toContain("created_at=lt.2026-08-09T00%3A00%3A00.000Z");
    expect(String(tasksCreatedUrl)).toContain("organization_id=eq.org-1");

    const meetingsCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/rest/v1/meetings"));
    expect(String(meetingsCall![0])).toContain("starts_at=gte.");
    expect(String(meetingsCall![0])).toContain("status=eq.completed");

    const escalatedCall = fetchMock.mock.calls.find(([input]) => String(input).includes("/rest/v1/ai_operation_reviews") && String(input).includes("status=eq.escalated"));
    expect(escalatedCall).toBeDefined();
    expect(String(escalatedCall![0])).toContain("reviewed_at=gte.");
  });

  it("buildSnapshotPeriod fetches both the current and previous window", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");

    const result = await buildSnapshotPeriod("org-1", "weekly", new Date("2026-08-09T12:00:00.000Z"));

    expect(result.period).toBe("weekly");
    expect(result.current).toEqual(counts());
    expect(result.previous).toEqual(counts());
    expect(result.window.start).toBe("2026-08-02T12:00:00.000Z");
  });
});

describe("earliestTenantActivityDate (A-110)", () => {
  it("returns undefined when Supabase admin isn't configured", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(await earliestTenantActivityDate("org-1")).toBeUndefined();
  });

  it("returns the real earliest workflow_timeline_events row for this org", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "service-role-key");
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{ created_at: "2026-07-02T00:00:00.000Z" }]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const date = await earliestTenantActivityDate("org-1");

    expect(date).toBe("2026-07-02T00:00:00.000Z");
    const [url] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("order=created_at.asc");
    expect(String(url)).toContain("limit=1");
  });
});

describe("deriveSnapshotInsights (template-based, not generative, A-110)", () => {
  it("returns an honest 'not enough activity' insight when the previous period was entirely zero", () => {
    const insights = deriveSnapshotInsights({ current: counts({ tasksCreated: 5 }), previous: counts() });
    expect(insights).toEqual([{ id: "no-prior-activity", text: "Not enough activity last week to compare yet.", tone: "neutral" }]);
  });

  it("reports a real positive delta with the correct sign and tone", () => {
    const insights = deriveSnapshotInsights({
      current: counts({ aiReviewsEscalated: 3, tasksCompleted: 1 }),
      previous: counts({ aiReviewsEscalated: 1, tasksCompleted: 1 }),
    });
    const escalation = insights.find((insight) => insight.id === "ai-reviews-escalated");
    expect(escalation?.text).toBe("2 more AI reviews escalated this week than last.");
    expect(escalation?.tone).toBe("warning");
  });

  it("reports a real negative delta", () => {
    const insights = deriveSnapshotInsights({
      current: counts({ aiReviewsEscalated: 0, tasksCompleted: 1 }),
      previous: counts({ aiReviewsEscalated: 2, tasksCompleted: 1 }),
    });
    const escalation = insights.find((insight) => insight.id === "ai-reviews-escalated");
    expect(escalation?.text).toBe("2 fewer AI reviews escalated this week than last.");
    expect(escalation?.tone).toBe("positive");
  });

  it("caps at 3 insights, largest absolute delta first, when all 4 tracked fields moved", () => {
    const insights = deriveSnapshotInsights({
      current: counts({ aiReviewsEscalated: 3, tasksCompleted: 5, meetingsHeld: 4, documentsAdded: 2 }),
      previous: counts({ aiReviewsEscalated: 1, tasksCompleted: 1, meetingsHeld: 1, documentsAdded: 1 }),
    });
    // Deltas: tasksCompleted=4, meetingsHeld=3, aiReviewsEscalated=2, documentsAdded=1 -- 4 real
    // candidates, capped to the top 3 by absolute size, documentsAdded (smallest) dropped.
    expect(insights).toHaveLength(3);
    expect(insights.map((insight) => insight.id)).toEqual(["tasks-completed", "meetings-held", "ai-reviews-escalated"]);
  });

  it("returns no insights when nothing changed and no prior-period data exists", () => {
    expect(deriveSnapshotInsights(undefined)).toEqual([]);
  });
});
