export type InstitutionalWorkflowStep = {
  id: string;
  screen: "crm" | "projects" | "tasks" | "knowledge" | "ai-workspace" | "approvals" | "audit" | "dashboard" | "notifications";
  title: string;
  auditEvent: string;
  notification: string;
  status: "ready" | "completed" | "requires-human-review";
};

export function createInstitutionalDemoWorkflow(): InstitutionalWorkflowStep[] {
  return [
    { id: "crm-lead", screen: "crm", title: "Create stakeholder from district mission lead", auditEvent: "workflow.crm.stakeholder.created", notification: "Stakeholder intelligence updated", status: "completed" },
    { id: "project-create", screen: "projects", title: "Create oxygen resilience project", auditEvent: "workflow.project.created", notification: "Project created from stakeholder need", status: "completed" },
    { id: "task-assign", screen: "tasks", title: "Assign biomedical maintenance tasks", auditEvent: "workflow.tasks.assigned", notification: "Tasks assigned to district owners", status: "completed" },
    { id: "document-upload", screen: "knowledge", title: "Upload maintenance risk register", auditEvent: "workflow.document.uploaded", notification: "Knowledge Hub ingestion started", status: "completed" },
    { id: "rag-analysis", screen: "ai-workspace", title: "Generate cited RAG analysis", auditEvent: "workflow.rag.generated", notification: "AI analysis ready for review", status: "requires-human-review" },
    { id: "approval-request", screen: "approvals", title: "Request Mission Secretariat approval", auditEvent: "workflow.approval.requested", notification: "Approval packet queued", status: "ready" },
    { id: "human-review", screen: "ai-workspace", title: "Complete human review", auditEvent: "workflow.human_review.completed", notification: "Recommendation approved", status: "ready" },
    { id: "dashboard-update", screen: "dashboard", title: "Update executive dashboard and activity feed", auditEvent: "workflow.dashboard.updated", notification: "Portfolio metrics refreshed", status: "ready" },
  ];
}

export function workflowAuditEvents() {
  return createInstitutionalDemoWorkflow().map((step) => step.auditEvent);
}

