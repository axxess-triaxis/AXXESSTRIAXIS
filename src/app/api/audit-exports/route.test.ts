import { afterEach, describe, expect, it, vi } from "vitest";

// Lite Settings real-modules pass (2026-08-27): upgraded from a source-string-matching test to a
// real behavioral one, since the two things that changed this pass -- the RBAC relaxation (a
// non-admin's export must never contain another actor's rows) and the new pdf/zip formats -- can
// only be genuinely proven by invoking the handler, not by grepping the file for expected strings.
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken: string },
  logs: [] as Array<{ id: string; actorUserId?: string; actorRole?: string; action: string; resourceType: string; resourceId?: string; category?: string; requestId?: string; createdAt: string }>,
};

vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

vi.mock("../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

vi.mock("../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }, accessToken: string) => ({ userId: user.id, organizationId: user.organizationId, role: user.role, accessToken }),
  auditLogsRepository: {
    list: async () => state.logs,
    record: async () => ({ id: "audit-of-export-1" }),
  },
}));

const originalFetch = global.fetch;

function mockSupabaseFetch() {
  global.fetch = vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.includes("/rest/v1/audit_exports")) {
      return new Response(JSON.stringify([{ id: "export-1" }]), { status: 201 });
    }
    if (url.includes("/rest/v1/workflow_timeline_events")) {
      return new Response(JSON.stringify([]), { status: 200 });
    }
    if (url.includes("/rest/v1/audit_export_timeline_links")) {
      return new Response(JSON.stringify([]), { status: 201 });
    }
    return new Response("not found", { status: 404 });
  }) as typeof fetch;
}

import { POST } from "./route";

function request(body: Record<string, unknown> = {}) {
  return new Request("http://localhost/api/audit-exports", { method: "POST", body: JSON.stringify(body) });
}

describe("POST /api/audit-exports", () => {
  afterEach(() => {
    state.session = null;
    state.logs = [];
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await POST(request());
    expect(response.status).toBe(401);
  });

  it("Super Admin/Organization Admin export the whole organization's activity, unchanged", async () => {
    mockSupabaseFetch();
    state.session = { user: { id: "admin-1", organizationId: "org-1", role: "Super Admin" }, accessToken: "token-1" };
    state.logs = [
      { id: "log-1", actorUserId: "admin-1", action: "auth.login", resourceType: "user", category: "auth", createdAt: "2026-08-27T00:00:00Z" },
      { id: "log-2", actorUserId: "employee-1", action: "task.created", resourceType: "task", category: "workflow", createdAt: "2026-08-27T01:00:00Z" },
    ];

    const response = await POST(request());
    const body = await response.json() as { recordCount: number; format: string; csv: string };

    expect(response.status).toBe(201);
    expect(body.format).toBe("csv");
    expect(body.recordCount).toBe(2);
    expect(body.csv).toContain("auth.login");
    expect(body.csv).toContain("task.created");
  });

  it("a non-admin's export is self-scoped -- never contains another actor's rows", async () => {
    mockSupabaseFetch();
    state.session = { user: { id: "employee-1", organizationId: "org-1", role: "Employee" }, accessToken: "token-2" };
    state.logs = [
      { id: "log-1", actorUserId: "admin-1", action: "auth.login", resourceType: "user", category: "auth", createdAt: "2026-08-27T00:00:00Z" },
      { id: "log-2", actorUserId: "employee-1", action: "task.created", resourceType: "task", category: "workflow", createdAt: "2026-08-27T01:00:00Z" },
      { id: "log-3", actorUserId: "employee-1", action: "meeting.created", resourceType: "meeting", category: "workflow", createdAt: "2026-08-27T02:00:00Z" },
    ];

    // Previously this request would 403 outright -- now it succeeds, but scoped.
    const response = await POST(request());
    const body = await response.json() as { recordCount: number; csv: string };

    expect(response.status).toBe(201);
    expect(body.recordCount).toBe(2);
    expect(body.csv).not.toContain("auth.login");
    expect(body.csv).toContain("task.created");
    expect(body.csv).toContain("meeting.created");
  });

  it("returns base64 PDF content for format: pdf, and never leaks the csv field", async () => {
    mockSupabaseFetch();
    state.session = { user: { id: "employee-1", organizationId: "org-1", role: "Employee" }, accessToken: "token-3" };
    state.logs = [{ id: "log-1", actorUserId: "employee-1", action: "task.created", resourceType: "task", category: "workflow", createdAt: "2026-08-27T01:00:00Z" }];

    const response = await POST(request({ format: "pdf" }));
    const body = await response.json() as { format: string; contentBase64?: string; csv?: string; fileName: string };

    expect(response.status).toBe(201);
    expect(body.format).toBe("pdf");
    expect(body.fileName.endsWith(".pdf")).toBe(true);
    expect(body.csv).toBeUndefined();
    expect(body.contentBase64).toBeTruthy();
    // A real PDF byte stream starts with the "%PDF-" magic header.
    expect(Buffer.from(body.contentBase64 as string, "base64").toString("latin1").startsWith("%PDF-")).toBe(true);
  });

  it("returns base64 ZIP content for format: zip", async () => {
    mockSupabaseFetch();
    state.session = { user: { id: "admin-1", organizationId: "org-1", role: "Organization Admin" }, accessToken: "token-4" };
    state.logs = [{ id: "log-1", actorUserId: "admin-1", action: "auth.login", resourceType: "user", category: "auth", createdAt: "2026-08-27T00:00:00Z" }];

    const response = await POST(request({ format: "zip" }));
    const body = await response.json() as { format: string; contentBase64?: string; fileName: string };

    expect(response.status).toBe(201);
    expect(body.format).toBe("zip");
    expect(body.fileName.endsWith(".zip")).toBe(true);
    // A real ZIP byte stream starts with the "PK" local-file-header signature.
    expect(Buffer.from(body.contentBase64 as string, "base64").subarray(0, 2).toString("latin1")).toBe("PK");
  });

  it("uses the signed-in user's Supabase token, never a service-role key", async () => {
    mockSupabaseFetch();
    state.session = { user: { id: "admin-1", organizationId: "org-1", role: "Super Admin" }, accessToken: "caller-own-token" };
    state.logs = [];

    await POST(request());

    const calls = (global.fetch as ReturnType<typeof vi.fn>).mock.calls as [RequestInfo | URL, RequestInit][];
    const auditExportCall = calls.find(([url]) => String(url).includes("/rest/v1/audit_exports"));
    expect(auditExportCall).toBeDefined();
    const headers = auditExportCall?.[1]?.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer caller-own-token");
  });
});
