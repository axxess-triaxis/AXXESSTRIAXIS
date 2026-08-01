// Real document text extraction for RAG indexing. Nothing here fabricates text: unsupported file
// types and failed extractions return `supported: false` with a human-readable reason so callers
// can be honest with the user instead of silently indexing an empty or metadata-only document.
import { PDFParse } from "pdf-parse";
import mammoth from "mammoth";
import { createWorker } from "tesseract.js";

export type DocumentExtractionMethod = "text-layer" | "ocr" | "docx" | "plain";

export type DocumentExtractionResult = {
  supported: boolean;
  text: string;
  method?: DocumentExtractionMethod;
  truncated: boolean;
  pagesProcessed?: number;
  totalPages?: number;
  reason?: string;
};

const MAX_TEXT_LAYER_PAGES = 200;
const MAX_TEXT_LAYER_CHARS = 250_000;
const MAX_OCR_PAGES = 15;
// Below this many non-whitespace characters, a PDF's text layer is treated as absent (scanned/
// image-only page) rather than "real but short" -- triggers the OCR fallback.
const TEXT_LAYER_EMPTY_THRESHOLD = 20;

const PLAIN_TEXT_MIME_TYPES = new Set(["text/plain", "text/markdown"]);
const DOCX_MIME_TYPE = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractDocumentText(buffer: Buffer, mimeType: string): Promise<DocumentExtractionResult> {
  const normalizedMime = (mimeType || "").toLowerCase().split(";")[0].trim();

  if (normalizedMime === "application/pdf") {
    return extractPdf(buffer);
  }
  if (normalizedMime === DOCX_MIME_TYPE) {
    return extractDocx(buffer);
  }
  if (PLAIN_TEXT_MIME_TYPES.has(normalizedMime)) {
    return extractPlainText(buffer);
  }
  return {
    supported: false,
    text: "",
    truncated: false,
    reason: `Text extraction is not supported for file type "${mimeType || "unknown"}".`,
  };
}

function capText(text: string, maxChars: number): { text: string; truncated: boolean } {
  if (text.length <= maxChars) return { text, truncated: false };
  return { text: text.slice(0, maxChars), truncated: true };
}

async function extractPdf(buffer: Buffer): Promise<DocumentExtractionResult> {
  const parser = new PDFParse({ data: buffer });
  try {
    const info = await parser.getInfo();
    const totalPages = info.total;
    const pagesToParse = Math.min(totalPages, MAX_TEXT_LAYER_PAGES);
    const textResult = await parser.getText({ first: pagesToParse });
    const rawText = textResult.text.trim();

    if (rawText.length >= TEXT_LAYER_EMPTY_THRESHOLD) {
      const { text, truncated } = capText(rawText, MAX_TEXT_LAYER_CHARS);
      return {
        supported: true,
        text,
        method: "text-layer",
        truncated: truncated || pagesToParse < totalPages,
        pagesProcessed: pagesToParse,
        totalPages,
      };
    }

    return await extractPdfViaOcr(parser, totalPages);
  } catch (error) {
    return {
      supported: false,
      text: "",
      truncated: false,
      reason: error instanceof Error ? error.message : "Failed to parse PDF.",
    };
  } finally {
    await parser.destroy().catch(() => undefined);
  }
}

async function extractPdfViaOcr(parser: PDFParse, totalPages: number): Promise<DocumentExtractionResult> {
  const pagesToProcess = Math.min(totalPages, MAX_OCR_PAGES);
  const screenshots = await parser.getScreenshot({ first: pagesToProcess, scale: 2 });

  const worker = await createWorker("eng");
  try {
    const pageTexts: string[] = [];
    for (const page of screenshots.pages) {
      if (!page.data || page.data.length === 0) continue;
      const { data } = await worker.recognize(Buffer.from(page.data));
      const pageText = data.text.trim();
      if (pageText) pageTexts.push(pageText);
    }

    const rawText = pageTexts.join("\n\n").trim();
    if (!rawText) {
      return {
        supported: false,
        text: "",
        truncated: false,
        pagesProcessed: pagesToProcess,
        totalPages,
        reason: "OCR ran but produced no readable text -- the PDF may be blank or too low-quality to read.",
      };
    }

    const { text, truncated } = capText(rawText, MAX_TEXT_LAYER_CHARS);
    return {
      supported: true,
      text,
      method: "ocr",
      truncated: truncated || pagesToProcess < totalPages,
      pagesProcessed: pagesToProcess,
      totalPages,
    };
  } finally {
    await worker.terminate();
  }
}

async function extractDocx(buffer: Buffer): Promise<DocumentExtractionResult> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value.trim();
    if (!rawText) {
      return {
        supported: false,
        text: "",
        truncated: false,
        reason: "This document contained no extractable text.",
      };
    }
    const { text, truncated } = capText(rawText, MAX_TEXT_LAYER_CHARS);
    return { supported: true, text, method: "docx", truncated };
  } catch (error) {
    return {
      supported: false,
      text: "",
      truncated: false,
      reason: error instanceof Error ? error.message : "Failed to parse DOCX file.",
    };
  }
}

function extractPlainText(buffer: Buffer): DocumentExtractionResult {
  const rawText = buffer.toString("utf8").trim();
  if (!rawText) {
    return { supported: false, text: "", truncated: false, reason: "This file contained no text." };
  }
  const { text, truncated } = capText(rawText, MAX_TEXT_LAYER_CHARS);
  return { supported: true, text, method: "plain", truncated };
}
