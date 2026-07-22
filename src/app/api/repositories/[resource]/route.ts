import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import type { RoleName } from "../../../../domain";
import {
  auditLogsRepository,
  createRepositoryResource,
  listRepositoryResource,
  notificationsRepository,
  tenantScopeFromUser,
  updateRepositoryResource,
  type ResourceName,
} from "../../../../repositories/supabaseEnterpriseRepositories";
import type { RepositoryQuery, TenantScope } from "../../../../repositories/interfaces";
import { recordWorkflowTimelineEvent } from "../../../../services/workflows/liveTenantWorkflow";
import type { WorkflowTimelineResourceType } from "../../../../services/workflows/workflowEvidence";

const allowedResources = new Set([
  "organizations",
  "users",
  "programs",
  "projects",
  "tasks",
  "documents",
  "document_versions",
  "document_categories",
  "document_tags",
  "document_permissions",
  "document_activity",
  "knowledge_articles",
  "meetings",
  "notifications",
  "audit_logs",
  "invitations",
]);

type RouteContext = {
  params: Promise<{ resource: string }>;
};

function repositoryQueryFromUrl(url: URL): RepositoryQuery {
  const page = Number(url.searchParams.get("page") ?? "1");
  const pageSize = Number(url.searchParams.get("pageSize") ?? "50");

  return {
    page: Number.isFinite(page) ? page : 1,
    pageSize: Number.isFinite(pageSize) ? pageSize : 50,
    search: url.searchParams.get("search") ?? undefined,
  };
}

function hasRole(role: RoleName, allowed: RoleName[]) {
  return allowed.includes(role);
}

function canWriteResource(resource: ResourceName, role: RoleName) {
  if (resource === "users") return hasRole(role, ["Super Admin", "Organization Admin"]);
  if (resource === "projects" || resource === "meetings") {
    return hasRole(role, ["Super Admin", "Organization Admin", "Executive", "Manager"]);
  }
  if (resource === "documents" || resource === "document_versions" || resource === "knowledge_articles") {
    return hasRole(role, ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee"]);
  }
  if (resource === "document_categories" || resource === "document_tags" || resource === "document_permissions") {
    return hasRole(role, ["Super Admin", "Organization Admin", "Executive", "Manager"]);
  }
  if (resource === "document_activity") {
    return hasRole(role, ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant", "Guest"]);
  }
  if (resource === "tasks") {
    return hasRole(role, ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee"]);
  }
  if (resource === "notifications") {
    return hasRole(role, ["Super Admin", "Organization Admin", "Executive", "Manager", "Employee", "Consultant", "Guest"]);
  }
  return false;
}

function validateResourceInput(resource: ResourceName, body: Record<string, unknown>) {
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim() : "";

  if (resource === "projects" && !name) return "Project name is required.";
  if (resource === "tasks" && !title) return "Task title is required.";
  if (resource === "meetings" && (!title || typeof body.startsAt !== "string" || !body.startsAt.trim())) {
    return "Meeting title and date/time are required.";
  }
  if (resource === "documents" && !name) return "Document name is required.";
  if (resource === "document_versions" && (!body.documentId || !body.fileName || !body.storagePath)) {
    return "Document version metadata is required.";
  }
  if ((resource === "document_categories" || resource === "document_tags") && !name) {
    return "Name is required.";
  }
  if (resource === "document_permissions" && (!body.documentId || !body.principalType || !body.accessLevel)) {
    return "Document permission target and level are required.";
  }
  if (resource === "document_activity" && (!body.documentId || !body.action)) {
    return "Document activity target and action are required.";
  }
  if (resource === "knowledge_articles" && !title) return "Knowledge article title is required.";
  if (resource === "notifications" && (!title || typeof body.body !== "string" || !body.body.trim())) {
    return "Notification title and body are required.";
  }
  return undefined;
}

async function jsonBody(request: Request) {
  const body = await request.json().catch(() => ({}));
  return typeof body === "object" && body !== null && !Array.isArray(body) ? body as Record<string, unknown> : {};
}

async function notifyAfterMutation(resource: ResourceName, scope: TenantScope, result: unknown, action: "created" | "updated") {
  if (!result || typeof result !== "object" || !("id" in result)) return;
  const record = result as Record<string, unknown>;
  const resourceId = typeof record.id === "string" ? record.id : undefined;
  const title = typeof record.name === "string" ? record.name : typeof record.title === "string" ? record.title : resource;
  const targetUserId = typeof record.assigneeId === "string" && record.assigneeId ? record.assigneeId
    : typeof record.ownerId === "string" && record.ownerId ? record.ownerId
      : scope.userId;

  const notificationType = resource === "projects" ? "project" : resource === "tasks" ? "task" : resource === "meetings" ? "meeting" : "admin";
  const label = resource === "projects" ? "Project" : resource === "tasks" ? "Task" : resource === "meetings" ? "Meeting" : "Record";

  await notificationsRepository.create(scope, {
    organizationId: scope.organizationId,
    userId: targetUserId,
    type: notificationType,
    title: `${label} ${action}`,
    body: `${title} was ${action}.`,
    resourceType: resource,
    resourceId,
  }).catch(() => undefined);
}

// Writes audit + workflow-timeline evidence for a real tenant-backed resource creation, so the
// created record shows up in Audit Logs and the Dashboard/timeline the same way an approved
// AI-review workflow action already does (see recordWorkflowTimelineEvent in liveTenantWorkflow.ts).
// Best-effort (failures here must never fail the create itself). Only called after a successful
// createRepositoryResource() -- an unauthorized/forbidden/failed create never reaches this point,
// so no evidence is ever written for a request that didn't actually succeed. Metadata is limited to
// the record's own name/title (never the full request body), so no sensitive field of an unlisted
// resource type can leak into an audit_logs/workflow_timeline_events row.
//
// Sprint 2 originally scoped this to "projects" only (the QA finding it addressed was specifically
// POST /api/repositories/projects -> 401). Sprint 5 generalizes it to every resource named in
// EVIDENCE_RESOURCE_CONFIG below, per the roadmap's golden-path steps that also expect timeline/audit
// evidence for tasks, documents and meetings, not projects alone -- see
// docs/SPRINT_1_TO_4_GAP_ANALYSIS_2026_07_22.md Section 2 for the gap this closes.
const EVIDENCE_RESOURCE_CONFIG: Partial<Record<ResourceName, {
  singular: WorkflowTimelineResourceType;
  actionVerb: string;
  category: string;
}>> = {
  projects: { singular: "project", actionVerb: "project.created", category: "project-management" },
  tasks: { singular: "task", actionVerb: "task.created", category: "task-management" },
  documents: { singular: "document", actionVerb: "document.created", category: "document-management" },
  knowledge_articles: { singular: "knowledge_article", actionVerb: "knowledge_article.created", category: "knowledge-management" },
  meetings: { singular: "meeting", actionVerb: "meeting.created", category: "meeting-management" },
};

async function recordResourceCreateEvidence(resourceName: ResourceName, scope: TenantScope, result: unknown) {
  const config = EVIDENCE_RESOURCE_CONFIG[resourceName];
  if (!config) return;
  if (!result || typeof result !== "object" || !("id" in result)) return;

  const record = result as Record<string, unknown>;
  const resourceId = typeof record.id === "string" ? record.id : undefined;
  const recordName = typeof record.name === "string" ? record.name
    : typeof record.title === "string" ? record.title
      : config.singular;

  const auditLog = await auditLogsRepository.record(scope, {
    action: config.actionVerb,
    resourceType: config.singular,
    resourceId,
    category: config.category,
    metadata: { name: recordName },
  }).catch(() => undefined);

  await recordWorkflowTimelineEvent({
    organizationId: scope.organizationId,
    resourceType: config.singular,
    resourceId,
    eventType: "workflow_action_created",
    title: `${config.singular === "knowledge_article" ? "Knowledge article" : config.singular.charAt(0).toUpperCase() + config.singular.slice(1)} created`,
    description: `${recordName} was created.`,
    actorUserId: scope.userId,
    actorLabel: scope.role,
    sourceType: config.singular,
    sourceId: resourceId,
    auditLogId: auditLog?.id,
    metadata: { name: recordName },
  }).catch(() => undefined);
}

export async function GET(request: Request, context: RouteContext) {
  const { resource } = await context.params;
  if (!allowedResources.has(resource)) {
    return NextResponse.json({ error: "Unknown repository resource." }, { status: 404 });
  }

  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id") ?? undefined;
  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const resources = await listRepositoryResource(resource as ResourceName, scope, repositoryQueryFromUrl(url), id);
  return NextResponse.json(resources);
}

export async function POST(request: Request, context: RouteContext) {
  const { resource } = await context.params;
  if (!allowedResources.has(resource)) {
    return NextResponse.json({ error: "Unknown repository resource." }, { status: 404 });
  }

  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const resourceName = resource as ResourceName;
  if (!canWriteResource(resourceName, session.user.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const body = await jsonBody(request);
  const validationError = validateResourceInput(resourceName, body);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const result = await createRepositoryResource(resourceName, scope, body);
  if (resourceName === "projects" || resourceName === "tasks" || resourceName === "meetings") {
    await notifyAfterMutation(resourceName, scope, result, "created");
  }
  await recordResourceCreateEvidence(resourceName, scope, result);

  return NextResponse.json(result, { status: 201 });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { resource } = await context.params;
  if (!allowedResources.has(resource)) {
    return NextResponse.json({ error: "Unknown repository resource." }, { status: 404 });
  }

  const session = await getServerAuthSession(true);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const resourceName = resource as ResourceName;
  if (!canWriteResource(resourceName, session.user.role)) {
    return NextResponse.json({ error: "Forbidden." }, { status: 403 });
  }

  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Resource id is required." }, { status: 400 });
  }

  const body = await jsonBody(request);
  const validationError = validateResourceInput(resourceName, { ...body, name: body.name ?? "existing", title: body.title ?? "existing", startsAt: body.startsAt ?? "existing", body: body.body ?? "existing" });
  if ((resourceName === "projects" || resourceName === "tasks" || resourceName === "meetings" || resourceName === "notifications") && validationError && Object.keys(body).length === 0) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const scope = tenantScopeFromUser(session.user, session.accessToken);
  const result = await updateRepositoryResource(resourceName, scope, id, body);
  if (resourceName === "projects" || resourceName === "tasks" || resourceName === "meetings") {
    await notifyAfterMutation(resourceName, scope, result, "updated");
  }
  if (resourceName === "users" && result && typeof result === "object") {
    const target = result as Record<string, unknown>;
    await notificationsRepository.create(scope, {
      organizationId: scope.organizationId,
      userId: typeof target.id === "string" ? target.id : scope.userId,
      type: "admin",
      title: "Access updated",
      body: body.role ? `Your role was changed to ${String(body.role)}.` : "Your access status was updated.",
      resourceType: "users",
      resourceId: id,
    }).catch(() => undefined);
  }

  return NextResponse.json(result);
}
