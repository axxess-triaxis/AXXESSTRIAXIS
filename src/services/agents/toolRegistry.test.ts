import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  documents: [] as unknown[],
  knowledgeArticles: [] as unknown[],
  documentPermissions: [] as unknown[],
  taskInsertResponse: [] as unknown[],
  projects: [] as unknown[],
  meetings: [] as unknown[],
  stakeholders: [] as unknown[],
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
    if (table === "meetings") return state.meetings;
    if (table === "stakeholders") return state.stakeholders;
    return undefined;
  },
}));

const routeAiRequestMock = vi.fn();
vi.mock("../ai/router/aiRouter", () => ({
  routeAiRequest: (...args: unknown[]) => routeAiRequestMock(...args),
}));

import { agentToolRegistry, getAgentTool } from "./toolRegistry";
import type { AgentScope } from "../../security/agentScope";

const scope: AgentScope = {
  organizationId: "org-1",
  agentConnectionId: "conn-1",
  provider: "anthropic",
  capabilities: ["create_task", "query_knowledge_hub", "list_projects", "create_meeting", "create_project", "list_stakeholders", "create_stakeholder", "query_external_model"],
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
    state.meetings = [];
    state.stakeholders = [];
    state.calls = [];
    routeAiRequestMock.mockReset();
    vi.clearAllMocks();
  });

  it("registers exactly the 3 Phase 1 tools (auto) plus the 5 Phase 2 tools (critical, except list_stakeholders)", () => {
    expect(agentToolRegistry.map((tool) => tool.name).sort()).toEqual([
      "create_meeting", "create_project", "create_stakeholder", "create_task",
      "list_projects", "list_stakeholders", "query_external_model", "query_knowledge_hub",
    ]);
    expect(getAgentTool("nonexistent")).toBeUndefined();

    const autoTools = ["create_task", "query_knowledge_hub", "list_projects", "list_stakeholders"];
    const criticalTools = ["create_meeting", "create_project", "create_stakeholder", "query_external_model"];
    for (const name of autoTools) expect(getAgentTool(name)?.criticality).toBe("auto");
    for (const name of criticalTools) expect(getAgentTool(name)?.criticality).toBe("critical");

    for (const tool of agentToolRegistry) {
      expect(tool.requiredCapability).toBe(tool.name);
    }
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

  it("create_meeting rejects a missing title/startsAt without hitting Supabase", async () => {
    const result = await getAgentTool("create_meeting")!.handler(scope, { title: "Kickoff" });
    expect(result.isError).toBe(true);
    expect(state.calls).toHaveLength(0);
  });

  it("create_meeting inserts a real meeting row, organization-scoped, honest empty defaults, attributed to the issuing admin", async () => {
    state.meetings = [{
      id: "meeting-1", organization_id: "org-1", project_id: null, program_id: null, stakeholder_id: null,
      title: "Pilot kickoff", starts_at: "2026-08-01T10:00:00.000Z", ends_at: null,
      attendee_ids: [], agenda: null, notes: null, decisions: [], action_items: [], status: "scheduled",
    }];

    const result = await getAgentTool("create_meeting")!.handler(scope, { title: "Pilot kickoff", startsAt: "2026-08-01T10:00:00.000Z" });

    expect(result.isError).toBeUndefined();
    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(state.calls[0].table).toBe("meetings");
    expect(body.organization_id).toBe("org-1");
    expect(body.status).toBe("scheduled");
    expect(body.decisions).toEqual([]);
    expect(body.created_by_user_id).toBe("user-1");
    expect(resultJson(result).id).toBe("meeting-1");
  });

  it("create_project rejects a missing name without hitting Supabase", async () => {
    const result = await getAgentTool("create_project")!.handler(scope, {});
    expect(result.isError).toBe(true);
    expect(state.calls).toHaveLength(0);
  });

  it("create_project inserts a real project row with honest starting defaults (progress 0, status planning)", async () => {
    state.projects = [{
      id: "proj-2", organization_id: "org-1", program_id: null, name: "Barpeta rollout",
      description: null, owner_id: "user-1", progress: 0, risk_level: "medium", priority: "medium",
      status: "planning", start_date: null, due_date: null, tags: [],
    }];

    const result = await getAgentTool("create_project")!.handler(scope, { name: "Barpeta rollout" });

    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(state.calls[0].table).toBe("projects");
    expect(body.progress).toBe(0);
    expect(body.status).toBe("planning");
    expect(body.owner_id).toBe("user-1");
    expect(resultJson(result).id).toBe("proj-2");
  });

  it("list_stakeholders reads only the caller's organization", async () => {
    state.stakeholders = [{ id: "sh-1", organization_id: "org-1", name: "Dr. Purnima Bora", affiliation: "Mission Secretariat", relationship_owner_id: null, influence_score: 0, engagement_level: "unrated" }];

    const result = await getAgentTool("list_stakeholders")!.handler(scope, {});

    const query = state.calls[0].options.query as URLSearchParams;
    expect(query.get("organization_id")).toBe("eq.org-1");
    const stakeholders = resultJson(result) as unknown as Array<{ name: string }>;
    expect(stakeholders[0].name).toBe("Dr. Purnima Bora");
  });

  it("create_stakeholder rejects a missing name without hitting Supabase", async () => {
    const result = await getAgentTool("create_stakeholder")!.handler(scope, {});
    expect(result.isError).toBe(true);
    expect(state.calls).toHaveLength(0);
  });

  it("create_stakeholder defaults to honest unrated/zero-influence, never a fabricated mid-point", async () => {
    state.stakeholders = [{ id: "sh-2", organization_id: "org-1", name: "New Contact", affiliation: null, relationship_owner_id: "user-1", influence_score: 0, engagement_level: "unrated" }];

    await getAgentTool("create_stakeholder")!.handler(scope, { name: "New Contact" });

    const body = state.calls[0].options.body as Record<string, unknown>;
    expect(body.influence_score).toBe(0);
    expect(body.engagement_level).toBe("unrated");
  });

  it("query_external_model rejects a missing prompt without calling routeAiRequest", async () => {
    const result = await getAgentTool("query_external_model")!.handler(scope, {});
    expect(result.isError).toBe(true);
    expect(routeAiRequestMock).not.toHaveBeenCalled();
  });

  it("query_external_model reuses the real routeAiRequest, no new AI-calling code", async () => {
    routeAiRequestMock.mockResolvedValue({ answer: "42", providerUsed: "kimi", humanReviewRequired: false });

    const result = await getAgentTool("query_external_model")!.handler(scope, { prompt: "What is the answer?" });

    expect(routeAiRequestMock).toHaveBeenCalledWith(expect.objectContaining({
      prompt: "What is the answer?",
      context: expect.objectContaining({ organizationId: "org-1", userId: "user-1", userRole: "Organization Admin" }),
    }));
    expect(resultJson(result).answer).toBe("42");
  });
});
