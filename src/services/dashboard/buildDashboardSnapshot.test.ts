import { describe, expect, it } from "vitest";
import { buildDashboardSnapshot, type DashboardSnapshotInput } from "./buildDashboardSnapshot";

function baseInput(overrides: Partial<DashboardSnapshotInput> = {}): DashboardSnapshotInput {
  return {
    liveMetrics: {
      activeProjects: 0,
      openTasks: 0,
      pendingApprovals: 0,
      unreadNotifications: 0,
      ragReadyDocuments: 0,
      integrationConfigured: 0,
      socialAlerts: 0,
    },
    overdueTaskCount: 0,
    overdueMeetingCount: 0,
    pendingAiReviewCount: 0,
    auditLogCount: 0,
    socialAlertsAnyLiveProviderConfigured: false,
    workflowTimelineEventCount: 0,
    projects: [],
    demoMode: false,
    mailSignals: undefined,
    crmLeads: undefined,
    socialSignals: undefined,
    calendarSignals: undefined,
    externalMeetingsSignals: undefined,
    financialWatchItems: undefined,
    threadsSignals: undefined,
    metaBusinessSignals: undefined,
    ...overrides,
  };
}

describe("buildDashboardSnapshot", () => {
  it("assigns every tile to tier 1, 2, or 3", () => {
    const tiles = buildDashboardSnapshot(baseInput());
    for (const tile of tiles) {
      expect([1, 2, 3]).toContain(tile.tier);
    }
  });

  it("includes real Tier 1 tiles alongside honest not-connected placeholders for unbuilt sources", () => {
    const tiles = buildDashboardSnapshot(baseInput());
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));

    expect(byId["overdue-tasks"].dataState).toBe("live");
    expect(byId["mail-inbox"].dataState).toBe("not-connected");
    expect(byId["mail-inbox"].value).toBe("Not connected yet");
    expect(byId["calendar-today"].dataState).toBe("not-connected");
    expect(byId["crm-open-leads"].dataState).toBe("not-connected");
  });

  it("never fabricates a numeric value for a not-connected tile", () => {
    const tiles = buildDashboardSnapshot(baseInput());
    const notConnected = tiles.filter((tile) => tile.dataState === "not-connected");
    expect(notConnected.length).toBeGreaterThan(0);
    for (const tile of notConnected) {
      expect(tile.value).toBe("Not connected yet");
    }
  });

  it("marks a tile as partial (not live) when its underlying count has not loaded yet", () => {
    const tiles = buildDashboardSnapshot(baseInput({ overdueTaskCount: undefined }));
    const overdueTasks = tiles.find((tile) => tile.id === "overdue-tasks");
    expect(overdueTasks?.dataState).toBe("partial");
    expect(overdueTasks?.value).toBe("--");
  });

  it("escalates the overdue-tasks tile to a qualifying Urgent Attention score under a heavy backlog", () => {
    const tiles = buildDashboardSnapshot(baseInput({ overdueTaskCount: 20 }));
    const overdueTasks = tiles.find((tile) => tile.id === "overdue-tasks");
    expect(overdueTasks?.score).toBeGreaterThanOrEqual(16);
  });

  it("reflects real project risk into the project-health tile score", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      projects: [{ risk: "urgent" }, { risk: "high" }, { risk: "low" }, { risk: "low" }],
    }));
    const projectHealth = tiles.find((tile) => tile.id === "project-health");
    expect(projectHealth?.value).toBe("2/4 at risk");
    expect(projectHealth?.dataState).toBe("live");
  });

  it("places the audit trail tile in Tier 3 and the document indexing tile in Tier 2", () => {
    const tiles = buildDashboardSnapshot(baseInput());
    expect(tiles.find((tile) => tile.id === "audit-log-gap")?.tier).toBe(3);
    expect(tiles.find((tile) => tile.id === "document-indexing-health")?.tier).toBe(2);
  });
});

// Executive Dashboard Redesign Sprint ED-R2
describe("buildDashboardSnapshot -- mail signal (ED-R2)", () => {
  it("is not-connected when neither Gmail nor Microsoft is connected", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      mailSignals: { gmailConnected: false, microsoftConnected: false, needingReplyCount: 0, oldestNeedingReplyDays: null },
    }));
    const mailTile = tiles.find((tile) => tile.id === "mail-inbox");
    expect(mailTile?.dataState).toBe("not-connected");
    expect(mailTile?.value).toBe("Not connected yet");
  });

  it("is a genuine live/empty tile (never fabricated) once a provider is connected with zero mail needing reply", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      mailSignals: { gmailConnected: true, microsoftConnected: false, needingReplyCount: 0, oldestNeedingReplyDays: null },
    }));
    const mailTile = tiles.find((tile) => tile.id === "mail-inbox");
    expect(mailTile?.dataState).toBe("empty");
    expect(mailTile?.value).toBe("0");
  });

  it("surfaces a real count of mail needing reply and scores it", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      mailSignals: { gmailConnected: true, microsoftConnected: false, needingReplyCount: 6, oldestNeedingReplyDays: 1 },
    }));
    const mailTile = tiles.find((tile) => tile.id === "mail-inbox");
    expect(mailTile?.dataState).toBe("live");
    expect(mailTile?.value).toBe("6");
    expect(mailTile?.criticality).toBe("red");
  });

  it("replaces the ED-R1 not-connected placeholder tile id with the same id once real (snapshot replacement, not duplication)", () => {
    const notConnected = buildDashboardSnapshot(baseInput()).filter((tile) => tile.id === "mail-inbox");
    const connected = buildDashboardSnapshot(baseInput({
      mailSignals: { gmailConnected: true, microsoftConnected: false, needingReplyCount: 1, oldestNeedingReplyDays: 0 },
    })).filter((tile) => tile.id === "mail-inbox");
    expect(notConnected.length).toBe(1);
    expect(connected.length).toBe(1);
  });
});

describe("buildDashboardSnapshot -- CRM signal (ED-R2)", () => {
  it("shows honest empty-state CRM tiles for a tenant with zero leads (real query, genuinely empty)", () => {
    const tiles = buildDashboardSnapshot(baseInput({ crmLeads: [] }));
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
    expect(byId["crm-open-leads"].dataState).toBe("empty");
    expect(byId["crm-open-leads"].value).toBe("0");
    expect(byId["crm-follow-ups-due"].value).toBe("0");
    expect(byId["crm-stalled-leads"].value).toBe("0");
  });

  it("scores overdue follow-ups and stalled leads from real lead data, tenant-isolated by construction (input is already tenant-scoped)", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      crmLeads: [
        { id: "1", organizationId: "org-1", title: "A", stage: "new", priority: "medium", status: "open", nextFollowUpAt: "2020-01-01T00:00:00.000Z", createdAt: "", updatedAt: "" },
        { id: "2", organizationId: "org-1", title: "B", stage: "proposal", priority: "high", status: "stalled", createdAt: "", updatedAt: "" },
        { id: "3", organizationId: "org-1", title: "C", stage: "new", priority: "medium", status: "open", createdAt: "", updatedAt: "" },
      ],
    }));
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
    expect(byId["crm-open-leads"].value).toBe("2");
    expect(byId["crm-follow-ups-due"].value).toBe("1");
    expect(byId["crm-stalled-leads"].value).toBe("1");
    expect(byId["crm-stalled-leads"].dataState).toBe("live");
  });

  it("shows a loading not-connected state (not a fabricated zero) while CRM data hasn't loaded yet", () => {
    const tiles = buildDashboardSnapshot(baseInput({ crmLeads: undefined }));
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
    expect(byId["crm-open-leads"].dataState).toBe("not-connected");
  });
});

describe("buildDashboardSnapshot -- social signal (ED-R2)", () => {
  it("shows an honest empty state (real query, zero real events) when nothing is configured", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      socialSignals: { criticalAlertCount: 0, queryRan: true, xConfigured: false, facebookConfigured: false },
    }));
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
    expect(byId["critical-social-alerts"].dataState).toBe("empty");
    expect(byId["critical-social-alerts"].value).toBe("0");
    expect(byId["social-provider-health"].dataState).toBe("partial");
  });

  it("surfaces a real critical alert count and marks provider health live once a provider is configured", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      socialSignals: { criticalAlertCount: 3, queryRan: true, xConfigured: true, facebookConfigured: false },
    }));
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
    expect(byId["critical-social-alerts"].value).toBe("3");
    expect(byId["critical-social-alerts"].criticality).toBe("red");
    expect(byId["social-provider-health"].dataState).toBe("live");
  });

  it("never fabricates an 'official-account alerts' classification -- stays honestly not-connected regardless of other social data", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      socialSignals: { criticalAlertCount: 5, queryRan: true, xConfigured: true, facebookConfigured: true },
    }));
    const officialAccountTile = tiles.find((tile) => tile.id === "official-account-alerts");
    expect(officialAccountTile?.dataState).toBe("not-connected");
    expect(officialAccountTile?.value).toBe("Not connected yet");
  });

  it("marks the critical-alerts tile not-connected (loading), not a fabricated zero, before the signal has loaded", () => {
    const tiles = buildDashboardSnapshot(baseInput({ socialSignals: undefined }));
    const criticalTile = tiles.find((tile) => tile.id === "critical-social-alerts");
    expect(criticalTile?.dataState).toBe("not-connected");
  });
});

// Executive Dashboard Redesign Sprint ED-R3
describe("buildDashboardSnapshot -- calendar signal (ED-R3)", () => {
  it("shows an honest empty state for a tenant with no meetings today/upcoming (real query, genuinely empty)", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      calendarSignals: { todayCount: 0, upcomingCount: 0, hasMeetingWithinHour: false },
    }));
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
    expect(byId["calendar-today"].dataState).toBe("empty");
    expect(byId["upcoming-meetings"].dataState).toBe("empty");
  });

  it("surfaces real today/upcoming counts and does not escalate to red for an imminent meeting", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      calendarSignals: { todayCount: 3, upcomingCount: 5, hasMeetingWithinHour: true },
    }));
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
    expect(byId["calendar-today"].value).toBe("3");
    expect(byId["calendar-today"].criticality).not.toBe("red");
    expect(byId["upcoming-meetings"].value).toBe("5");
  });
});

describe("buildDashboardSnapshot -- external meetings signal (ED-R3)", () => {
  it("distinguishes 'OAuth connected but no fetch service' from 'not connected at all' in the tile detail text", () => {
    const connected = buildDashboardSnapshot(baseInput({
      externalMeetingsSignals: { zoomOAuthConnected: true, googleCalendarOAuthConnected: false },
    })).find((tile) => tile.id === "zoom-upcoming-meetings");
    const notConnected = buildDashboardSnapshot(baseInput({
      externalMeetingsSignals: { zoomOAuthConnected: false, googleCalendarOAuthConnected: false },
    })).find((tile) => tile.id === "zoom-upcoming-meetings");

    expect(connected?.detail).toContain("connected");
    expect(connected?.detail).toContain("no service exists yet");
    expect(notConnected?.detail).toContain("not connected");
    expect(connected?.dataState).toBe("not-connected");
    expect(notConnected?.dataState).toBe("not-connected");
  });
});

describe("buildDashboardSnapshot -- financial watchlist signal (ED-R3)", () => {
  it("shows an honest empty state for a tenant with no watch items (manual tracking, never fabricated)", () => {
    const tiles = buildDashboardSnapshot(baseInput({ financialWatchItems: [] }));
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
    expect(byId["budget-thresholds"].dataState).toBe("empty");
    expect(byId["budget-thresholds"].value).toContain("manual tracking");
  });

  it("every financial tile's value explicitly says 'manual tracking,' never implying a bank connection", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      financialWatchItems: [
        { id: "1", organizationId: "org-1", title: "A", category: "budget", thresholdType: "above", thresholdAmount: 100, currentAmount: 200, currency: "USD", status: "open", createdAt: "", updatedAt: "" },
      ],
    }));
    for (const id of ["budget-thresholds", "budget-overshoot", "accounts-below-threshold", "accounts-actionables"]) {
      const t = tiles.find((tile) => tile.id === id);
      expect(t?.value).toContain("manual tracking");
      expect(t?.value.toLowerCase()).not.toContain("bank connected");
    }
  });

  it("scores a real budget overshoot into the correct tier and criticality", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      financialWatchItems: [
        { id: "1", organizationId: "org-1", title: "A", category: "budget", thresholdType: "above", thresholdAmount: 100, currentAmount: 200, currency: "USD", status: "open", createdAt: "", updatedAt: "" },
      ],
    }));
    const overshoot = tiles.find((tile) => tile.id === "budget-overshoot");
    expect(overshoot?.tier).toBe(3);
    expect(overshoot?.criticality).toBe("amber");
    expect(overshoot?.dataState).toBe("live");
  });

  it("shows a not-connected loading state (not a fabricated zero) before the watchlist has loaded", () => {
    const tiles = buildDashboardSnapshot(baseInput({ financialWatchItems: undefined }));
    const byId = Object.fromEntries(tiles.map((tile) => [tile.id, tile]));
    expect(byId["accounts-below-threshold"].dataState).toBe("not-connected");
  });
});

describe("Threads tiles (Tier 1, founder's explicit ask)", () => {
  it("shows not-connected before the signal has loaded", () => {
    const tiles = buildDashboardSnapshot(baseInput({ threadsSignals: undefined }));
    const activity = tiles.find((tile) => tile.id === "threads-activity");
    expect(activity?.tier).toBe(1);
    expect(activity?.dataState).toBe("not-connected");
  });

  it("shows not-connected when Threads OAuth isn't connected for this tenant, distinct from 'loading'", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      threadsSignals: { oauthConnected: false, recentPostCount: 0, openReplyCount: 0 },
    }));
    const activity = tiles.find((tile) => tile.id === "threads-activity");
    expect(activity?.dataState).toBe("not-connected");
    expect(activity?.detail).toContain("Connect Threads");
  });

  it("shows a genuine live empty state (not not-connected) for a connected tenant that has never synced", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      threadsSignals: { oauthConnected: true, recentPostCount: 0, openReplyCount: 0 },
    }));
    const activity = tiles.find((tile) => tile.id === "threads-activity");
    expect(activity?.dataState).toBe("empty");
    expect(activity?.criticality).toBe("yellow");
  });

  it("scores real post/reply-backlog counts into the correct tier and criticality", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      threadsSignals: { oauthConnected: true, recentPostCount: 4, openReplyCount: 5 },
    }));
    const activity = tiles.find((tile) => tile.id === "threads-activity");
    const backlog = tiles.find((tile) => tile.id === "threads-reply-backlog");
    expect(activity?.tier).toBe(1);
    expect(activity?.value).toBe("4");
    expect(activity?.criticality).toBe("green");
    expect(activity?.dataState).toBe("live");
    expect(backlog?.tier).toBe(1);
    expect(backlog?.value).toBe("5");
    expect(backlog?.criticality).toBe("amber");
    expect(backlog?.dataState).toBe("live");
  });
});

describe("Meta Business Suite tiles (Tier 2, operational)", () => {
  it("shows not-connected before the signal has loaded", () => {
    const tiles = buildDashboardSnapshot(baseInput({ metaBusinessSignals: undefined }));
    const content = tiles.find((tile) => tile.id === "meta-business-content-activity");
    expect(content?.tier).toBe(2);
    expect(content?.dataState).toBe("not-connected");
  });

  it("shows not-connected when meta_business OAuth isn't connected for this tenant", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      metaBusinessSignals: { oauthConnected: false, recentPostCount: 0, activeCampaignCount: 0, overBudgetCampaignCount: 0 },
    }));
    const campaigns = tiles.find((tile) => tile.id === "meta-business-campaign-health");
    expect(campaigns?.dataState).toBe("not-connected");
    expect(campaigns?.detail).toContain("Connect Meta Business Suite");
  });

  it("scores real content/campaign counts into Tier 2 with the correct criticality", () => {
    const tiles = buildDashboardSnapshot(baseInput({
      metaBusinessSignals: { oauthConnected: true, recentPostCount: 3, activeCampaignCount: 2, overBudgetCampaignCount: 1 },
    }));
    const content = tiles.find((tile) => tile.id === "meta-business-content-activity");
    const campaigns = tiles.find((tile) => tile.id === "meta-business-campaign-health");
    expect(content?.tier).toBe(2);
    expect(content?.value).toBe("3");
    expect(content?.dataState).toBe("live");
    expect(campaigns?.tier).toBe(2);
    expect(campaigns?.value).toBe("2");
    expect(campaigns?.criticality).toBe("amber");
    expect(campaigns?.dataState).toBe("live");
  });
});
