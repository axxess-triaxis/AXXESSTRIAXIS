import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildDocumentStoragePath,
  documentPathBelongsToOrganization,
  documentStorageRepository,
  inferDocumentKind,
  MAX_DOCUMENT_UPLOAD_BYTES,
  sanitizeStorageFileName,
  validateDocumentUpload,
} from "./documentStorage";

describe("document storage utilities", () => {
  it("builds tenant-scoped Supabase Storage paths", () => {
    const path = buildDocumentStoragePath("org-1", "doc-1", "version-1", "Pilot Plan Final.pdf");

    expect(path).toBe("organizations/org-1/documents/doc-1/versions/version-1/Pilot-Plan-Final.pdf");
    expect(documentPathBelongsToOrganization(path, "org-1")).toBe(true);
    expect(documentPathBelongsToOrganization(path, "org-2")).toBe(false);
  });

  it("sanitizes unsafe filenames", () => {
    expect(sanitizeStorageFileName("board / risk: register?.xlsx")).toBe("board-risk-register-.xlsx");
  });

  it("infers supported document types", () => {
    expect(inferDocumentKind("briefing.pdf", "application/pdf")).toBe("pdf");
    expect(inferDocumentKind("plan.md", "text/markdown")).toBe("markdown");
    expect(inferDocumentKind("photo.png", "image/png")).toBe("image");
    expect(inferDocumentKind("deck.pptx")).toBe("pptx");
  });

  it("rejects unsupported or oversized uploads", () => {
    expect(validateDocumentUpload({
      fileName: "archive.exe",
      mimeType: "application/x-msdownload",
      sizeBytes: 100,
    })).toContain("not supported");

    expect(validateDocumentUpload({
      fileName: "large.pdf",
      mimeType: "application/pdf",
      sizeBytes: MAX_DOCUMENT_UPLOAD_BYTES + 1,
    })).toContain("50MB");
  });
});

describe("uploadDocumentFile (chunked)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("splits a file larger than the chunk size into multiple chunk requests, then finalizes", async () => {
    // Larger than the 3.5MB per-chunk cap, so this must produce 2 chunk POSTs, not 1.
    const bytes = new Uint8Array(4 * 1024 * 1024);
    const file = new File([bytes], "large.pdf", { type: "application/pdf" });

    const chunkCalls: { url: string; bodyByteLength: number }[] = [];
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url.startsWith("/api/documents/upload?")) {
        const body = init?.body as Blob;
        chunkCalls.push({ url, bodyByteLength: body.size });
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      if (url === "/api/documents/upload/complete") {
        return new Response(JSON.stringify({ path: "organizations/org-1/documents/doc-1/versions/v1/large.pdf" }), { status: 200 });
      }
      throw new Error(`Unexpected fetch: ${url}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await documentStorageRepository.uploadDocumentFile({
      path: "organizations/org-1/documents/doc-1/versions/v1/large.pdf",
      file,
    });

    expect(chunkCalls).toHaveLength(2);
    expect(chunkCalls[0].bodyByteLength + chunkCalls[1].bodyByteLength).toBe(bytes.length);
    expect(new URL(chunkCalls[0].url, "http://localhost").searchParams.get("totalChunks")).toBe("2");
    expect(result.path).toBe("organizations/org-1/documents/doc-1/versions/v1/large.pdf");
  });

  it("uploads a small file in exactly one chunk", async () => {
    const file = new File(["small content"], "small.txt", { type: "text/plain" });
    let chunkCount = 0;

    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.startsWith("/api/documents/upload?")) {
        chunkCount += 1;
        return new Response(JSON.stringify({ ok: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ path: "organizations/org-1/documents/doc-1/versions/v1/small.txt" }), { status: 200 });
    }));

    await documentStorageRepository.uploadDocumentFile({ path: "organizations/org-1/documents/doc-1/versions/v1/small.txt", file });
    expect(chunkCount).toBe(1);
  });

  it("throws with the server's real error when a chunk upload fails, and never calls complete", async () => {
    const file = new File(["small content"], "small.txt", { type: "text/plain" });
    const completeCalls: string[] = [];

    vi.stubGlobal("fetch", vi.fn(async (url: string) => {
      if (url.startsWith("/api/documents/upload?")) {
        return new Response(JSON.stringify({ error: "Storage rejected the chunk." }), { status: 502 });
      }
      completeCalls.push(url);
      return new Response(JSON.stringify({ path: "x" }), { status: 200 });
    }));

    await expect(documentStorageRepository.uploadDocumentFile({ path: "organizations/org-1/documents/doc-1/versions/v1/small.txt", file }))
      .rejects.toThrow("Storage rejected the chunk.");
    expect(completeCalls).toHaveLength(0);
  });
});
