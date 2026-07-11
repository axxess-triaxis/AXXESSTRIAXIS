import type { Document } from "../../../domain";
import { classifyDocument, suggestTags } from "../../nlp/localNlp";

export type RagIngestionStage = "uploaded" | "classified" | "chunked" | "indexed" | "ready";

export type RagIngestionRecord = {
  documentId: string;
  organizationId: string;
  title: string;
  stage: RagIngestionStage;
  classification: string;
  chunkCount: number;
  indexId: string;
  tags: string[];
  humanReviewRequired: boolean;
};

export function chunkInstitutionalText(text: string, maxWords = 140) {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  for (let index = 0; index < words.length; index += maxWords) {
    chunks.push(words.slice(index, index + maxWords).join(" "));
  }
  return chunks.length ? chunks : [text || "Metadata-only document awaiting extracted text."];
}

export function buildRagIngestionRecord(document: Document, extractedText?: string): RagIngestionRecord {
  const source = [document.title, document.description, document.categoryName, extractedText].filter(Boolean).join(". ");
  const classification = classifyDocument(source);
  const chunks = chunkInstitutionalText(source);
  const restricted = document.classification === "restricted" || document.visibility === "private";
  return {
    documentId: document.id,
    organizationId: document.organizationId,
    title: document.title ?? document.name,
    stage: "ready",
    classification,
    chunkCount: chunks.length,
    indexId: `rag:${document.organizationId}:${document.id}`,
    tags: suggestTags(source, 6),
    humanReviewRequired: restricted,
  };
}

