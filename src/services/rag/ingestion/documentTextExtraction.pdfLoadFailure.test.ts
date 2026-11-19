import { describe, expect, it, vi } from "vitest";

// Staging 2026-11-19: on Vercel, pdf-parse's pdfjs-dist failed to load ("DOMMatrix is not defined",
// "Cannot find module '@napi-rs/canvas'"). Because pdf-parse was imported at the top of the
// extraction module, that load failure turned every POST /api/documents/extract into a 500, even
// for markdown and plain text. This simulates the same load failure.
vi.mock("pdf-parse", () => {
  throw new ReferenceError("DOMMatrix is not defined");
});

describe("extractDocumentText when the PDF library cannot load", () => {
  it("still extracts markdown and plain text", async () => {
    const { extractDocumentText } = await import("./documentTextExtraction");

    const markdown = await extractDocumentText(Buffer.from("# Risk register\n\nQuarterly review."), "text/markdown");
    expect(markdown).toMatchObject({ supported: true, method: "plain" });
    expect(markdown.text).toContain("Quarterly review.");

    const plain = await extractDocumentText(Buffer.from("Plain notes."), "text/plain");
    expect(plain).toMatchObject({ supported: true, method: "plain", text: "Plain notes." });
  });

  it("reports an honest reason for a PDF instead of throwing", async () => {
    const { extractDocumentText } = await import("./documentTextExtraction");

    const result = await extractDocumentText(Buffer.from("%PDF-1.7"), "application/pdf");
    expect(result.supported).toBe(false);
    expect(result.text).toBe("");
    expect(result.reason).toMatch(/PDF text extraction is unavailable/);
  });
});
