// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest";

const state = {
  session: null as null | { user: { id: string; organizationId: string; role: string }; accessToken?: string },
};

vi.mock("../../../../auth/serverSession", () => ({
  getServerAuthSession: async () => state.session,
}));

// Real extraction correctness (PDF text-layer/OCR/DOCX/plain, honest failures, page/char caps) is
// already fully proven by documentTextExtraction.test.ts against the real native pipeline
// (pdf-parse -> @napi-rs/canvas -> tesseract.js). This route's own job is auth/path-scoping,
// downloading the right object from storage, and shaping the response -- that's what these tests
// exercise. Mocking extractDocumentText also avoids loading the native canvas addon a second time
// in the same test run, which was intermittently segfaulting Vitest's worker-thread pool at full
// suite scale (confirmed: both files pass reliably when run separately or together in isolation;
// the crash only appeared once two files independently required the native addon in the same run).
const mockExtractDocumentText = vi.fn();
vi.mock("../../../../services/rag/ingestion/documentTextExtraction", () => ({
  extractDocumentText: (...args: unknown[]) => mockExtractDocumentText(...args),
}));

import { POST } from "./route";

const orgId = "org-1";
const validPath = `organizations/${orgId}/documents/doc-1/versions/v1/report.pdf`;

function jsonRequest(body: Record<string, unknown>) {
  return new Request("http://localhost/api/documents/extract", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

describe("POST /api/documents/extract", () => {
  afterEach(() => {
    state.session = null;
    mockExtractDocumentText.mockReset();
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("returns 401 for an unauthenticated request", async () => {
    const response = await POST(jsonRequest({ path: validPath, mimeType: "application/pdf" }));
    expect(response.status).toBe(401);
  });

  it("returns 403 when the path does not belong to the caller's organization", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" } };
    const response = await POST(jsonRequest({ path: "organizations/other-org/documents/doc-1/versions/v1/report.pdf", mimeType: "application/pdf" }));
    expect(response.status).toBe(403);
  });

  it("downloads the object from storage and passes its bytes + mimeType to extractDocumentText", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");

    const fileBytes = "downloaded-file-bytes";
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      expect(url).toBe(`https://example.supabase.co/storage/v1/object/axxess-documents/${validPath}`);
      expect(init?.method).toBe("GET");
      expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer user-token");
      return new Response(fileBytes, { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);
    mockExtractDocumentText.mockResolvedValue({ supported: true, text: "Real PDF Content", method: "text-layer", truncated: false });

    const response = await POST(jsonRequest({ path: validPath, mimeType: "application/pdf" }));
    const body = await response.json() as { extraction?: { supported: boolean; method?: string; text: string } };

    expect(response.status).toBe(200);
    expect(body.extraction).toEqual({ supported: true, text: "Real PDF Content", method: "text-layer", truncated: false });
    expect(mockExtractDocumentText).toHaveBeenCalledTimes(1);
    const [bufferArg, mimeTypeArg] = mockExtractDocumentText.mock.calls[0] as [Buffer, string];
    expect(Buffer.isBuffer(bufferArg)).toBe(true);
    expect(bufferArg.toString("utf8")).toBe(fileBytes);
    expect(mimeTypeArg).toBe("application/pdf");
  });

  it("returns an honest supported:false straight through, not a crash, when extraction reports unsupported", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not-a-real-pdf", { status: 200 })));
    mockExtractDocumentText.mockResolvedValue({ supported: false, text: "", truncated: false, reason: "Failed to parse PDF." });

    const response = await POST(jsonRequest({ path: validPath, mimeType: "application/pdf" }));
    const body = await response.json() as { extraction?: { supported: boolean } };

    expect(response.status).toBe(200);
    expect(body.extraction?.supported).toBe(false);
  });

  it("catches an extraction failure (thrown, not returned) and reports it honestly instead of crashing the route", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("bytes", { status: 200 })));
    mockExtractDocumentText.mockRejectedValue(new Error("native module exploded"));

    const response = await POST(jsonRequest({ path: validPath, mimeType: "application/pdf" }));
    const body = await response.json() as { extraction?: { supported: boolean; reason?: string } };

    expect(response.status).toBe(200);
    expect(body.extraction?.supported).toBe(false);
    expect(body.extraction?.reason).toContain("native module exploded");
  });

  it("surfaces a real 502 error when Supabase Storage can't return the object", async () => {
    state.session = { user: { id: "user-1", organizationId: orgId, role: "Manager" }, accessToken: "user-token" };
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon-key");
    vi.stubGlobal("fetch", vi.fn(async () => new Response("not found", { status: 404 })));

    const response = await POST(jsonRequest({ path: validPath, mimeType: "application/pdf" }));
    const body = await response.json() as { error?: string };

    expect(response.status).toBe(502);
    expect(body.error).toContain("404");
    expect(mockExtractDocumentText).not.toHaveBeenCalled();
  });
});
