import { supabaseAdminRest } from "../../repositories/supabaseAdmin";
import type { TenantScope, DocumentsRepository, DocumentPermissionsRepository, KnowledgeArticlesRepository } from "../../repositories/interfaces";
import type { Document, DocumentPermission, KnowledgeArticle, Meeting, Project, Stakeholder, Task } from "../../domain";
import { answerWithGovernedRag } from "../rag/governedRag";
import { routeAiRequest } from "../ai/router/aiRouter";
import type { AgentCapability, AgentScope } from "../../security/agentScope";

export type McpToolContent = { type: "text"; text: string };
export type McpToolResult = { content: McpToolContent[]; isError?: boolean };

export type McpToolDefinition = {
  name: string;
  description: string;
  requiredCapability: AgentCapability;
  // Agentic Infrastructure Phase 2 (2026-07-30): "auto" executes immediately (Phase 1's elevated
  // access, unchanged). "critical" is gated by src/app/api/agents/mcp/route.ts -- it only
  // executes if an active src/services/agents/agentGrantsRepository.ts grant already exists for
  // this connection+tool; otherwise a real approval_requests row is created and the call returns
  // pending instead of running.
  criticality: "auto" | "critical";
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
  handler: (scope: AgentScope, args: Record<string, unknown>) => Promise<McpToolResult>;
};

function textResult(payload: unknown): McpToolResult {
  return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
}

function notImplemented(method: string): never {
  throw new Error(`${method} is not supported by the read-only agent knowledge adapter.`);
}

// query_knowledge_hub reuses answerWithGovernedRag's real retrieval/scoring/confidence logic
// (src/services/rag/governedRag.ts) unchanged -- only the I/O layer differs from a human session:
// resourceRepositories' list() falls back to either a Supabase user access token or a
// cookie-authenticated gateway fetch, neither of which an inbound API-key-authenticated agent
// call has. This adapter satisfies the same DocumentsRepository/KnowledgeArticlesRepository/
// DocumentPermissionsRepository interfaces read directly via the service role instead, scoped to
// the agent connection's own organization_id. Only .list() is ever called by governedRag; the
// mutation methods the full interfaces require are intentionally left unimplemented.
type DocumentRow = {
  id: string; organization_id: string; project_id: string | null; category_id: string | null;
  name: string; title: string | null; description: string | null; storage_path: string;
  file_name: string | null; file_size: number | null; mime_type: string; document_type: string | null;
  status: string | null; visibility: string | null; classification: string | null;
  owner_user_id: string | null; created_by_user_id: string | null; updated_by_user_id: string | null;
  current_version: number | null; tags: string[] | null; created_at: string; updated_at: string;
  archived_at: string | null; deleted_at: string | null; category: { name: string } | null;
};

function mapDocumentRow(row: DocumentRow): Document {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    categoryId: row.category_id ?? undefined,
    categoryName: row.category?.name ?? undefined,
    name: row.name,
    title: row.title ?? row.name,
    description: row.description ?? undefined,
    storagePath: row.storage_path,
    fileName: row.file_name ?? row.name,
    fileSize: row.file_size === null ? undefined : Number(row.file_size),
    mimeType: row.mime_type,
    documentType: (row.document_type ?? "unknown") as Document["documentType"],
    status: (row.status ?? "active") as Document["status"],
    visibility: (row.visibility ?? "organization") as Document["visibility"],
    classification: (row.classification ?? "internal") as Document["classification"],
    ownerId: row.owner_user_id ?? undefined,
    createdByUserId: row.created_by_user_id ?? undefined,
    updatedByUserId: row.updated_by_user_id ?? undefined,
    currentVersion: row.current_version === null ? undefined : Number(row.current_version),
    tags: row.tags ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? undefined,
    deletedAt: row.deleted_at ?? undefined,
  };
}

type KnowledgeArticleRow = {
  id: string; organization_id: string; title: string; body_markdown: string; summary: string | null;
  status: string; category_id: string | null; author_user_id: string | null; tags: string[] | null;
  published_at: string | null; archived_at: string | null; created_at: string; updated_at: string;
  category: { name: string } | null;
};

function mapKnowledgeArticleRow(row: KnowledgeArticleRow): KnowledgeArticle {
  return {
    id: row.id,
    organizationId: row.organization_id,
    title: row.title,
    bodyMarkdown: row.body_markdown,
    summary: row.summary ?? undefined,
    status: row.status as KnowledgeArticle["status"],
    categoryId: row.category_id ?? undefined,
    categoryName: row.category?.name ?? undefined,
    authorUserId: row.author_user_id ?? "",
    tags: row.tags ?? [],
    publishedAt: row.published_at ?? undefined,
    archivedAt: row.archived_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

type DocumentPermissionRow = {
  id: string; organization_id: string; document_id: string; principal_type: string;
  principal_id: string | null; access_level: string; created_by_user_id: string | null;
  expires_at: string | null; created_at: string;
};

function mapDocumentPermissionRow(row: DocumentPermissionRow): DocumentPermission {
  return {
    id: row.id,
    organizationId: row.organization_id,
    documentId: row.document_id,
    principalType: row.principal_type as DocumentPermission["principalType"],
    principalId: row.principal_id ?? undefined,
    accessLevel: row.access_level as DocumentPermission["accessLevel"],
    createdByUserId: row.created_by_user_id ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    createdAt: row.created_at,
  };
}

function agentRagRepositories(organizationId: string) {
  const documentsRepository = {
    async list() {
      const rows = await supabaseAdminRest<DocumentRow[]>("documents", {
        query: new URLSearchParams({
          select: "id,organization_id,project_id,category_id,name,title,description,storage_path,file_name,file_size,mime_type,document_type,status,visibility,classification,owner_user_id,created_by_user_id,updated_by_user_id,current_version,tags,created_at,updated_at,archived_at,deleted_at,category:document_categories(name)",
          organization_id: `eq.${organizationId}`,
          limit: "2500",
        }),
      });
      return (rows ?? []).map(mapDocumentRow);
    },
    getById: () => notImplemented("documentsRepository.getById"),
    create: () => notImplemented("documentsRepository.create"),
    update: () => notImplemented("documentsRepository.update"),
    archive: () => notImplemented("documentsRepository.archive"),
    restore: () => notImplemented("documentsRepository.restore"),
    softDelete: () => notImplemented("documentsRepository.softDelete"),
    listArchived: () => notImplemented("documentsRepository.listArchived"),
    listFavorites: () => notImplemented("documentsRepository.listFavorites"),
    listSharedWithMe: () => notImplemented("documentsRepository.listSharedWithMe"),
    recordActivity: () => notImplemented("documentsRepository.recordActivity"),
  } satisfies DocumentsRepository;

  const knowledgeArticlesRepository = {
    async list() {
      const rows = await supabaseAdminRest<KnowledgeArticleRow[]>("knowledge_articles", {
        query: new URLSearchParams({
          select: "id,organization_id,title,body_markdown,summary,status,category_id,author_user_id,tags,published_at,archived_at,created_at,updated_at,category:document_categories(name)",
          organization_id: `eq.${organizationId}`,
          limit: "500",
        }),
      });
      return (rows ?? []).map(mapKnowledgeArticleRow);
    },
    getById: () => notImplemented("knowledgeArticlesRepository.getById"),
    create: () => notImplemented("knowledgeArticlesRepository.create"),
    update: () => notImplemented("knowledgeArticlesRepository.update"),
  } satisfies KnowledgeArticlesRepository;

  const documentPermissionsRepository = {
    async list() {
      const rows = await supabaseAdminRest<DocumentPermissionRow[]>("document_permissions", {
        query: new URLSearchParams({
          select: "id,organization_id,document_id,principal_type,principal_id,access_level,created_by_user_id,expires_at,created_at",
          organization_id: `eq.${organizationId}`,
          limit: "1000",
        }),
      });
      return (rows ?? []).map(mapDocumentPermissionRow);
    },
    getById: () => notImplemented("documentPermissionsRepository.getById"),
    create: () => notImplemented("documentPermissionsRepository.create"),
    update: () => notImplemented("documentPermissionsRepository.update"),
  } satisfies DocumentPermissionsRepository;

  return { documentsRepository, knowledgeArticlesRepository, documentPermissionsRepository };
}

// governedRag's canRetrieveDocument() branches on scope.role for private/team/restricted content
// (see src/services/rag/governedRag.ts). An agent connection isn't a specific human, so it reads
// at "Organization Admin" breadth (organization-wide, non-restricted content) -- the same
// visibility floor every tenant-owned integration in this codebase already operates at, not an
// elevation beyond what the connecting admin who issued the key could already see.
function syntheticRagScope(agentScope: AgentScope): TenantScope {
  return {
    organizationId: agentScope.organizationId,
    userId: agentScope.agentConnectionId,
    role: "Organization Admin",
  };
}

const queryKnowledgeHubTool: McpToolDefinition = {
  name: "query_knowledge_hub",
  description: "Ask a question against this tenant's governed Knowledge Hub (documents and knowledge articles). Returns a synthesized answer with cited sources and a confidence score.",
  requiredCapability: "query_knowledge_hub",
  criticality: "auto",
  inputSchema: {
    type: "object",
    properties: {
      question: { type: "string", description: "The question to answer from institutional knowledge." },
      categoryId: { type: "string", description: "Optional document/article category id to restrict the search to." },
      tag: { type: "string", description: "Optional tag to restrict the search to." },
    },
    required: ["question"],
  },
  async handler(scope, args) {
    const question = typeof args.question === "string" ? args.question.trim() : "";
    if (!question) return { content: [{ type: "text", text: "question is required." }], isError: true };

    const answer = await answerWithGovernedRag(agentRagRepositories(scope.organizationId), syntheticRagScope(scope), {
      question,
      categoryId: typeof args.categoryId === "string" ? args.categoryId : undefined,
      tag: typeof args.tag === "string" ? args.tag : undefined,
    });
    return textResult(answer);
  },
};

type TaskRow = {
  id: string; organization_id: string; program_id: string | null; project_id: string | null;
  title: string; description: string | null; assignee_id: string | null; priority: string;
  status: string; due_date: string | null; tags: string[] | null;
};

function mapTaskRow(row: TaskRow): Task {
  return {
    id: row.id,
    organizationId: row.organization_id,
    programId: row.program_id ?? undefined,
    projectId: row.project_id ?? undefined,
    title: row.title,
    description: row.description ?? undefined,
    assigneeId: row.assignee_id ?? undefined,
    priority: row.priority as Task["priority"],
    status: row.status as Task["status"],
    dueDate: row.due_date ?? undefined,
    tags: row.tags ?? [],
  };
}

const createTaskTool: McpToolDefinition = {
  name: "create_task",
  description: "Create a real task in this tenant's workspace. Executes immediately -- no human approval step (Phase 1 elevated-access agent path).",
  requiredCapability: "create_task",
  criticality: "auto",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      description: { type: "string" },
      projectId: { type: "string" },
      assigneeId: { type: "string" },
      dueDate: { type: "string", description: "ISO date." },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
    },
    required: ["title"],
  },
  async handler(scope, args) {
    const title = typeof args.title === "string" ? args.title.trim() : "";
    if (!title) return { content: [{ type: "text", text: "title is required." }], isError: true };

    const rows = await supabaseAdminRest<TaskRow[]>("tasks", {
      method: "POST",
      body: {
        organization_id: scope.organizationId,
        project_id: typeof args.projectId === "string" ? args.projectId : null,
        title,
        description: typeof args.description === "string" ? args.description : null,
        assignee_id: typeof args.assigneeId === "string" ? args.assigneeId : null,
        priority: typeof args.priority === "string" ? args.priority : "medium",
        status: "pending",
        due_date: typeof args.dueDate === "string" ? args.dueDate : null,
        tags: [],
        // Attributed to the human who issued this agent's key -- an accurate record of who
        // authorized the connection, not a fabricated actor (see agent_connections migration).
        created_by_user_id: scope.issuedByUserId ?? null,
        owner_role: scope.issuedByRole ?? "Organization Admin",
      },
    });
    const row = rows?.[0];
    if (!row) return { content: [{ type: "text", text: "Task was not returned by Supabase." }], isError: true };
    return textResult(mapTaskRow(row));
  },
};

type ProjectRow = {
  id: string; organization_id: string; program_id: string | null; name: string;
  description: string | null; owner_id: string | null; progress: number; risk_level: string;
  priority: string | null; status: string; start_date: string | null; due_date: string | null;
  tags: string[] | null;
};

function mapProjectRow(row: ProjectRow): Project {
  return {
    id: row.id,
    organizationId: row.organization_id,
    programId: row.program_id ?? undefined,
    name: row.name,
    description: row.description ?? undefined,
    ownerId: row.owner_id ?? "",
    progress: Number(row.progress),
    riskLevel: row.risk_level as Project["riskLevel"],
    priority: (row.priority ?? row.risk_level) as Project["priority"],
    status: row.status as Project["status"],
    startDate: row.start_date ?? undefined,
    dueDate: row.due_date ?? undefined,
    tags: row.tags ?? [],
  };
}

const listProjectsTool: McpToolDefinition = {
  name: "list_projects",
  description: "List this tenant's projects, most recently due first.",
  requiredCapability: "list_projects",
  criticality: "auto",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Max projects to return (default 50, max 100)." },
    },
  },
  async handler(scope, args) {
    const limit = Math.min(Math.max(typeof args.limit === "number" ? args.limit : 50, 1), 100);
    const rows = await supabaseAdminRest<ProjectRow[]>("projects", {
      query: new URLSearchParams({
        select: "id,organization_id,program_id,name,description,owner_id,progress,risk_level,priority,status,start_date,due_date,tags",
        organization_id: `eq.${scope.organizationId}`,
        order: "due_date.asc",
        limit: String(limit),
      }),
    });
    return textResult((rows ?? []).map(mapProjectRow));
  },
};

type MeetingRow = {
  id: string; organization_id: string; project_id: string | null; program_id: string | null;
  stakeholder_id: string | null; title: string; starts_at: string; ends_at: string | null;
  attendee_ids: string[] | null; agenda: string | null; notes: string | null;
  decisions: string[] | null; action_items: string[] | null; status: string;
};

function mapMeetingRow(row: MeetingRow): Meeting {
  return {
    id: row.id,
    organizationId: row.organization_id,
    projectId: row.project_id ?? undefined,
    programId: row.program_id ?? undefined,
    stakeholderId: row.stakeholder_id ?? undefined,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at ?? undefined,
    attendeeIds: row.attendee_ids ?? [],
    agenda: row.agenda ?? undefined,
    notes: row.notes ?? undefined,
    decisions: row.decisions ?? [],
    actionItems: row.action_items ?? [],
    status: row.status as Meeting["status"],
  };
}

const createMeetingTool: McpToolDefinition = {
  name: "create_meeting",
  description: "Schedule a real meeting in this tenant's workspace, notifying real attendees. Requires human approval unless this connection has been granted Always Allow for this tool.",
  requiredCapability: "create_meeting",
  criticality: "critical",
  inputSchema: {
    type: "object",
    properties: {
      title: { type: "string" },
      startsAt: { type: "string", description: "ISO datetime." },
      endsAt: { type: "string", description: "ISO datetime." },
      projectId: { type: "string" },
      programId: { type: "string" },
      stakeholderId: { type: "string" },
      agenda: { type: "string" },
      notes: { type: "string" },
      attendeeIds: { type: "array", items: { type: "string" } },
    },
    required: ["title", "startsAt"],
  },
  async handler(scope, args) {
    const title = typeof args.title === "string" ? args.title.trim() : "";
    const startsAt = typeof args.startsAt === "string" ? args.startsAt : "";
    if (!title || !startsAt) return { content: [{ type: "text", text: "title and startsAt are required." }], isError: true };

    const rows = await supabaseAdminRest<MeetingRow[]>("meetings", {
      method: "POST",
      body: {
        organization_id: scope.organizationId,
        project_id: typeof args.projectId === "string" ? args.projectId : null,
        program_id: typeof args.programId === "string" ? args.programId : null,
        stakeholder_id: typeof args.stakeholderId === "string" ? args.stakeholderId : null,
        title,
        starts_at: startsAt,
        ends_at: typeof args.endsAt === "string" ? args.endsAt : null,
        attendee_ids: Array.isArray(args.attendeeIds) ? args.attendeeIds : [],
        agenda: typeof args.agenda === "string" ? args.agenda : null,
        notes: typeof args.notes === "string" ? args.notes : null,
        decisions: [],
        action_items: [],
        status: "scheduled",
        created_by_user_id: scope.issuedByUserId ?? null,
        owner_role: scope.issuedByRole ?? "Organization Admin",
      },
    });
    const row = rows?.[0];
    if (!row) return { content: [{ type: "text", text: "Meeting was not returned by Supabase." }], isError: true };
    return textResult(mapMeetingRow(row));
  },
};

const createProjectTool: McpToolDefinition = {
  name: "create_project",
  description: "Create a real project in this tenant's workspace. Requires human approval unless this connection has been granted Always Allow for this tool.",
  requiredCapability: "create_project",
  criticality: "critical",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      description: { type: "string" },
      programId: { type: "string" },
      startDate: { type: "string" },
      dueDate: { type: "string" },
      priority: { type: "string", enum: ["low", "medium", "high", "urgent"] },
    },
    required: ["name"],
  },
  async handler(scope, args) {
    const name = typeof args.name === "string" ? args.name.trim() : "";
    if (!name) return { content: [{ type: "text", text: "name is required." }], isError: true };

    const rows = await supabaseAdminRest<ProjectRow[]>("projects", {
      method: "POST",
      body: {
        organization_id: scope.organizationId,
        program_id: typeof args.programId === "string" ? args.programId : null,
        name,
        description: typeof args.description === "string" ? args.description : null,
        owner_id: scope.issuedByUserId ?? null,
        progress: 0,
        risk_level: "medium",
        priority: typeof args.priority === "string" ? args.priority : "medium",
        status: "planning",
        start_date: typeof args.startDate === "string" ? args.startDate : null,
        due_date: typeof args.dueDate === "string" ? args.dueDate : null,
        tags: [],
        created_by_user_id: scope.issuedByUserId ?? null,
        owner_role: scope.issuedByRole ?? "Organization Admin",
      },
    });
    const row = rows?.[0];
    if (!row) return { content: [{ type: "text", text: "Project was not returned by Supabase." }], isError: true };
    return textResult(mapProjectRow(row));
  },
};

type StakeholderRow = {
  id: string; organization_id: string; name: string; affiliation: string | null;
  relationship_owner_id: string | null; influence_score: number; engagement_level: string;
};

function mapStakeholderRow(row: StakeholderRow): Stakeholder {
  return {
    id: row.id,
    organizationId: row.organization_id,
    name: row.name,
    affiliation: row.affiliation ?? "",
    relationshipOwnerId: row.relationship_owner_id ?? undefined,
    influenceScore: Number(row.influence_score),
    engagementLevel: row.engagement_level as Stakeholder["engagementLevel"],
  };
}

const listStakeholdersTool: McpToolDefinition = {
  name: "list_stakeholders",
  description: "List this tenant's stakeholders (a flat CRM-style contact list -- not a relationship graph).",
  requiredCapability: "list_stakeholders",
  criticality: "auto",
  inputSchema: {
    type: "object",
    properties: {
      limit: { type: "number", description: "Max stakeholders to return (default 50, max 100)." },
    },
  },
  async handler(scope, args) {
    const limit = Math.min(Math.max(typeof args.limit === "number" ? args.limit : 50, 1), 100);
    const rows = await supabaseAdminRest<StakeholderRow[]>("stakeholders", {
      query: new URLSearchParams({
        select: "id,organization_id,name,affiliation,relationship_owner_id,influence_score,engagement_level",
        organization_id: `eq.${scope.organizationId}`,
        order: "name.asc",
        limit: String(limit),
      }),
    });
    return textResult((rows ?? []).map(mapStakeholderRow));
  },
};

const createStakeholderTool: McpToolDefinition = {
  name: "create_stakeholder",
  description: "Add a real stakeholder to this tenant's CRM. Requires human approval unless this connection has been granted Always Allow for this tool.",
  requiredCapability: "create_stakeholder",
  criticality: "critical",
  inputSchema: {
    type: "object",
    properties: {
      name: { type: "string" },
      affiliation: { type: "string" },
    },
    required: ["name"],
  },
  async handler(scope, args) {
    const name = typeof args.name === "string" ? args.name.trim() : "";
    if (!name) return { content: [{ type: "text", text: "name is required." }], isError: true };

    const rows = await supabaseAdminRest<StakeholderRow[]>("stakeholders", {
      method: "POST",
      body: {
        organization_id: scope.organizationId,
        name,
        affiliation: typeof args.affiliation === "string" ? args.affiliation : null,
        relationship_owner_id: scope.issuedByUserId ?? null,
        // Honest defaults, matching this repo's own convention (RAG Remediation Sprint 3, A-58) --
        // never fabricate a mid-point score/rating nobody has actually assessed.
        influence_score: 0,
        engagement_level: "unrated",
      },
    });
    const row = rows?.[0];
    if (!row) return { content: [{ type: "text", text: "Stakeholder was not returned by Supabase." }], isError: true };
    return textResult(mapStakeholderRow(row));
  },
};

const queryExternalModelTool: McpToolDefinition = {
  name: "query_external_model",
  description: "Route an open-ended prompt through AXXESS's own governed OpenRouter-backed AI router (same path /api/ai uses). Requires human approval unless this connection has been granted Always Allow for this tool.",
  requiredCapability: "query_external_model",
  criticality: "critical",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string" },
    },
    required: ["prompt"],
  },
  async handler(scope, args) {
    const prompt = typeof args.prompt === "string" ? args.prompt.trim() : "";
    if (!prompt) return { content: [{ type: "text", text: "prompt is required." }], isError: true };

    const result = await routeAiRequest({
      prompt,
      context: {
        organizationId: scope.organizationId,
        userId: scope.issuedByUserId ?? scope.agentConnectionId,
        userRole: scope.issuedByRole ?? "Organization Admin",
      },
    });
    return textResult(result);
  },
};

export const agentToolRegistry: McpToolDefinition[] = [
  createTaskTool,
  queryKnowledgeHubTool,
  listProjectsTool,
  createMeetingTool,
  createProjectTool,
  listStakeholdersTool,
  createStakeholderTool,
  queryExternalModelTool,
];

export function getAgentTool(name: string): McpToolDefinition | undefined {
  return agentToolRegistry.find((tool) => tool.name === name);
}
