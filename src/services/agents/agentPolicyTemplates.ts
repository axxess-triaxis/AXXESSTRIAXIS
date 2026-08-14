import { allAgentCapabilities, type AgentCapability } from "../../security/agentScope";

// MCP3-2 (2026-08-14): named, admin-facing capability bundles a new agent profile can start from
// instead of hand-picking individual tool checkboxes. Purely a UI/creation-time convenience over
// the existing capability model -- these are not a new authorization layer, and every capability
// named here must already exist in allAgentCapabilities (enforced by this file's own test). A
// profile created "from" a template just copies its capabilities array into
// agent_profiles.default_capabilities at creation time; nothing here is enforced at call time.

export type AgentPolicyTemplateId =
  | "read_only_analyst"
  | "workflow_assistant"
  | "project_coordinator"
  | "crm_assistant"
  | "governance_reviewer";

export type AgentPolicyTemplate = {
  id: AgentPolicyTemplateId;
  label: string;
  description: string;
  capabilities: AgentCapability[];
};

export const agentPolicyTemplates: AgentPolicyTemplate[] = [
  {
    id: "read_only_analyst",
    label: "Read-only analyst",
    description: "Can query and summarize institutional data across the tenant, but cannot create, update, or notify anything.",
    capabilities: [
      "query_knowledge_hub",
      "list_projects",
      "list_tasks",
      "list_meetings",
      "list_documents",
      "get_dashboard_snapshot",
      "list_stakeholders",
      "search_audit_logs",
    ],
  },
  {
    id: "workflow_assistant",
    label: "Workflow assistant",
    description: "Helps run day-to-day task workflows -- can create and update tasks, and read the surrounding project/meeting context.",
    capabilities: [
      "create_task",
      "update_task_status",
      "list_tasks",
      "list_projects",
      "list_meetings",
      "query_knowledge_hub",
    ],
  },
  {
    id: "project_coordinator",
    label: "Project coordinator",
    description: "Can stand up new projects and meetings and keep their task lists moving, with dashboard visibility.",
    capabilities: [
      "create_project",
      "create_meeting",
      "list_projects",
      "list_meetings",
      "list_tasks",
      "create_task",
      "get_dashboard_snapshot",
    ],
  },
  {
    id: "crm_assistant",
    label: "CRM assistant",
    description: "Manages stakeholder relationship records -- can add contacts and notes, and read the knowledge base for context.",
    capabilities: [
      "list_stakeholders",
      "create_stakeholder",
      "add_stakeholder_note",
      "query_knowledge_hub",
    ],
  },
  {
    id: "governance_reviewer",
    label: "Governance reviewer",
    description: "Read-heavy oversight role for audit and compliance review -- audit log search plus program/task/knowledge visibility.",
    capabilities: [
      "search_audit_logs",
      "get_dashboard_snapshot",
      "list_projects",
      "list_tasks",
      "query_knowledge_hub",
    ],
  },
];

export function getAgentPolicyTemplate(id: string): AgentPolicyTemplate | undefined {
  return agentPolicyTemplates.find((template) => template.id === id);
}

export function isAgentPolicyTemplateId(value: unknown): value is AgentPolicyTemplateId {
  return typeof value === "string" && agentPolicyTemplates.some((template) => template.id === value);
}

export const allAgentPolicyCapabilitiesAreKnown = agentPolicyTemplates.every((template) =>
  template.capabilities.every((capability) => allAgentCapabilities.includes(capability)),
);
