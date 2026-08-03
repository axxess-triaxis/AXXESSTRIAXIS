import type { ApplicationServices } from "../../providers/serviceProvider";
import type { TenantScope } from "../../repositories/interfaces";
import { getIntegrationHealth } from "../integrations/pluginRegistry";
import { approvalRequestsRepository } from "../../repositories/workflowActionRepositories";

export type LiveWorkspaceMetrics = {
  activeProjects: number;
  openTasks: number;
  pendingApprovals: number;
  unreadNotifications: number;
  ragReadyDocuments: number;
  integrationConfigured: number;
  socialAlerts: number;
};

export async function getLiveWorkspaceMetrics(services: ApplicationServices, scope: TenantScope): Promise<LiveWorkspaceMetrics> {
  const [projects, tasks, notifications, documents, approvals] = await Promise.all([
    services.projectsRepository.list(scope, { pageSize: 500 }).catch(() => []),
    services.tasksRepository.list(scope, { pageSize: 1000 }).catch(() => []),
    services.notificationsRepository.list(scope, { pageSize: 250 }).catch(() => []),
    services.documentsRepository.list(scope, { pageSize: 2500 }).catch(() => []),
    // Sprint 5 (A-17): this previously read services.institutionalRepository.getApprovals(),
    // which is always the empty stub for every tenant (see the liveRepositories comment in
    // serviceProvider.ts) -- so a real tenant's dashboard could never reflect an approval request
    // created by the golden path (createWorkflowActionFromAiReview -> approvalRequestsRepository),
    // no matter how many existed. approval_requests now has a real repository; use it.
    approvalRequestsRepository.list(scope, { pageSize: 250 }).catch(() => []),
  ]);

  return {
    activeProjects: projects.filter((project) => !["completed", "archived"].includes(project.status)).length,
    openTasks: tasks.filter((task) => !["completed", "archived"].includes(task.status)).length,
    pendingApprovals: approvals.filter((approval) => approval.status === "pending" || approval.status === "changes_requested").length,
    unreadNotifications: notifications.filter((notification) => !notification.readAt).length,
    ragReadyDocuments: documents.filter((document) => document.status !== "deleted").length,
    integrationConfigured: getIntegrationHealth().configured,
    // No live social-alerts repository exists yet; 0 is an honest default rather than a
    // fabricated count. See DEMO_DATA_LEAKAGE_AUDIT.md.
    socialAlerts: 0,
  };
}

// Illustrative numbers for the investor-demo experience only. Callers must gate this behind
// isDemoModeEnabled() -- never show these to a real tenant. See DEMO_DATA_LEAKAGE_AUDIT.md.
export function getFallbackLiveWorkspaceMetrics(): LiveWorkspaceMetrics {
  return {
    activeProjects: 186,
    openTasks: 412,
    pendingApprovals: 23,
    unreadNotifications: 18,
    ragReadyDocuments: 2200,
    // A-91 (2026-08-03): was 0, which rendered "Integration Health: Gated" even in demo mode --
    // founder's explicit instruction to replace "not connected"-looking labels with realistic
    // demo data on investor.triaxisventures.com. 6 reflects a plausible connected set for a
    // pilot org (Google Workspace, Microsoft, WhatsApp Business, Threads, Meta Business, Zoom).
    integrationConfigured: 6,
    socialAlerts: 4,
  };
}

// Honest "no data yet" state for real tenants -- used while live metrics are loading or if the
// live fetch fails, instead of fabricated demo numbers.
export function getZeroLiveWorkspaceMetrics(): LiveWorkspaceMetrics {
  return {
    activeProjects: 0,
    openTasks: 0,
    pendingApprovals: 0,
    unreadNotifications: 0,
    ragReadyDocuments: 0,
    integrationConfigured: 0,
    socialAlerts: 0,
  };
}

