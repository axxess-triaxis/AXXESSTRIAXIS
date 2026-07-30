import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  documents: [] as unknown[],
  knowledgeArticles: [] as unknown[],
  documentPermissions: [] as unknown[],
  taskInsertResponse: [] as unknown[],
  projects: [] as unknown[],
  calls: [] as Array<{ table: string; options: Record<string, unknown> }>,
};

vi.mock("../../repositories/supabaseAdmin", () => ({
  isSupabaseAdminConfigured: () => true,
  supabaseAdminRest: async (table: string, options: Record<string, unknown>) => {
    state.calls.push({ table, options });
    if (table === "documents") return state.documents;
    if (table === "knowledge_articles") return state.knowledgeArticles;
    if (table === "document_permissions") return state.documentPermissions;
    if (table === "tasks") return state.taskInsertResponse;
    if (table === "projects") return state.projects;
    return undefined;
  },
}));

import { agentToolRegistry, getAgentTool } from "./toolRegistry";
import type { AgentScope } from "../../security/agentScope";

const scope: AgentScope = {
  organizationId: "org-1",
  agentConnectionId: "conn-1",
  provider: "anthropic",
  capabilities: ["create_task", "query_knowledge_hub", "list_projects"],
  issuedByUserId: "user-1",
  issuedByRole: "Organization Admin",
};

function resultJson(result: { content: Array<{ type: string; text: string }> }) {
  return JSON.parse(result.content[0].text) as Record<string, unknown>;
}

describe("agentToolRegistry", () => {
  afterEach(() => {
    state.documents = [];
    state.knowledgeArticles = [];
    state.documentPermissions = [];
    state.taskInsertResponse = [];
    state.projects = [];
    state.calls = [];
    vi.clearAllMocks();
  });

  it("registers exactly the 3 Phase 1 tools with matching required capabilities", () => {
    expect(agentToolRegistry.map((tool) => tool.name).sort()).toEqual(["create_task", "list_projects", "query_knowledge_hub"]);
    expect(getAgentTool("create_task")?.requiredCapability).toBe("create_task");
    expect(getAgentTool("query_knowledge_hub")?.requiredCapability).toBe("query_knowledge_hub");
    expect(getAgentTool("list_projects")?.requiredCapability).toBe("list_projects");
    expect(getAgentTool("nonexistent")).toBeUndefined();
  });

  it("create_task rejects a missing title without hitting Supabase", async () => {
    const result = await getAgentTool("create_task")!.handler(scope, {});
    expect(result.isError).toBe(true);
    expect(state.calls).toHaveLength(0);
  });

  it("create_task inserts a real task row, organization-scoped, attributed to the connection's issuing admin (not fabricated)", async () => {
    state.taskInsertResponse = [{
      id: "task-1", organization_id: "org-1", program_id: null, project_id: null,
      title: "Follow up with Dibrugarh vendor", description: null, assignee_id: null,
      priority: "medium", status: "pending", due_date: null, tags: [],
    }];

    const result = await getAgentTool("create_task")!.handler(scope, { title: "Follow up with Dibrugarh vendor" });

    expect(result.isError).toBeUndefined();
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(state.calls[0].table).toBe("tasks");
    expect(body.organization_id).toBe("org-1");
    expect(body.created_by_user_id).toBe("user-1");
    expect(body.owner_role).toBe("Organization Admin");
    expect(resultJson(result).id).toBe("task-1");
  });

  it("create_task falls back to Organization Admin ownership only when the connection genuinely has no issuing user recorded", async () => {
    state.taskInsertResponse = [{
      id: "task-2", organization_id: "org-1", program_id: null, project_id: null,
      title: "t", description: null, assignee_id: null, priority: "medium", status: "pending",
      due_date: null, tags: [],
    }];
    const scopeWithNoIssuer: AgentScope = { ...scope, issuedByUserId: undefined, issuedByRole: undefined };

    await getAgentTool("create_task")!.handler(scopeWithNoIssuer, { title: "t" });

    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.created_by_user_id).toBeNull();
    expect(body.owner_role).toBe("Organization Admin");
  });

  it("list_projects reads only the caller's organization and clamps an over-large limit to 100", async () => {
    state.projects = [];
    await getAgentTool("list_projects")!.handler(scope, { limit: 500 });

    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-1");
    expect(query.get("limit")).toBe("100");
  });

  it("list_projects maps rows to real Project shapes", async () => {
    state.projects = [{
      id: "proj-1", organization_id: "org-1", program_id: null, name: "NE Health Mission Rollout",
      description: null, owner_id: "user-1", progress: 40, risk_level: "medium", priority: "high",
      status: "in-progress", start_date: null, due_date: "2026-08-01", tags: [],
    }];
    const result = await getAgentTool("list_projects")!.handler(scope, {});
    const projects = resultJson(result) as unknown as Array<{ id: string; name: string; progress: number }>;
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("NE Health Mission Rollout");
    expect(projects[0].progress).toBe(40);
  });

  it("query_knowledge_hub rejects a missing question without hitting Supabase", async () => {
    const result = await getAgentTool("query_knowledge_hub")!.handler(scope, {});
    expect(result.isError).toBe(true);
    expect(state.calls).toHaveLength(0);
  });

  it("query_knowledge_hub reuses answerWithGovernedRag's real retrieval -- a matching org-scoped document is cited as a source", async () => {
    state.documents = [{
      id: "doc-1", organization_id: "org-1", project_id: null, category_id: null,
      name: "oxygen-resilience-plan.pdf", title: "Oxygen resilience plan", description: "Barpeta district oxygen resilience implementation plan",
      storage_path: "org-1/doc-1", file_name: "oxygen-resilience-plan.pdf", file_size: 1024,
      mime_type: "application/pdf", document_type: "pdf", status: "active", visibility: "organization",
      classification: "internal", owner_user_id: "user-1", created_by_user_id: "user-1",
      updated_by_user_id: null, current_version: 1, tags: ["oxygen", "barpeta"],
      created_at: "2026-07-01T00:00:00.000Z", updated_at: "2026-07-01T00:00:00.000Z",
      archived_at: null, deleted_at: null, category: null,
    }];

    const result = await getAgentTool("query_knowledge_hub")!.handler(scope, { question: "What is the Barpeta oxygen resilience plan?" });

    expect(result.isError).toBeUndefined();
    const answer = resultJson(result) as { sources: Array<{ sourceId: string }>; humanReviewRequired: boolean };
    expect(answer.sources.some((source) => source.sourceId === "doc-1")).toBe(true);
    expect(state.calls.some((call) => call.table === "documents" && (call.options.query as URLSearchParams).get("organization_id") === "eq.org-1")).toBe(true);
  });

  it("query_knowledge_hub honestly reports no source and requires human review when nothing matches", async () => {
    state.documents = [];
    state.knowledgeArticles = [];
    const result = await getAgentTool("query_knowledge_hub")!.handler(scope, { question: "unrelated question about nothing on file" });
    const answer = resultJson(result) as { sources: unknown[]; humanReviewRequired: boolean };
    expect(answer.sources).toHaveLength(0);
    expect(answer.humanReviewRequired).toBe(true);
  });
});
