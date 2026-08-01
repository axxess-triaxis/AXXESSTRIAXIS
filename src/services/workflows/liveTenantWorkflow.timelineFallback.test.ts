import { afterEach, describe, expect, it, vi } from "vitest";

// Sprint 4 (Integrations, Analytics, and Operational Evidence): before this fix,
// listWorkflowTimeline() silently substituted fabricated timeline events (fixed titles, fixed
// confidence scores, fixed 2026-07-16 timestamps -- see fallbackWorkflowTimelineEvents in
// workflowEvidence.ts) for ANY tenant with zero real workflow_timeline_events rows, whether
// Supabase was unconfigured or genuinely configured-and-empty. A brand-new real tenant with no
// activity yet would see events that never happened. Isolated into its own file (rather than
// extending liveTenantWorkflow.test.ts) because it needs isSupabaseAdminConfigured() and
// isDemoModeEnabled() mocked per-scenario, and vi.mock is file-scoped in Vitest.
const state = { adminConfigured: true, demoMode: false, rows: [] as unknown[] };

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => state.adminConfigured,
  supabaseAdminRest: vi.fn(async () => state.rows),
}));

vi.mock("../../demo/demoMode", () => ({
  isDemoModeEnabled: () => state.demoMode,
}));

import { listWorkflowTimeline } from "./liveTenantWorkflow";

describe("listWorkflowTimeline never proves live tenant activity with fabricated events (Sprint 4)", () => {
  afterEach(() => {
    state.adminConfigured = true;
    state.demoMode = false;
    state.rows = [];
    vi.clearAllMocks();
  });

  it("returns an honest empty array for a genuinely empty real tenant (Supabase configured, zero rows, not Demo Mode)", async () => {
    state.adminConfigured = true;
    state.demoMode = false;
    state.rows = [];

    const events = await listWorkflowTimeline("org-real-empty-tenant");
    expect(events).toEqual([]);
  });

  it("returns an honest empty array when Supabase is unconfigured and Demo Mode is off", async () => {
    state.adminConfigured = false;
    state.demoMode = false;

    const events = await listWorkflowTimeline("org-no-backend");
    expect(events).toEqual([]);
  });

  it("still shows the fallback timeline in Demo Mode, unchanged from before this fix", async () => {
    state.adminConfigured = false;
    state.demoMode = true;

    const events = await listWorkflowTimeline("org-demo-tenant");
    expect(events.length).toBeGreaterThan(0);
    expect(events.every((event) => event.organizationId === "org-demo-tenant")).toBe(true);
  });

  it("returns real rows when they exist, never the fallback, regardless of Demo Mode", async () => {
    state.adminConfigured = true;
    state.demoMode = true;
    state.rows = [{
      id: "real-event-1",
      organization_id: "org-real-tenant",
      resource_type: "document",
      resource_id: "doc-1",
      event_type: "document_indexed",
      title: "Real document indexed",
      description: null,
      actor_user_id: "user-1",
      actor_label: "Organization Admin",
      source_type: "document",
      source_id: "doc-1",
      audit_log_id: null,
      metadata: {},
      created_at: "2026-07-24T00:00:00.000Z",
    }];

    const events = await listWorkflowTimeline("org-real-tenant");
    expect(events).toHaveLength(1);
    expect(events[0].id).toBe("real-event-1");
    expect(events[0].title).toBe("Real document indexed");
  });
});
