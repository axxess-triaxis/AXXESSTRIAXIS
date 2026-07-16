import { describe, expect, it } from "vitest";
import { getFallbackLiveWorkspaceMetrics } from "../live-platform/livePlatform";
import { buildEnterpriseGoldenPathSnapshot } from "./enterpriseGoldenPath";

describe("enterprise golden path", () => {
  it("connects onboarding, knowledge, AI review, workflow action, dashboard, and audit evidence", () => {
    const snapshot = buildEnterpriseGoldenPathSnapshot({
      metrics: getFallbackLiveWorkspaceMetrics(),
      userRole: "Organization Admin",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 3,
    });

    expect(snapshot.readinessScore).toBeGreaterThanOrEqual(70);
    expect(snapshot.steps.map((step) => step.id)).toEqual([
      "organization-setup",
      "team-provisioning",
      "knowledge-ingestion",
      "grounded-question",
      "human-review",
      "workflow-action",
      "dashboard-feedback",
      "audit-evidence",
    ]);
    expect(snapshot.steps.find((step) => step.id === "human-review")?.status).toBe("needs-review");
    expect(snapshot.auditEvents).toContain("workflow.ai_review.decision_recorded");
    expect(snapshot.actionQueue[0]?.route).toBe("/admin/organization");
  });

  it("blocks consequential action until knowledge and review prerequisites are ready", () => {
    const snapshot = buildEnterpriseGoldenPathSnapshot({
      metrics: {
        ...getFallbackLiveWorkspaceMetrics(),
        activeProjects: 0,
        openTasks: 0,
        ragReadyDocuments: 0,
        pendingApprovals: 0,
        unreadNotifications: 0,
      },
      userRole: "Manager",
      hasOrganization: true,
      hasProfile: true,
      pendingAiReviews: 0,
    });

    expect(snapshot.steps.find((step) => step.id === "grounded-question")?.status).toBe("blocked");
    expect(snapshot.steps.find((step) => step.id === "knowledge-ingestion")?.status).toBe("active");
    expect(snapshot.steps.find((step) => step.id === "audit-evidence")?.lockedForRole).toBe(true);
    expect(snapshot.actionQueue.some((action) => action.route === "/admin/audit-logs")).toBe(false);
  });
});
