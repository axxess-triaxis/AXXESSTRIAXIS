import { AlertTriangle, FolderKanban, ShieldCheck, Sparkles } from "lucide-react";
import { demoRepositories } from "../../demo/demoRepositories";
import { demoUserContext } from "../../demo/demoMode";
import { applicationServices } from "../../providers/serviceProvider";
import {
  ownerInitialsForProject,
  projectDepartment,
  tenantScopeFromUser,
} from "../../repositories/supabaseEnterpriseRepositories";
import type { UserContext } from "../../security/rbac";
import type { TenantScope } from "../../repositories/interfaces";
import type { DashboardKpi } from "./types";

const demoDashboardScope: TenantScope = {
  organizationId: demoUserContext.organizationId,
  userId: demoUserContext.id,
  role: demoUserContext.role,
};

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

export function getDashboardFallbackProjects() {
  return demoRepositories.institutionalRepository.getProjects();
}

export function getDashboardFallbackKpis(): DashboardKpi[] {
  const projects = demoRepositories.institutionalRepository.getProjects();
  const approvals = demoRepositories.institutionalRepository.getApprovals();
  const tasks = demoRepositories.institutionalRepository.getTasks();
  const atRiskCount = projects.filter((project) => project.risk === "high" || project.risk === "urgent" || project.status === "At Risk").length;

  return [
    { label: "Active Projects", value: String(projects.length), delta: "+18", trend: "up", icon: FolderKanban, color: "#8B1E2D", sentiment: "positive" },
    { label: "At-Risk Items", value: String(atRiskCount + tasks.filter((task) => task.priority === "urgent").length), delta: "-7", trend: "down", icon: AlertTriangle, color: "#C9A227", sentiment: "positive" },
    { label: "Pending Approvals", value: String(approvals.filter((approval) => approval.status !== "Completed").length), delta: "-5", trend: "up", icon: ShieldCheck, color: "#2C4A7C", sentiment: "positive" },
    { label: "RAG Sources Indexed", value: "2,200", delta: "+1,976", trend: "up", icon: Sparkles, color: "#1A6B4A", sentiment: "positive" },
  ];
}

export async function getDashboardProjects(scope: TenantScope) {
  try {
    const [projectRecords, programRecords, userRecords] = await Promise.all([
      applicationServices.projectsRepository.list(scope),
      applicationServices.programsRepository.list(scope),
      applicationServices.usersRepository.listByOrganization(scope),
    ]);

    if (projectRecords.length === 0) return getDashboardFallbackProjects();

    return projectRecords.map((project, index) => ({
      id: index + 1,
      name: project.name,
      dept: projectDepartment(project, programRecords),
      progress: project.progress,
      risk: project.riskLevel,
      owner: ownerInitialsForProject(project, userRecords),
      dueDate: project.dueDate?.slice(0, 10) ?? "2026-12-31",
      status: statusLabel(project.status),
      budget: index === 0 ? "$12.4M" : index === 1 ? "$34.6M" : "$19.1M",
      spent: index === 0 ? "$8.2M" : index === 1 ? "$14.8M" : "$10.5M",
    }));
  } catch {
    return getDashboardFallbackProjects();
  }
}

export async function getDashboardKpis(scope: TenantScope): Promise<DashboardKpi[]> {
  try {
    const [scopedProjects, scopedTasks] = await Promise.all([
      applicationServices.projectsRepository.list(scope),
      applicationServices.tasksRepository.list(scope),
    ]);
    if (scopedProjects.length === 0) return getDashboardFallbackKpis();
    const atRiskCount = scopedProjects.filter((project) => project.riskLevel === "high" || project.riskLevel === "urgent" || project.status === "at-risk").length;
    const approvals = demoRepositories.institutionalRepository.getApprovals();

    return [
      { label: "Active Projects", value: String(scopedProjects.length), delta: "+18", trend: "up", icon: FolderKanban, color: "#8B1E2D", sentiment: "positive" },
      { label: "At-Risk Items", value: String(atRiskCount + scopedTasks.filter((task) => task.priority === "urgent").length), delta: "-7", trend: "down", icon: AlertTriangle, color: "#C9A227", sentiment: "positive" },
      { label: "Pending Approvals", value: String(approvals.filter((approval) => approval.status !== "Completed").length), delta: "-5", trend: "up", icon: ShieldCheck, color: "#2C4A7C", sentiment: "positive" },
      { label: "RAG Sources Indexed", value: "2,200", delta: "+1,976", trend: "up", icon: Sparkles, color: "#1A6B4A", sentiment: "positive" },
    ];
  } catch {
    return getDashboardFallbackKpis();
  }
}

export const dashboardObjectives = [
  { name: "Primary Care Access Coverage", progress: 86, target: 92 },
  { name: "Maternal Referral Turnaround", progress: 79, target: 88 },
  { name: "District Stockout Reduction", progress: 92, target: 95 },
  { name: "Audit-Ready Knowledge Capture", progress: 88, target: 90 },
];

export const dashboardAiRecommendations = [
  { title: "Escalate oxygen concentrator maintenance variance in Dibrugarh and Cachar", urgency: "urgent", type: "Risk Mitigation" },
  { title: "5 approval packets exceed district SLA threshold; route to Mission Secretariat", urgency: "high", type: "Governance" },
  { title: "Maternal referral handoff gap detected across two hill-district corridors", urgency: "high", type: "Schedule Risk" },
  { title: "Procurement variance in cold-chain upgrade requires Finance & Grants review", urgency: "medium", type: "Financial" },
];

export const governanceAlerts = [
  { label: "Governance Alerts", value: "14", detail: "5 require Mission Secretariat review" },
  { label: "SLA Breaches", value: "9", detail: "Approvals and district reporting" },
  { label: "Budget Variance", value: "$3.8M", detail: "Cold-chain, oxygen and outreach workstreams" },
];

export const workloadData = demoRepositories.institutionalRepository.getWorkloadData();
export const performanceData = demoRepositories.institutionalRepository.getPerformanceData();
export const dashboardFallbackScope = demoDashboardScope;
