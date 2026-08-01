// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

// This route now accepts ONE CHUNK of an upload (not the whole file) -- chunking through our own
// same-origin API keeps every browser -> our-server request under Vercel's ~4.5MB serverless
// request-body ceiling, while still never having the browser talk directly to Supabase's domain
// (see KNOWLEDGE_HUB_UPLOAD_PERSISTENCE_INCIDENT_CLOSEOUT_2026_07_26.md for why a direct
// browser-to-Supabase-Storage signed-URL PUT is not an option here). Assembly happens in
// POST /api/documents/upload/complete, tested separately.
const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

import { POST } from "./route";

const orgId = "org-1";
const validPath = `organizations/${orgId}/documents/doc-1/versions/v1/report.pdf`;
const validUploadId = "11111111-1111-1111-1111-111111111111";

function requestWith(params: Record<string, string>, body: BodyInit = "chunk-bytes") {
  const query = new URLSearchParams(params);
  return new Request(`http://localhost/api/documents/upload?${query.toString()}`, { method: "POST", body });
}

const validParams = {
  path: validPath,
  uploadId: validUploadId,
  chunkIndex: "0",
  totalChunks: "1",
  mimeType: "application/pdf",
  sizeBytes: "11",
  fileName: "report.pdf",
};

describe("POST /api/documents/upload (chunk)", () => {
  afterEach(() => {
    state.session = null;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await POST(requestWith(validParams));
    expect(response.status).toBe(401);
  });

  it("returns 403 when the path does not belong to the caller's organization", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" } };
    const response = await POST(requestWith({ ...validParams, path: "organizations/other-org/documents/doc-1/versions/v1/report.pdf" }));
    expect(response.status).toBe(403);
  });

  it("returns 400 for an invalid uploadId", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" } };
    const response = await POST(requestWith({ ...validParams, uploadId: "not-a-uuid" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 when chunkIndex is out of range", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" } };
    const response = await POST(requestWith({ ...validParams, chunkIndex: "5", totalChunks: "2" }));
    expect(response.status).toBe(400);
  });

  it("returns 400 for a disallowed file type", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" } };
    const response = await POST(requestWith({ ...validParams, fileName: "app.exe", mimeType: "application/x-msdownload" }));
    expect(response.status).toBe(400);
  });

  it("writes the chunk to a temp org-scoped storage path and returns ok", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(`https://example.supabase.co/storage/v1/object/axxess-documents/organizations/${orgId}/_upload-chunks/${validUploadId}/0`);
      expect(init?.method).toBe("POST");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer user-token");
      // Real regression: the bucket's allowed_mime_types allowlist does not include
      // "application/octet-stream" (the old default), so Supabase rejected every temp chunk write
      // in production even though the final assembled object used the correct mimeType. The chunk
      // write must use the real file mimeType too, not a generic default.
      expect((init?.headers as Record<string, string>)["Content-Type"]).toBe("application/pdf");
      return new Response(JSON.stringify({ Key: "ok" }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(requestWith(validParams));
    const body = await response.json() as { ok?: boolean; chunkIndex?: number };

    expect(response.status).toBe(200);
    expect(body).toEqual({ ok: true, chunkIndex: 0 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("surfaces a real 502 error, without a fake success, when Supabase Storage rejects the chunk write", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("Bucket not found", { status: 404 })));

    const response = await POST(requestWith(validParams));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(502);
    expect(body.error).toContain("404");
  });
});
