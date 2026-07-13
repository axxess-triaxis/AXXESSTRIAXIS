import { AlertTriangle, BarChart3, FileText, FolderKanban, ShieldCheck, Sparkles, Users } from "lucide-react";

export const executiveDemoMetrics = [
  { label: "Active projects", value: 186, detail: "12 programs under governance", icon: FolderKanban, href: "/projects" },
  { label: "Pending approvals", value: 42, detail: "7 require executive review", icon: ShieldCheck, href: "/approvals" },
  { label: "RAG sources indexed", value: "2,200", detail: "Documents and knowledge articles", icon: FileText, href: "/knowledge" },
  { label: "AI-risk items", value: 18, detail: "Human review before action", icon: Sparkles, href: "/ai-workspace" },
  { label: "SLA breaches", value: 9, detail: "Approvals and district reporting", icon: AlertTriangle, href: "/approvals" },
  { label: "Governance alerts", value: 14, detail: "Mission Secretariat queue", icon: ShieldCheck, href: "/approvals" },
  { label: "Budget variance", value: "$3.8M", detail: "Cold-chain and outreach variance", icon: BarChart3, href: "/analytics" },
  { label: "Stakeholder follow-ups", value: 27, detail: "Next actions in CRM", icon: Users, href: "/stakeholders" },
];

export const analyticsDemoInsights = [
  "Oxygen resilience spending is 7 percent above benchmark because biomedical maintenance is front-loaded in Dibrugarh.",
  "Approval cycle time improves by 18 percent when AI-prepared briefing packets include source citations and owner history.",
  "Stakeholder engagement dropped in two hill-district reviews; the Mission Secretariat should schedule relationship follow-up.",
  "Knowledge capture is strongest where district review notes are linked to tasks, approvals, and audit events.",
];
