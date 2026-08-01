import { describe, expect, it, vi } from "vitest";
import type { ApprovalRequest } from "../workflows/workflowActionRecords";
import { getFallbackLiveWorkspaceMetrics, getZeroLiveWorkspaceMetrics, getLiveWorkspaceMetrics } from "./livePlatform";

const approvalsState: { rows: ApprovalRequest[] } = { rows: [] };

vi.mock("../../repositories/workflowActionRepositories", () => ({
  approvalRequestsRepository: {
    list: async () => approvalsState.rows,
  },
}));

function approval(overrides: Partial<ApprovalRequest>): ApprovalRequest {
  return {
    id: "approval-1",
    organizationId: "org-1",
    title: "Sample approval",
    priority: "high",
    status: "pending",
    metadata: {},
    createdAt: "2026-07-24T00:00:00.000Z",
    updatedAt: "2026-07-24T00:00:00.000Z",
    ...overrides,
  };
}

describe("getLiveWorkspaceMetrics pendingApprovals (Sprint 5, A-17)", () => {
  const scope = { organizationId: "org-1", userId: "user-1", role: "Employee" as const };
  const emptyServices = {
    projectsRepository: { list: async () => [] },
    tasksRepository: { list: async () => [] },
    notificationsRepository: { list: async () => [] },
    documentsRepository: { list: async () => [] },
  } as unknown as Parameters<typeof getLiveWorkspaceMetrics>[0];

  it("counts real pending and changes-requested approval requests, not the always-empty institutional stub", async () => {
    approvalsState.rows = [
      approval({ id: "a1", status: "pending" }),
      approval({ id: "a2", status: "changes_requested" }),
      approval({ id: "a3", status: "approved" }),
      approval({ id: "a4", status: "completed" }),
    ];

    const metrics = await getLiveWorkspaceMetrics(emptyServices, scope);

    expect(metrics.pendingApprovals).toBe(2);
  });

  it("reports zero pending approvals for a tenant with none, rather than fabricating a count", async () => {
    approvalsState.rows = [];

    const metrics = await getLiveWorkspaceMetrics(emptyServices, scope);

    expect(metrics.pendingApprovals).toBe(0);
  });
});

describe("live dashboard fallbacks", () => {
  it("keeps investor dashboard populated before repository hydration", () => {
    const metrics = getFallbackLiveWorkspaceMetrics();
    expect(metrics.activeProjects).toBeGreaterThan(100);
    expect(metrics.ragReadyDocuments).toBeGreaterThanOrEqual(2200);
    expect(metrics.socialAlerts).toBeGreaterThan(0);
  });

  it("never shows a real tenant fabricated demo numbers while loading or on fetch failure", () => {
    const metrics = getZeroLiveWorkspaceMetrics();
    expect(metrics).toEqual({
      activeProjects: 0,
      openTasks: 0,
      pendingApprovals: 0,
      unreadNotifications: 0,
      ragReadyDocuments: 0,
      integrationConfigured: 0,
      socialAlerts: 0,
    });
  });
});
