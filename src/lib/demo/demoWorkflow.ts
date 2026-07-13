import type { NavSection } from "../../app/navigation";

export type GuidedDemoStep = {
  id: string;
  section: NavSection;
  title: string;
  description: string;
  cta: string;
  proof: string;
};

export const guidedDemoSteps: GuidedDemoStep[] = [
  {
    id: "executive-dashboard",
    section: "dashboard",
    title: "Executive command view",
    description: "Start with tenant scope, beta status, risk, approvals, budget variance, and recent activity.",
    cta: "View executive risk",
    proof: "The dashboard answers what is live, what is demo-seeded, and what needs action.",
  },
  {
    id: "knowledge-source",
    section: "knowledge",
    title: "Governed institutional memory",
    description: "Open a mission document, inspect metadata, permissions, version posture, and RAG readiness.",
    cta: "Open Knowledge Hub",
    proof: "Documents are categorized for permission-aware retrieval rather than passive storage.",
  },
  {
    id: "ai-answer",
    section: "ai-workspace",
    title: "Ask governed AI",
    description: "Ask a risk question and review cited sources, confidence, router status, audit ID, and human review flags.",
    cta: "Ask AI Workspace",
    proof: "The AI flow shows RAG, source citations, and auditability instead of a generic chatbot.",
  },
  {
    id: "task-created",
    section: "tasks",
    title: "Create operational follow-through",
    description: "Turn an AI answer into a task with owner, project, priority, due date, and linked workflow context.",
    cta: "Create follow-up task",
    proof: "AXXESS converts intelligence into accountable execution.",
  },
  {
    id: "approval-review",
    section: "approvals",
    title: "Human-in-the-loop governance",
    description: "Route a decision for approval, capture machine recommendation, require human review, and write audit evidence.",
    cta: "Review approval queue",
    proof: "The 80 percent machine, 20 percent human, 100 percent trust principle is visible in the UI.",
  },
  {
    id: "analytics-updated",
    section: "analytics",
    title: "Analytics and briefing",
    description: "Close with updated OKRs, cycle time, risk distribution, budget utilization, and export/report CTAs.",
    cta: "Review analytics",
    proof: "The walkthrough ends with executive evidence and conversion actions.",
  },
];

export function firstGuidedDemoStep() {
  return guidedDemoSteps[0];
}

export function guidedDemoStepForSection(section: NavSection) {
  return guidedDemoSteps.find((step) => step.section === section) ?? firstGuidedDemoStep();
}

export function guidedDemoStepIndex(stepId: string) {
  return Math.max(0, guidedDemoSteps.findIndex((step) => step.id === stepId));
}

export function nextGuidedDemoStep(stepId: string) {
  const index = guidedDemoStepIndex(stepId);
  return guidedDemoSteps[Math.min(index + 1, guidedDemoSteps.length - 1)];
}

export function previousGuidedDemoStep(stepId: string) {
  const index = guidedDemoStepIndex(stepId);
  return guidedDemoSteps[Math.max(index - 1, 0)];
}
