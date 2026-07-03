import { AlertTriangle, FolderKanban, ShieldCheck, Sparkles } from "lucide-react";
import { applicationServices } from "../../providers/serviceProvider";
import {
  ownerInitialsForProject,
  projectDepartment,
  tenantScopeFromUser,
} from "../../repositories/supabaseEnterpriseRepositories";
import type { UserContext } from "../../security/rbac";
import type { TenantScope } from "../../repositories/interfaces";
import type { DashboardKpi } from "./types";

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    planning: "Planning",
    active: "In Progress",
    "in-progress": "In Progress",
    review: "Review",
    "at-risk": "At Risk",
    completed: "Complete",
    complete: "Complete",
    archived: "Complete",
  };

  return labels[status] ?? "Planning";
}

export function dashboardScopeForUser(user: UserContext): TenantScope {
  return tenantScopeFromUser(user);
}

export async function getDashboardProjects(scope: TenantScope) {
  const [projectRecords, programRecords, userRecords] = await Promise.all([
    applicationServices.projectsRepository.list(scope),
    applicationServices.programsRepository.list(scope),
    applicationServices.usersRepository.listByOrganization(scope),
  ]);

  return projectRecords.map((project, index) => ({
    id: index + 1,
    name: project.name,
    dept: projectDepartment(project, programRecords),
    progress: project.progress,
    risk: project.riskLevel,
    owner: ownerInitialsForProject(project, userRecords),
    dueDate: project.dueDate?.slice(0, 10) ?? "2025-12-31",
    status: statusLabel(project.status),
    budget: index === 0 ? "$12.4M" : index === 1 ? "$34.6M" : "$19.1M",
    spent: index === 0 ? "$8.2M" : index === 1 ? "$14.8M" : "$10.5M",
  }));
}

export async function getDashboardKpis(scope: TenantScope): Promise<DashboardKpi[]> {
  const [scopedProjects, scopedTasks] = await Promise.all([
    applicationServices.projectsRepository.list(scope),
    applicationServices.tasksRepository.list(scope),
  ]);
  const atRiskCount = scopedProjects.filter((project) => project.riskLevel === "high" || project.riskLevel === "urgent" || project.status === "at-risk").length;

  return [
    { label: "Active Projects", value: String(scopedProjects.length), delta: "+3", trend: "up", icon: FolderKanban, color: "#8B1E2D", sentiment: "positive" },
    { label: "At-Risk Items", value: String(atRiskCount + scopedTasks.filter((task) => task.priority === "urgent").length), delta: "+2", trend: "down", icon: AlertTriangle, color: "#C9A227", sentiment: "negative" },
  { label: "Pending Approvals", value: "23", delta: "-5", trend: "up", icon: ShieldCheck, color: "#2C4A7C", sentiment: "positive" },
    { label: "AI Actions Queued", value: "156", delta: "+41", trend: "up", icon: Sparkles, color: "#1A6B4A", sentiment: "positive" },
  ];
}

export const dashboardObjectives = [
  { name: "Digital Transformation Index", progress: 74, target: 85 },
  { name: "Citizen Service Delivery SLA", progress: 91, target: 95 },
  { name: "Operational Cost Reduction", progress: 52, target: 70 },
  { name: "Workforce Digital Capability", progress: 68, target: 80 },
];

export const dashboardAiRecommendations = [
  { title: "Escalate Border Security AI ethics review", urgency: "urgent", type: "Risk Mitigation" },
  { title: "3 approvals exceed SLA threshold — expedite review", urgency: "high", type: "Governance" },
  { title: "Healthcare vendor gap remediation: 6-week window shrinking", urgency: "high", type: "Schedule Risk" },
  { title: "Budget variance in Tax Modernization requires CFO review", urgency: "medium", type: "Financial" },
];

export const workloadData = applicationServices.institutionalRepository.getWorkloadData();
export const performanceData = applicationServices.institutionalRepository.getPerformanceData();
