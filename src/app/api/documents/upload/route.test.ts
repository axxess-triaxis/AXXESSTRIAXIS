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

// Hand-built minimal valid PDF (correct xref byte offsets) so the extraction wiring can be
// proven against a real PDF parse, not just the honest-failure path for garbage bytes.
function buildMinimalPdf(contentStream: string): Buffer {
  const objects = [
    "1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n",
    "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n",
    "3 0 obj\n<< /Type /Page /Parent 2 0 R /Resources << /Font << /F1 4 0 R >> >> /MediaBox [0 0 500 200] /Contents 5 0 R >>\nendobj\n",
    "4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
    `5 0 obj\n<< /Length ${contentStream.length} >>\nstream\n${contentStream}\nendstream\nendobj\n`,
  ];
  let body = "%PDF-1.4\n";
  const offsets: number[] = [];
  for (const object of objects) {
    offsets.push(body.length);
    body += object;
  }
  const xrefStart = body.length;
  let xref = `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (const offset of offsets) {
    xref += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  const trailer = `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;
  return Buffer.from(body + xref + trailer, "latin1");
}

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
    const body = await response.json() as { path?: string; extraction?: { supported: boolean; reason?: string } };

    expect(response.status).toBe(200);
    expect(body.path).toBe(validPath);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(recordedAudits).toHaveLength(1);
    expect(recordedAudits[0].action).toBe("document.uploaded");
    // "file-bytes" isn't a real PDF -- extraction should fail honestly, not crash the upload.
    expect(body.extraction?.supported).toBe(false);
  });

  it("extracts real text from an actual PDF and returns it alongside the upload", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ Key: validPath }), { status: 200 })));

    const pdfBytes = buildMinimalPdf("BT /F1 24 Tf 20 100 Td (Real PDF Content) Tj ET");
    const realPdf = new File([pdfBytes], "report.pdf", { type: "application/pdf" });

    const response = await POST(requestWith({ path: validPath, file: realPdf }));
    const body = await response.json() as { extraction?: { supported: boolean; method?: string; text: string } };

    expect(response.status).toBe(200);
    expect(body.extraction?.supported).toBe(true);
    expect(body.extraction?.method).toBe("text-layer");
    expect(body.extraction?.text).toContain("Real PDF Content");
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
