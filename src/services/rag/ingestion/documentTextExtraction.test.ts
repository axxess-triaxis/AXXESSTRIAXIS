import { describe, expect, it, vi } from "vitest";
import JSZip from "jszip";
import { extractDocumentText } from "./documentTextExtraction";

// Mocked so this suite never depends on network access to fetch Tesseract language data --
// the OCR *decision* logic (fall back when the text layer is empty, honor the page cap, report
// honestly when nothing readable comes back) is what's under test here, not Tesseract's own OCR
// accuracy. PDF rendering itself (pdf-parse -> @napi-rs/canvas) still runs for real: only text
// recognition is stubbed.
vi.mock("tesseract.js", () => ({
  createWorker: vi.fn(async () => ({
    recognize: vi.fn(async () => ({ data: { text: mockOcrText } })),
    terminate: vi.fn(async () => undefined),
  })),
}));

let mockOcrText = "";

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

function buildTextLayerPdf(text: string) {
  return buildMinimalPdf(`BT /F1 24 Tf 20 100 Td (${text}) Tj ET`);
}

function buildBlankPdf() {
  // A structurally valid page with an empty content stream -- no text operators at all, so the
  // real text layer is genuinely empty and the OCR fallback should engage.
  return buildMinimalPdf("");
}

async function buildMinimalDocx(text: string): Promise<Buffer> {
  const zip = new JSZip();
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
      '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
      '<Default Extension="xml" ContentType="application/xml"/>' +
      '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
      "</Types>",
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
      '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>' +
      "</Relationships>",
  );
  zip.file(
    "word/document.xml",
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
      '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">' +
      `<w:body><w:p><w:r><w:t>${text}</w:t></w:r></w:p></w:body>` +
      "</w:document>",
  );
  return zip.generateAsync({ type: "nodebuffer" });
}

describe("extractDocumentText", () => {
  it("returns supported:false with an honest reason for an unsupported file type", async () => {
    const result = await extractDocumentText(Buffer.from("binary"), "image/png");
    expect(result.supported).toBe(false);
    expect(result.text).toBe("");
    expect(result.reason).toContain("not supported");
  });

  it("extracts real text from a PDF's text layer", async () => {
    const pdf = buildTextLayerPdf("Hello Extraction");
    const result = await extractDocumentText(pdf, "application/pdf");
    expect(result.supported).toBe(true);
    expect(result.method).toBe("text-layer");
    expect(result.text).toContain("Hello Extraction");
    expect(result.truncated).toBe(false);
  });

  it("extracts real text from a DOCX file via mammoth", async () => {
    const docx = await buildMinimalDocx("Hello from a real docx fixture");
    const result = await extractDocumentText(docx, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    expect(result.supported).toBe(true);
    expect(result.method).toBe("docx");
    expect(result.text).toContain("Hello from a real docx fixture");
  });

  it("decodes plain text files directly, no library needed", async () => {
    const result = await extractDocumentText(Buffer.from("Plain markdown body", "utf8"), "text/markdown");
    expect(result.supported).toBe(true);
    expect(result.method).toBe("plain");
    expect(result.text).toBe("Plain markdown body");
  });

  it("caps oversized extracted text and discloses truncation instead of silently cutting it", async () => {
    const longText = "word ".repeat(60_000); // well past the 250k character cap
    const result = await extractDocumentText(Buffer.from(longText, "utf8"), "text/plain");
    expect(result.supported).toBe(true);
    expect(result.truncated).toBe(true);
    expect(result.text.length).toBe(250_000);
  });

  it("falls back to OCR when the PDF's text layer is empty, and reports success honestly", async () => {
    mockOcrText = "Recognized via mocked OCR";
    const pdf = buildBlankPdf();
    const result = await extractDocumentText(pdf, "application/pdf");
    expect(result.supported).toBe(true);
    expect(result.method).toBe("ocr");
    expect(result.text).toContain("Recognized via mocked OCR");
  });

  it("reports supported:false when OCR runs but produces no readable text", async () => {
    mockOcrText = "";
    const pdf = buildBlankPdf();
    const result = await extractDocumentText(pdf, "application/pdf");
    expect(result.supported).toBe(false);
    expect(result.method).toBeUndefined();
    expect(result.reason).toContain("no readable text");
  });
});
