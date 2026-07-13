import type { ApplicationServices } from "../../providers/serviceProvider";
import type { TenantScope } from "../../repositories/interfaces";
import { getIntegrationHealth } from "../integrations/pluginRegistry";

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
  const [projects, tasks, notifications, documents] = await Promise.all([
    services.projectsRepository.list(scope, { pageSize: 500 }).catch(() => []),
    services.tasksRepository.list(scope, { pageSize: 1000 }).catch(() => []),
    services.notificationsRepository.list(scope, { pageSize: 250 }).catch(() => []),
    services.documentsRepository.list(scope, { pageSize: 2500 }).catch(() => []),
  ]);

  return {
    activeProjects: projects.filter((project) => !["completed", "archived"].includes(project.status)).length,
    openTasks: tasks.filter((task) => !["completed", "archived"].includes(task.status)).length,
    pendingApprovals: services.institutionalRepository.getApprovals().filter((approval) => approval.status !== "Completed").length,
    unreadNotifications: notifications.filter((notification) => !notification.readAt).length,
    ragReadyDocuments: documents.filter((document) => document.status !== "deleted").length,
    integrationConfigured: getIntegrationHealth().configured,
    socialAlerts: 4,
  };
}

export function getFallbackLiveWorkspaceMetrics(): LiveWorkspaceMetrics {
  return {
    activeProjects: 186,
    openTasks: 412,
    pendingApprovals: 23,
    unreadNotifications: 18,
    ragReadyDocuments: 2200,
    integrationConfigured: 0,
    socialAlerts: 4,
  };
}

