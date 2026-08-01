import { describe, expect, it } from "vitest";
import { getFallbackLiveWorkspaceMetrics } from "../live-platform/livePlatform";
import { buildEnterpriseGoldenPathSnapshot } from "./enterpriseGoldenPath";
import {
  buildTenantHealthIndicators,
  buildWorkflowProgressRecords,
  fallbackWorkflowTimelineEvents,
} from "./workflowEvidence";

describe("workflow evidence", () => {
  it("persists every golden-path step with Supabase-compatible statuses", () => {
    const snapshot = buildEnterpriseGoldenPathSnapshot({
      metrics: getFallbackLiveWorkspaceMetrics(),
      userRole: "Organization Admin",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 2,
    });

    const progress = buildWorkflowProgressRecords("org-live-pilot", snapshot, "2026-07-16T09:00:00.000Z");

    expect(progress).toHaveLength(snapshot.steps.length);
    expect(progress.map((step) => step.stepId)).toContain("human-review");
    expect(progress.find((step) => step.stepId === "human-review")?.status).toBe("needs_review");
    expect(progress.find((step) => step.stepId === "organization-setup")?.completedAt).toBe("2026-07-16T09:00:00.000Z");
  });

  it("builds customer-facing tenant health indicators from live metrics", () => {
    const metrics = { ...getFallbackLiveWorkspaceMetrics(), integrationConfigured: 1, pendingApprovals: 21 };
    const snapshot = buildEnterpriseGoldenPathSnapshot({
      metrics,
      userRole: "Manager",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 1,
    });

    const indicators = buildTenantHealthIndicators(snapshot, metrics);

    expect(indicators.map((indicator) => indicator.id)).toEqual([
      "onboarding",
      "team-provisioning",
      "documents-indexed",
      "pending-ai-reviews",
      "open-tasks",
      "approval-sla",
      "integration-health",
      "audit-readiness",
    ]);
    expect(indicators.find((indicator) => indicator.id === "team-provisioning")?.label).toBe("Team provisioning");
    expect(indicators.find((indicator) => indicator.id === "audit-readiness")?.label).toBe("Audit readiness");
    expect(indicators.find((indicator) => indicator.id === "approval-sla")?.tone).toBe("danger");
    expect(indicators.find((indicator) => indicator.id === "integration-health")?.value).toBe("Connected");
  });

  it("uses a literal pending-AI-review count over the golden path's needsReviewCount when provided (Executive Dashboard Sprint ED-2)", () => {
    const metrics = { ...getFallbackLiveWorkspaceMetrics(), pendingApprovals: 0 };
    const snapshot = buildEnterpriseGoldenPathSnapshot({
      metrics,
      userRole: "Manager",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 1,
    });

    // Without an override: falls back to the golden path's own needsReviewCount (0 or 1, never a
    // real item count).
    const withoutOverride = buildTenantHealthIndicators(snapshot, metrics);
    expect(withoutOverride.find((indicator) => indicator.id === "pending-ai-reviews")?.value).toBe(String(snapshot.needsReviewCount));

    // With a literal override (e.g. from usePendingAiReviewCount, a real ai_operation_reviews
    // count): the tile shows the real number, even when it diverges from needsReviewCount.
    const withOverride = buildTenantHealthIndicators(snapshot, metrics, 7);
    const tile = withOverride.find((indicator) => indicator.id === "pending-ai-reviews");
    expect(tile?.value).toBe("7");
    expect(tile?.tone).toBe("warning");
  });

  it("uses a literal audit_logs count over the proxy heuristic when provided (Executive Dashboard Sprint ED-2)", () => {
    const metrics = { ...getFallbackLiveWorkspaceMetrics(), unreadNotifications: 0 };
    const snapshot = buildEnterpriseGoldenPathSnapshot({
      metrics,
      userRole: "Manager",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 0,
    });

    // Without an override: the proxy heuristic (Tracked/Needs first event), unchanged from ED-1.
    const withoutOverride = buildTenantHealthIndicators(snapshot, metrics);
    expect(["Tracked", "Needs first event"]).toContain(withoutOverride.find((indicator) => indicator.id === "audit-readiness")?.value);

    // With a literal override (e.g. from useAuditLogCount, a real audit_logs row count): the tile
    // shows the real number.
    const withOverride = buildTenantHealthIndicators(snapshot, metrics, 0, 12);
    const tile = withOverride.find((indicator) => indicator.id === "audit-readiness");
    expect(tile?.value).toBe("12");
    expect(tile?.tone).toBe("success");

    const withZeroOverride = buildTenantHealthIndicators(snapshot, metrics, 0, 0);
    expect(withZeroOverride.find((indicator) => indicator.id === "audit-readiness")?.value).toBe("0");
    expect(withZeroOverride.find((indicator) => indicator.id === "audit-readiness")?.tone).toBe("warning");
  });

  it("provides a coherent fallback timeline when live persistence is unavailable", () => {
    const events = fallbackWorkflowTimelineEvents("org-live-pilot");

    expect(events.map((event) => event.eventType)).toEqual([
      "source_imported",
      "ai_answer_generated",
      "human_decision",
      "workflow_action_created",
      "audit_recorded",
    ]);
    expect(events[0]?.organizationId).toBe("org-live-pilot");
  });
});
