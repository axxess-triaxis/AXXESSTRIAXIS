import { AlertTriangle, FolderKanban, ShieldCheck, Sparkles } from "lucide-react";
import { applicationServices } from "../../providers/serviceProvider";
import type { DashboardKpi } from "./types";

export const dashboardKpis: DashboardKpi[] = [
  { label: "Active Projects", value: "47", delta: "+3", trend: "up", icon: FolderKanban, color: "#8B1E2D", sentiment: "positive" },
  { label: "At-Risk Items", value: "8", delta: "+2", trend: "down", icon: AlertTriangle, color: "#C9A227", sentiment: "negative" },
  { label: "Pending Approvals", value: "23", delta: "-5", trend: "up", icon: ShieldCheck, color: "#2C4A7C", sentiment: "positive" },
  { label: "AI Actions Queued", value: "156", delta: "+41", trend: "up", icon: Sparkles, color: "#1A6B4A", sentiment: "positive" },
];

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
export const projects = applicationServices.institutionalRepository.getProjects();
