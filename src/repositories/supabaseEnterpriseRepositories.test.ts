import { afterEach, describe, expect, it, vi } from "vitest";
import { auditLogsRepository, invitationsRepository, projectsRepository, tasksRepository } from "./supabaseEnterpriseRepositories";
import type { TenantScope } from "./interfaces";

const scope: TenantScope = {
  organizationId: "org_public_safety",
  userId: "user_raj_anand",
  role: "Organization Admin",
};

function fetchCall(fetchMock: ReturnType<typeof vi.fn>, index = 0) {
  return fetchMock.mock.calls[index] as [RequestInfo | URL, RequestInit | undefined];
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("Supabase enterprise repositories", () => {
  it("loads projects through the server repository gateway when no client token is present", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      {
        id: "project_1",
        organizationId: "org_public_safety",
        name: "Border Security AI Platform",
        ownerId: "user_raj_anand",
        progress: 42,
        riskLevel: "high",
        status: "at-risk",
      },
    ]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const projects = await projectsRepository.list(scope, { page: 2, pageSize: 25, search: "Border" });

    expect(projects).toHaveLength(1);
    const [url] = fetchCall(fetchMock);
    expect(String(url)).toContain("/api/repositories/projects");
    expect(String(url)).toContain("page=2");
    expect(String(url)).toContain("search=Border");
  });

  it("uses direct Supabase REST calls when a server-side access token is supplied", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      {
        id: "task_1",
        organization_id: "org_public_safety",
        title: "Prepare executive briefing",
        priority: "high",
        status: "in-progress",
        project_id: null,
        assignee_id: null,
        due_date: null,
      },
    ]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const tasks = await tasksRepository.list({ ...scope, accessToken: "server-token" });

    expect(tasks[0].organizationId).toBe("org_public_safety");
    const [url, init] = fetchCall(fetchMock);
    expect(String(url)).toContain("https://example.supabase.co/rest/v1/tasks");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer server-token",
    });
  });

  it("records audit logs with actor and organization metadata", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      {
        id: "audit_1",
        organization_id: "org_public_safety",
        actor_user_id: "user_raj_anand",
        actor_role: "Organization Admin",
        action: "project.created",
        resource_type: "project",
        resource_id: "project_1",
        category: "project-management",
        request_id: null,
        metadata: { source: "test" },
        created_at: "2026-07-03T00:00:00Z",
      },
    ]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const auditLog = await auditLogsRepository.record({ ...scope, accessToken: "server-token" }, {
      action: "project.created",
      resourceType: "project",
      resourceId: "project_1",
      category: "project-management",
      metadata: { source: "test" },
    });

    expect(auditLog?.action).toBe("project.created");
    const [, init] = fetchCall(fetchMock);
    expect(String(init?.body)).toContain("org_public_safety");
    expect(String(init?.body)).toContain("Organization Admin");
  });

  it("creates projects through the server repository gateway when no client token is present", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify({
      id: "project_2",
      organizationId: "org_public_safety",
      name: "Sprint 7 Workflow",
      ownerId: "user_raj_anand",
      progress: 0,
      riskLevel: "medium",
      priority: "medium",
      status: "planning",
      tags: ["crud"],
    }), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);

    const project = await projectsRepository.create(scope, {
      name: "Sprint 7 Workflow",
      ownerId: "user_raj_anand",
      priority: "medium",
      riskLevel: "medium",
      status: "planning",
      tags: ["crud"],
    });

    expect(project.name).toBe("Sprint 7 Workflow");
    const [url, init] = fetchCall(fetchMock);
    expect(String(url)).toContain("/api/repositories/projects");
    expect(init?.method).toBe("POST");
    expect(String(init?.body)).toContain("Sprint 7 Workflow");
  });

  it("ignores a spoofed organizationId on create for a non-Super-Admin tenant scope (cross-tenant write blocked)", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{
      id: "project_3",
      organization_id: "org_public_safety",
      name: "Isolated Tenant Project",
      owner_id: "user_raj_anand",
      progress: 0,
      risk_level: "medium",
      priority: "medium",
      status: "planning",
      tags: [],
    }]), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    await projectsRepository.create({ ...scope, accessToken: "server-token" }, {
      organizationId: "org_someone_elses_tenant",
      name: "Isolated Tenant Project",
      ownerId: "user_raj_anand",
      priority: "medium",
      riskLevel: "medium",
      status: "planning",
      tags: [],
    });

    const [, init] = fetchCall(fetchMock);
    expect(String(init?.body)).toContain("org_public_safety");
    expect(String(init?.body)).not.toContain("org_someone_elses_tenant");
  });

  it("ignores a spoofed organizationId on create for a Super Admin scope too (cross-tenant write blocked)", async () => {
    // Sprint 3 finding: "Super Admin" is a self-selectable role at onboarding (see
    // packages/shared/src/index.ts axxessBetaRoles), not a cross-tenant platform-operator role --
    // there is no such role in this codebase. This repository must never trust a client-supplied
    // organizationId for any scope, regardless of role; see canManageOrganization in
    // src/security/rbac.ts for the matching API-layer fix.
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{
      id: "project_4",
      organization_id: "org_public_safety",
      name: "Cross-Org Admin Project",
      owner_id: "user_raj_anand",
      progress: 0,
      risk_level: "medium",
      priority: "medium",
      status: "planning",
      tags: [],
    }]), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const superAdminScope: TenantScope = { ...scope, role: "Super Admin", accessToken: "server-token" };
    await projectsRepository.create(superAdminScope, {
      organizationId: "org_platform_target",
      name: "Cross-Org Admin Project",
      ownerId: "user_raj_anand",
      priority: "medium",
      riskLevel: "medium",
      status: "planning",
      tags: [],
    });

    const [, init] = fetchCall(fetchMock);
    expect(String(init?.body)).toContain("org_public_safety");
    expect(String(init?.body)).not.toContain("org_platform_target");
  });

  it("always scopes project reads to the requesting tenant, ignoring any other organization in the query", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    await projectsRepository.list({ ...scope, accessToken: "server-token" });

    const [url] = fetchCall(fetchMock);
    expect(String(url)).toContain("organization_id=eq.org_public_safety");
  });

  it("updates tasks through Supabase REST when a server access token is supplied", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([
      {
        id: "task_1",
        organization_id: "org_public_safety",
        program_id: null,
        project_id: null,
        title: "Prepare executive briefing",
        description: "Updated briefing",
        assignee_id: null,
        priority: "high",
        status: "completed",
        due_date: null,
        tags: ["briefing"],
      },
    ]), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const task = await tasksRepository.update({ ...scope, accessToken: "server-token" }, "task_1", {
      status: "completed",
      description: "Updated briefing",
    });

    expect(task.status).toBe("completed");
    const [url, init] = fetchCall(fetchMock);
    expect(String(url)).toContain("id=eq.task_1");
    expect(String(url)).toContain("organization_id=eq.org_public_safety");
    expect(init?.method).toBe("PATCH");
    expect(String(init?.body)).toContain("completed");
  });

  it("ignores a spoofed organizationId when creating an invitation, always writing the acting session's own org (Sprint 3 fix)", async () => {
    const fetchMock = vi.fn(async () => new Response(JSON.stringify([{
      id: "invitation_1",
      organization_id: "org_public_safety",
      email: "new.hire@example.com",
      role: "Employee",
      invited_by_user_id: "user_raj_anand",
      status: "pending",
      expires_at: "2026-08-01T00:00:00Z",
      accepted_at: null,
      created_at: "2026-07-24T00:00:00Z",
      updated_at: "2026-07-24T00:00:00Z",
    }]), { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    await invitationsRepository.create({ ...scope, role: "Super Admin", accessToken: "server-token" }, {
      organizationId: "org_someone_elses_tenant",
      email: "new.hire@example.com",
      role: "Employee",
      invitedByUserId: "user_raj_anand",
      tokenHash: "hash",
      expiresAt: "2026-08-01T00:00:00Z",
    });

    const [, init] = fetchCall(fetchMock);
    expect(String(init?.body)).toContain("org_public_safety");
    expect(String(init?.body)).not.toContain("org_someone_elses_tenant");
  });
});
