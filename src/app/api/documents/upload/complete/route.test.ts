// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
};

vi.mock("../../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

const recordedAudits: Array<{ action: string; metadata?: Record<string, unknown> }> = [];
vi.mock("../../../../../repositories/supabaseEnterpriseRepositories", () => ({
  tenantScopeFromUser: (user: { id: string; organizationId: string; role: string }) => ({ userId: user.id, organizationId: user.organizationId, role: user.role }),
  auditLogsRepository: {
    record: async (_scope: unknown, input: { action: string; metadata?: Record<string, unknown> }) => {
      recordedAudits.push(input);
      return { id: "audit-1" };
    },
  },
}));

import { POST } from "./route";

const orgId = "org-1";
const validPath = `organizations/${orgId}/documents/doc-1/versions/v1/report.pdf`;
const validUploadId = "22222222-2222-2222-2222-222222222222";

function jsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/documents/upload/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const chunkA = "hello ";
const chunkB = "world";
const validBody = {
  path: validPath,
  uploadId: validUploadId,
  totalChunks: 2,
  fileName: "report.pdf",
  mimeType: "application/pdf",
  sizeBytes: chunkA.length + chunkB.length,
};

describe("POST /api/documents/upload/complete", () => {
  afterEach(() => {
    state.session = null;
    recordedAudits.length = 0;
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await POST(jsonRequest(validBody));
    expect(response.status).toBe(401);
  });

  it("returns 403 when the path does not belong to the caller's organization", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" } };
    const response = await POST(jsonRequest({ ...validBody, path: "organizations/other-org/documents/doc-1/versions/v1/report.pdf" }));
    expect(response.status).toBe(403);
  });

  it("downloads every chunk, assembles them in order, writes the final object, and cleans up", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Organization Admin" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const chunkBase = `https://example.supabase.co/storage/v1/object/axxess-documents/organizations/${orgId}/_upload-chunks/${validUploadId}`;
    const calls: Array<{ url: string; method?: string }> = [];

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      calls.push({ url, method: init?.method });
      if (init?.method === "GET" || init?.method === undefined) {
        if (url === `${chunkBase}/0`) return new Response(chunkA, { status: 200 });
        if (url === `${chunkBase}/1`) return new Response(chunkB, { status: 200 });
      }
      if (init?.method === "POST" && url === `https://example.supabase.co/storage/v1/object/axxess-documents/${validPath}`) {
        return new Response(JSON.stringify({ Key: validPath }), { status: 200 });
      }
      if (init?.method === "DELETE") {
        return new Response(null, { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${init?.method} ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(jsonRequest(validBody));
    const body = await response.json() as { path?: string };

    expect(response.status).toBe(200);
    expect(body.path).toBe(validPath);

    const finalWrite = calls.find((call) => call.method === "POST" && call.url === `https://example.supabase.co/storage/v1/object/axxess-documents/${validPath}`);
    expect(finalWrite).toBeDefined();
    expect(calls.some((call) => call.method === "DELETE" && call.url === `${chunkBase}/0`)).toBe(true);
    expect(calls.some((call) => call.method === "DELETE" && call.url === `${chunkBase}/1`)).toBe(true);
    expect(recordedAudits).toHaveLength(1);
    expect(recordedAudits[0].action).toBe("document.uploaded");
  });

  it("refuses to write a corrupted file when the assembled size does not match the declared size", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Organization Admin" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("only-one-chunks-worth", { status: 200 })));

    const response = await POST(jsonRequest({ ...validBody, sizeBytes: 999_999 }));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(502);
    expect(body.error).toContain("did not match");
    expect(recordedAudits).toHaveLength(0);
  });

  it("does not fail the upload when best-effort chunk cleanup fails (e.g. a non-admin uploader without delete rights)", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Employee" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const chunkBase = `https://example.supabase.co/storage/v1/object/axxess-documents/organizations/${orgId}/_upload-chunks/${validUploadId}`;
    vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
      if (init?.method === "DELETE") return new Response("forbidden", { status: 403 });
      if (init?.method === "POST") return new Response(JSON.stringify({ Key: validPath }), { status: 200 });
      if (url === `${chunkBase}/0`) return new Response(chunkA, { status: 200 });
      if (url === `${chunkBase}/1`) return new Response(chunkB, { status: 200 });
      throw new Error(`Unexpected fetch: ${init?.method} ${url}`);
    }));

    const response = await POST(jsonRequest(validBody));
    expect(response.status).toBe(200);
  });
});
