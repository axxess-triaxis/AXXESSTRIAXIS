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
      "active-users",
      "documents-indexed",
      "pending-ai-reviews",
      "open-tasks",
      "approval-sla",
      "integration-health",
      "audit-coverage",
    ]);
    expect(indicators.find((indicator) => indicator.id === "approval-sla")?.tone).toBe("danger");
    expect(indicators.find((indicator) => indicator.id === "integration-health")?.value).toBe("Connected");
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
