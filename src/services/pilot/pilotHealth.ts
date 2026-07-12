export const pilotReadinessSteps = [
  { id: "organization", label: "Confirm organization", weight: 10 },
  { id: "invite_team_member", label: "Invite pilot team", weight: 10 },
  { id: "role_assignment", label: "Assign roles", weight: 10 },
  { id: "first_project", label: "Create first project", weight: 12 },
  { id: "upload_document", label: "Upload first document", weight: 10 },
  { id: "first_ai_question", label: "Ask first AI/RAG question", weight: 12 },
  { id: "first_task", label: "Create first task", weight: 8 },
  { id: "first_approval", label: "Request first approval", weight: 10 },
  { id: "view_audit_trail", label: "View audit trail", weight: 10 },
  { id: "send_feedback", label: "Send feedback / request support", weight: 8 },
] as const;

export type PilotStepId = typeof pilotReadinessSteps[number]["id"];
export type PilotEventType = "step_completed" | "step_reopened" | "pilot_interest_captured";

export type PilotReadinessEvent = {
  id: string;
  organizationId: string;
  userId?: string;
  stepId: PilotStepId;
  eventType: PilotEventType;
  source: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
};

export type PilotHealthStatus = "Needs setup" | "At risk" | "On track" | "Pilot-ready";

export type PilotHealthScore = {
  score: number;
  status: PilotHealthStatus;
  completedSteps: number;
  totalSteps: number;
  completionPercent: number;
  lastActivityAt?: string;
  completedStepIds: PilotStepId[];
  missingStepIds: PilotStepId[];
  recommendations: string[];
};

export function createDemoPilotReadinessEvents(organizationId = "org_north_east_health_mission"): PilotReadinessEvent[] {
  const now = Date.now();
  return pilotReadinessSteps.slice(0, 8).map((step, index) => ({
    id: `pilot_demo_event_${index + 1}`,
    organizationId,
    userId: "user_demo_executive",
    stepId: step.id,
    eventType: "step_completed",
    source: index < 2 ? "admin" : "web",
    metadata: { demo_seed: true, sprint: 18 },
    createdAt: new Date(now - (8 - index) * 1000 * 60 * 60 * 8).toISOString(),
  }));
}

export function computePilotHealth(events: PilotReadinessEvent[]): PilotHealthScore {
  const completedStepIds = pilotReadinessSteps
    .filter((step) => events.some((event) => event.stepId === step.id && event.eventType === "step_completed"))
    .map((step) => step.id);
  const missingStepIds = pilotReadinessSteps
    .filter((step) => !completedStepIds.includes(step.id))
    .map((step) => step.id);
  const weightedScore = pilotReadinessSteps.reduce((score, step) => score + (completedStepIds.includes(step.id) ? step.weight : 0), 0);
  const latestEvent = [...events].sort((left, right) => right.createdAt.localeCompare(left.createdAt))[0];
  const recencyBonus = latestEvent && Date.now() - new Date(latestEvent.createdAt).getTime() < 1000 * 60 * 60 * 24 * 14 ? 5 : 0;
  const score = Math.min(100, Math.round(weightedScore + recencyBonus));
  const completionPercent = Math.round((completedStepIds.length / pilotReadinessSteps.length) * 100);
  const status: PilotHealthStatus = score >= 85
    ? "Pilot-ready"
    : score >= 60
      ? "On track"
      : score >= 30
        ? "At risk"
        : "Needs setup";

  const recommendations = missingStepIds.slice(0, 3).map((stepId) => {
    const step = pilotReadinessSteps.find((item) => item.id === stepId);
    return step ? `Complete: ${step.label}` : "Complete remaining pilot step";
  });

  return {
    score,
    status,
    completedSteps: completedStepIds.length,
    totalSteps: pilotReadinessSteps.length,
    completionPercent,
    lastActivityAt: latestEvent?.createdAt,
    completedStepIds,
    missingStepIds,
    recommendations: recommendations.length ? recommendations : ["Schedule sponsor conversion review"],
  };
}
