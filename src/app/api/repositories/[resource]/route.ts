import { NextResponse } from "next/server";
import { getServerAuthSession } from "../../../../auth/serverSession";
import type { RoleName } from "../../../../domain";
import {
  createRepositoryResource,
  listRepositoryResource,
  notificationsRepository,
  tenantScopeFromUser,
  updateRepositoryResource,
  type ResourceName,
} from "../../../../repositories/supabaseEnterpriseRepositories";
import type { RepositoryQuery, TenantScope } from "../../../../repositories/interfaces";

const allowedResources = new Set([
  "organizations",
  "users",
  "programs",
  "projects",
  "tasks",
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
