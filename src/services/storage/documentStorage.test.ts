import { describe, expect, it } from "vitest";
import {
  buildDocumentStoragePath,
  documentPathBelongsToOrganization,
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
