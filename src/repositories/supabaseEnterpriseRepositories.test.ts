import { afterEach, describe, expect, it, vi } from "vitest";
import { auditLogsRepository, projectsRepository, tasksRepository } from "./supabaseEnterpriseRepositories";
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
});
