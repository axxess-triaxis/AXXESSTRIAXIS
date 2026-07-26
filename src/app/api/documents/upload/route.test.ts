// @vitest-environment node
//
// jsdom's FormData/Request/File globals don't correctly round-trip a multipart file upload
// through Request.formData() (verified: identical code works fine under plain Node). This route
// has no DOM dependency, so it runs under the real Node environment instead of this suite's
// default jsdom.
import { afterEach, describe, expect, it, vi } from "vitest";

// Replaces the browser -> Supabase-signed-URL direct PUT (which depended on Supabase's own
// CORS/edge behavior and silently failed in production, confirmed live 2026-07-26) with a
// same-origin proxy: browser -> this route -> Supabase Storage. These tests prove the route
// enforces auth/tenant-path scoping and genuinely surfaces a real Supabase failure instead of
// swallowing it.
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

const recordedAudits: Array<{ action: string; category?: string; metadata?: Record<string, unknown> }> = [];
vi.mock("../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: {
    record: async (_scope: unknown, input: { action: string; category?: string; metadata?: Record<string, unknown> }) => {
      recordedAudits.push(input);
      return { id: "audit-upload-1" };
    },
  },
}));

import { POST } from "./route";

function requestWith(fields: { path?: string; file?: File }) {
  const formData = new FormData();
  if (fields.path !== undefined) formData.append("path", fields.path);
  if (fields.file !== undefined) formData.append("file", fields.file, fields.file.name);
  return new Request("http://localhost/api/documents/upload", { method: "POST", body: formData });
}

const orgId = "org-1";
const validPath = `organizations/${orgId}/documents/doc-1/versions/v1/report.pdf`;
const validFile = new File(["file-bytes"], "report.pdf", { type: "application/pdf" });

describe("POST /api/documents/upload", () => {
  afterEach(() => {
    state.session = null;
    recordedAudits.length = 0;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await POST(requestWith({ path: validPath, file: validFile }));
    expect(response.status).toBe(401);
  });

  it("returns 400 when the file is missing", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" } };
    const response = await POST(requestWith({ path: validPath }));
    expect(response.status).toBe(400);
  });

  it("returns 403 when the path does not belong to the caller's organization", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" } };
    const response = await POST(requestWith({ path: "organizations/other-org/documents/doc-1/versions/v1/report.pdf", file: validFile }));
    expect(response.status).toBe(403);
  });

  it("returns 400 for a disallowed file type", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" } };
    const badFile = new File(["exe-bytes"], "app.exe", { type: "application/x-msdownload" });
    const response = await POST(requestWith({ path: validPath, file: badFile }));
    expect(response.status).toBe(400);
  });

  it("uploads to Supabase Storage and records a real audit event on success", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(`https://example.supabase.co/storage/v1/object/axxess-documents/${validPath}`);
      expect(init?.method).toBe("POST");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer user-token");
      return new Response(JSON.stringify({ Key: validPath }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(requestWith({ path: validPath, file: validFile }));
    const body = await response.json() as { path?: string };

    expect(response.status).toBe(200);
    expect(body.path).toBe(validPath);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recordedAudits).toHaveLength(1);
    expect(recordedAudits[0].action).toBe("document.uploaded");
  });

  it("surfaces a real 502 error, without a fake success, when Supabase Storage rejects the write", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Bucket not found", { status: 404 })));

    const response = await POST(requestWith({ path: validPath, file: validFile }));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(502);
    expect(body.error).toContain("404");
    expect(recordedAudits).toHaveLength(0);
  });
});
